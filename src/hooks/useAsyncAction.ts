import { useRef, useState } from 'react';

/** Keep repeated taps from starting duplicate writes, and always release the UI. */
export function useAsyncAction() {
  const active = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<void>) => {
    if (active.current) return;
    active.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save. Please try again.');
    } finally {
      active.current = false;
      setPending(false);
    }
  };
  return { pending, error, run };
}
