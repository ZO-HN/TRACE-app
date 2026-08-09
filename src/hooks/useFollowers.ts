// The reverse of useFollows — people who follow *this* user. Degrades to
// an empty list until the follows table exists — see
// docs/migrations-drafts/004_leaderboards.sql.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TABLE_MISSING_CODE = '42P01';

export interface UseFollowers {
  followerIds: string[];
  isLoading: boolean;
  isAvailable: boolean;
}

export function useFollowers(userId: string): UseFollowers {
  const [followerIds, setFollowerIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('followee_id', userId);

    if (error) {
      setIsAvailable(error.code !== TABLE_MISSING_CODE);
      setFollowerIds([]);
    } else {
      setIsAvailable(true);
      setFollowerIds(((data as { follower_id: string }[]) ?? []).map((r) => r.follower_id));
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { followerIds, isLoading, isAvailable };
}
