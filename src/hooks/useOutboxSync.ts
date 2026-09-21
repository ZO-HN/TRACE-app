import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { flushOutboxLive, resetRetries, retryAt } from '../lib/outbox/sync';
import { forUser } from '../lib/outbox/ownership';

export function useOutboxSync(userId: string | null) {
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const retryRef = useRef<() => void>(() => {});
  const items = useOutboxStore((s) => s.items);
  const own = userId ? forUser(items, userId) : [];

  useEffect(() => {
    let cancelled = false;
    let online = false;
    let running = false;
    let requested = false;
    let foreground = AppState.currentState !== 'background';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const hydrate = useOutboxStore.getState().hydrate;
    const schedule = () => {
      clearTimeout(timer);
      if (cancelled || !online || !foreground || !userId) return;
      const queue = forUser(useOutboxStore.getState().items, userId);
      const due = queue.filter((item) => {
        if (!('session_id' in item.payload)) return true;
        const sessionId = item.payload.session_id;
        return queue.some((parent) => parent.id === sessionId && parent.status === 'synced');
      }).map(retryAt);
      const next = Math.min(...due);
      if (Number.isFinite(next)) timer = setTimeout(() => void run(), Math.max(0, next - Date.now()));
    };
    const run = async () => {
      if (cancelled || !online || !foreground || !userId) return;
      if (running) { requested = true; return; }
      running = true;
      setIsSyncing(true);
      let succeeded = false;
      try {
        const result = await flushOutboxLive(userId);
        if (!cancelled) { await hydrate(); setError(null); succeeded = !result.paused; }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not sync saved logs. Tap Retry sync.');
      } finally {
        running = false;
        if (!cancelled) {
          setIsSyncing(false);
          if (requested) { requested = false; void run(); }
          else if (succeeded) schedule();
        }
      }
    };
    retryRef.current = () => {
      if (!userId) return;
      void resetRetries(userId).then(hydrate).then(run).catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not retry saved logs.');
      });
    };
    void hydrate().catch((cause) => { if (!cancelled) setError(String(cause)); });
    // Hydration/status changes do not retrigger delivery. New payload revisions do.
    let signature = '';
    const stopStore = useOutboxStore.subscribe((state) => {
      const next = userId ? forUser(state.items, userId).map((i) => `${i.id}:${i.revision ?? 0}`).join('|') : '';
      if (next !== signature) { signature = next; void run(); }
    });
    const stopNetwork = NetInfo.addEventListener((state) => {
      online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (online) void run(); else clearTimeout(timer);
    });
    const app = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      if (foreground) void run(); else clearTimeout(timer);
    });
    return () => { cancelled = true; retryRef.current = () => {}; clearTimeout(timer); stopStore(); stopNetwork(); app.remove(); };
  }, [userId]);
  return {
    pendingCount: own.filter((i) => i.status !== 'synced').length,
    failedCount: own.filter((i) => i.status === 'failed').length,
    error, isSyncing, retry: () => retryRef.current(),
  };
}
