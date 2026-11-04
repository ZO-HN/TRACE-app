// Joins a shared program via its token — see
// docs/migrations-drafts/012_program_sharing.sql's join_program_by_token
// RPC, which copies the program + its days into a fresh, independently
// owned program for the current user.

import { useCallback, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface UseJoinProgram {
  join: (token: string) => Promise<{ ok: boolean; error?: string; programId?: string }>;
  isJoining: boolean;
}

export function useJoinProgram(): UseJoinProgram {
  const [isJoining, setIsJoining] = useState(false);
  const joining = useRef(false);

  const join = useCallback(async (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) return { ok: false, error: 'Enter a share link or code.' };
    if (joining.current) return { ok: false, error: 'A program is already being joined.' };

    joining.current = true;
    setIsJoining(true);
    try {
      const { data, error } = await supabase.rpc('join_program_by_token', { p_token: trimmed });

      if (error) return { ok: false, error: error.message };
      return { ok: true, programId: data as string };
    } catch (cause) {
      return { ok: false, error: cause instanceof Error ? cause.message : 'Could not join this program.' };
    } finally {
      joining.current = false;
      setIsJoining(false);
    }
  }, []);

  return { join, isJoining };
}
