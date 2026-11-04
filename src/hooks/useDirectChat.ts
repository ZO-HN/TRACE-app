// Conversation-scoped history and realtime messages share one deduplicated list.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isBetween, mergeMessage, type DirectMessage } from '../lib/chat/types';

export interface UseDirectChat {
  messages: DirectMessage[];
  send: (content: string) => Promise<void>;
  error: string | null;
}

export function useDirectChat(myId: string, peerId: string): UseDirectChat {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const conversation = `${myId}:${peerId}`;
  const activeConversation = useRef(conversation);
  activeConversation.current = conversation;

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setError(null);

    (async () => {
      try {
        const { data, error: loadError } = await supabase
          .from('direct_messages')
          .select('*')
          .or(
            `and(sender_id.eq.${myId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${myId})`,
          )
          .order('created_at', { ascending: false })
          .limit(200);
        if (!cancelled) {
          if (loadError) setError(loadError.message);
          else if (data) setMessages((current) => (data as DirectMessage[]).reduce(mergeMessage, current));
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load messages.');
      }
    })();

    const channel = supabase
      .channel(`dm-${myId}-${peerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as DirectMessage;
          if (!cancelled && isBetween(msg, myId, peerId)) {
            setMessages((prev) => mergeMessage(prev, msg));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [myId, peerId]);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      try {
        const { data, error: sendError } = await supabase
          .from('direct_messages')
          .insert({ sender_id: myId, recipient_id: peerId, content: trimmed })
          .select()
          .single();
        if (sendError) throw new Error(sendError.message);
        if (activeConversation.current === conversation) {
          setError(null);
          if (data) setMessages((prev) => mergeMessage(prev, data as DirectMessage));
        }
      } catch (cause) {
        if (activeConversation.current === conversation) setError(cause instanceof Error ? cause.message : 'Could not send message.');
        throw cause;
      }
    },
    [myId, peerId, conversation],
  );

  return { messages: messages.filter((message) => isBetween(message, myId, peerId)), send, error };
}
