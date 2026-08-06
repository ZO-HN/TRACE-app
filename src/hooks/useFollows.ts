// One-way "follow" graph backing the leaderboard's scope. Degrades to an
// empty list until the follows table exists — see
// docs/migrations-drafts/004_leaderboards.sql.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TABLE_MISSING_CODE = '42P01';

export interface UseFollows {
  followeeIds: string[];
  isLoading: boolean;
  isAvailable: boolean;
  follow: (followeeId: string) => Promise<{ ok: boolean; error?: string }>;
  unfollow: (followeeId: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useFollows(userId: string): UseFollows {
  const [followeeIds, setFolloweeIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('follows')
      .select('followee_id')
      .eq('follower_id', userId);

    if (error) {
      setIsAvailable(error.code !== TABLE_MISSING_CODE);
      setFolloweeIds([]);
    } else {
      setIsAvailable(true);
      setFolloweeIds(((data as { followee_id: string }[]) ?? []).map((r) => r.followee_id));
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const follow = useCallback(
    async (followeeId: string) => {
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: userId, followee_id: followeeId });
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  const unfollow = useCallback(
    async (followeeId: string) => {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('followee_id', followeeId);
      if (error) return { ok: false, error: error.message };
      await refresh();
      return { ok: true };
    },
    [userId, refresh],
  );

  return { followeeIds, isLoading, isAvailable, follow, unfollow };
}
