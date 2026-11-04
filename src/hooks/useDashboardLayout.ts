import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultDashboardLayout, parseDashboardLayout, type DashboardLayout } from '../lib/dashboard/layout';

export function useDashboardLayout(userId: string) {
  const owner = useRef(userId);
  owner.current = userId;
  const [state, setState] = useState({ owner: userId, layout: { ...defaultDashboardLayout }, loaded: false });
  const [error, setError] = useState<string | null>(null);
  const key = `trace:dashboard-layout:v1:${userId}`;
  useEffect(() => {
    let cancelled = false;
    setError(null);
    void AsyncStorage.getItem(key).then((raw) => {
      if (!cancelled) setState({ owner: userId, layout: parseDashboardLayout(raw), loaded: true });
    }).catch(() => {
      if (!cancelled) {
        setError('Could not load your dashboard settings.');
        setState({ owner: userId, layout: { ...defaultDashboardLayout }, loaded: true });
      }
    });
    return () => { cancelled = true; };
  }, [key, userId]);
  const update = async (layout: DashboardLayout) => {
    if (state.owner !== userId || !state.loaded || owner.current !== userId) throw new Error('Dashboard settings are still loading.');
    await AsyncStorage.setItem(key, JSON.stringify(layout));
    if (owner.current === userId) { setState({ owner: userId, layout, loaded: true }); setError(null); }
  };
  return { layout: state.owner === userId ? state.layout : defaultDashboardLayout,
    loaded: state.owner === userId && state.loaded, error, update };
}
