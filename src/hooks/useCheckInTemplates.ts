// Templates assigned to the trainee by their coach — read-only here (authoring
// lives in the coach dashboard's own useCheckInTemplates.ts). RLS restricts
// SELECT to templates where check_in_templates.coach_id matches the
// trainee's own profiles.coach_id.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { CheckInSchedule, CheckInTemplate } from '../lib/checkins/types';

const DEFAULT_SCHEDULE: CheckInSchedule = {
  frequency: 'Weekly',
  days: ['Mon'],
  notificationTime: '09:00',
  endDate: '',
  active: true,
};

interface TemplateRow {
  id: string;
  name: string;
  description: string | null;
  questions: CheckInTemplate['questions'];
  schedule: CheckInSchedule | null;
  created_at: string;
}

function fromRow(row: TemplateRow): CheckInTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    questions: row.questions ?? [],
    schedule: row.schedule && Object.keys(row.schedule).length > 0 ? row.schedule : DEFAULT_SCHEDULE,
    createdAt: row.created_at,
  };
}

export interface UseCheckInTemplates {
  templates: CheckInTemplate[];
  isLoading: boolean;
  error: string | null;
}

export function useCheckInTemplates(): UseCheckInTemplates {
  const [templates, setTemplates] = useState<CheckInTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('check_in_templates')
      .select('id, name, description, questions, schedule, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) setError(fetchError.message);
    else {
      setError(null);
      setTemplates(((data as TemplateRow[]) ?? []).map(fromRow));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { templates, isLoading, error };
}
