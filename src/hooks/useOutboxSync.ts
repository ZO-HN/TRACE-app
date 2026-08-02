// Wires the outbox to device connectivity: hydrates on mount, and flushes to
// Supabase whenever NetInfo reports the device is back online.

import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { flushOutboxLive } from '../lib/outbox/sync';

export function useOutboxSync(): void {
  const hydrate = useOutboxStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;
    let wasConnected = false;

    const flushThenRefresh = async () => {
      await flushOutboxLive();
      if (!cancelled) await hydrate();
    };

    hydrate();

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = Boolean(state.isConnected && state.isInternetReachable !== false);
      // Flush on the offline -> online transition, and once eagerly if the
      // very first reading already reports connectivity.
      if (isConnected && !wasConnected) void flushThenRefresh();
      wasConnected = isConnected;
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [hydrate]);
}
