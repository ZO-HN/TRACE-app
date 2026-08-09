// Every other trainee under the same coach (single-coach platform — see
// AGENTS.md) — the name-resolution source for both the Social tab's
// "Connected" and "Discover" lists. Calls a SECURITY DEFINER RPC rather
// than selecting profiles directly, since RLS otherwise only lets a user
// read their own profile row. Degrades to an empty list until the RPC
// exists — see docs/migrations-drafts/007_social_discovery.sql.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const UNDEFINED_FUNCTION = '42883';

export interface RosterMember {
  id: string;
  displayName: string;
}

export interface UseCoachRoster {
  roster: RosterMember[];
  isLoading: boolean;
  isAvailable: boolean;
}

export function useCoachRoster(): UseCoachRoster {
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase.rpc('list_coach_roster');
      if (!isMounted) return;
      if (error) {
        setIsAvailable(error.code !== UNDEFINED_FUNCTION);
        setRoster([]);
      } else {
        setIsAvailable(true);
        setRoster(
          ((data as { id: string; display_name: string }[]) ?? []).map((r) => ({
            id: r.id,
            displayName: r.display_name,
          })),
        );
      }
      setIsLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { roster, isLoading, isAvailable };
}
