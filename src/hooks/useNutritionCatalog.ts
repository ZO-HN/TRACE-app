import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Shared read lifecycle for nutrition catalogs; never present a failed read as empty. */
export function useNutritionCatalog<T>(table: 'custom_foods' | 'favorite_foods' | 'supplements' | 'meal_templates', columns: string, userId?: string) {
  const [state, setState] = useState<{ owner?: string; rows: T[]; loading: boolean; error: string | null }>({ owner: userId, rows: [], loading: true, error: null });
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    setState((old) => ({ owner: userId, rows: old.owner === userId ? old.rows : [], loading: true, error: null }));
    try {
      let query = supabase.from(table).select(columns);
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query.order(table === 'supplements' ? 'name' : 'created_at', { ascending: table === 'supplements' });
      if (version !== request.current) return;
      if (error) throw new Error(error.message);
      setState({ owner: userId, rows: (data ?? []) as unknown as T[], loading: false, error: null });
    } catch (cause) {
      if (version === request.current) setState((old) => ({ ...old, loading: false, error: cause instanceof Error ? cause.message : 'Could not load foods.' }));
    }
  }, [table, columns, userId]);
  useEffect(() => {
    void refresh();
    return () => { request.current++; };
  }, [refresh]);
  return { rows: state.owner === userId ? state.rows : [], isLoading: state.owner !== userId || state.loading, error: state.owner === userId ? state.error : null, refresh };
}
