import { useCallback, useEffect, useState } from 'react';
import { getWeightUnitPreference, setWeightUnitPreference, subscribeWeightUnit, type WeightUnit } from '../lib/units/preference';

export interface UseUnitPreference {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => Promise<void>;
  isLoaded: boolean;
}

export function useUnitPreference(): UseUnitPreference {
  const [unit, setUnitState] = useState<WeightUnit>('lbs');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let changed = false;
    const unsubscribe = subscribeWeightUnit((next) => {
      changed = true;
      setUnitState(next);
      setIsLoaded(true);
    });
    void getWeightUnitPreference().then((u) => {
      if (!cancelled && !changed) {
        setUnitState(u);
        setIsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const setUnit = useCallback(async (next: WeightUnit) => {
    await setWeightUnitPreference(next);
  }, []);

  return { unit, setUnit, isLoaded };
}
