import type { UseTraceUserReturn } from '../hooks/useTraceUser';

export const isDevPreview = typeof __DEV__ !== 'undefined' && __DEV__ &&
  process.env.EXPO_PUBLIC_DEV_PREVIEW === '1';

export const previewUser: UseTraceUserReturn = {
  user: null,
  profile: {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'preview@example.invalid',
    role: 'trainee',
    coach_id: null,
    coach_code: null,
    first_name: 'Preview',
    last_name: 'Tester',
    dob: null,
    experience_level: 'BEGINNER',
    primary_goal: null,
    injury_notes: null,
    wearable_sync_active: false,
    premium_status: false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  isLoading: false,
  error: null,
  isEnrolled: false,
  refetchProfile: async () => {},
};

export const previewFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(JSON.stringify({ message: 'Cloud changes require login. This is a local preview.', code: 'PREVIEW_READ_ONLY' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return fetch(input, init);
};
