import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface AvailableCoach {
  id: string;
  first_name: string;
  last_name: string;
  coach_code: string | null;
}

export function useCoachSelection() {
  const [coaches, setCoaches] = useState<AvailableCoach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    supabase
      .rpc('list_available_coaches')
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setListError(error.message);
        } else {
          setCoaches((data ?? []) as AvailableCoach[]);
        }
        setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const claimById = useCallback(async (coachId: string) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase.rpc('claim_coach_by_id', { p_coach_id: coachId });
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return false;
    }
    return true;
  }, []);

  const claimByCode = useCallback(async (code: string) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const { error } = await supabase.rpc('claim_coach_by_code', { p_code: code.trim() });
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error.message);
      return false;
    }
    return true;
  }, []);

  return { coaches, isLoading, listError, isSubmitting, submitError, claimById, claimByCode };
}
