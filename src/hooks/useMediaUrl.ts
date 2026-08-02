// Resolve a private R2 object key to a short-lived viewable URL via the
// r2-get-url edge function (authorization enforced server-side by set_logs RLS).

import { useEffect, useState } from 'react';
import { getMediaUrl } from '../lib/storage/getUrl';

export interface UseMediaUrl {
  url: string | null;
  loading: boolean;
  error: string | null;
}

export function useMediaUrl(key: string | null): UseMediaUrl {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMediaUrl(key)
      .then((signed) => {
        if (!cancelled) setUrl(signed.url);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load media');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { url, loading, error };
}
