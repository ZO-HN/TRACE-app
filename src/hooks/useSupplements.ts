// Reference supplement catalog (Supplements tab) — coach/admin-seeded,
// read-only to clients. Degrades to empty until the supplements table
// exists. See docs/migrations-drafts/003_nutrition_extensions.sql.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Supplement } from '../lib/nutrition/types';

export interface UseSupplements {
  supplements: Supplement[];
  isLoading: boolean;
}

export function useSupplements(): UseSupplements {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('supplements')
        .select('id, name, protein_g, carbs_g, fat_g, calories')
        .order('name', { ascending: true });
      if (!isMounted) return;
      setSupplements(error ? [] : ((data as Supplement[]) ?? []));
      setIsLoading(false);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { supplements, isLoading };
}
