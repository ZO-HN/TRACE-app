import { useCallback, useEffect, useState } from 'react';
import { getWeightUnitPreference, setWeightUnitPreference, type WeightUnit } from '../lib/units/preference';

export interface UseUnitPreference {
  unit: WeightUnit;
  setUnit: (unit: WeightUnit) => void;
  isLoaded: boolean;
}

export function useUnitPreference(): UseUnitPreference {
  const [unit, setUnitState] = useState<WeightUnit>('lbs');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getWeightUnitPreference().then((u) => {
      if (!cancelled) {
        setUnitState(u);
        setIsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setUnit = useCallback((next: WeightUnit) => {
    setUnitState(next);
    void setWeightUnitPreference(next);
  }, []);

  return { unit, setUnit, isLoaded };
}
