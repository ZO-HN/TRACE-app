import { useCallback, useEffect, useState } from 'react';
import { getCalibrationMap, recordFeedback } from '../lib/predict/calibration';

export interface UseSetCalibration {
  multiplierFor: (exerciseId: string) => number;
  feedback: (exerciseId: string, direction: 'up' | 'down') => void;
}

export function useSetCalibration(): UseSetCalibration {
  const [map, setMap] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    void getCalibrationMap().then((m) => {
      if (!cancelled) setMap(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const multiplierFor = useCallback((exerciseId: string) => map[exerciseId] ?? 1, [map]);

  const feedback = useCallback((exerciseId: string, direction: 'up' | 'down') => {
    void recordFeedback(exerciseId, direction).then((next) => {
      setMap((prev) => ({ ...prev, [exerciseId]: next }));
    });
  }, []);

  return { multiplierFor, feedback };
}
