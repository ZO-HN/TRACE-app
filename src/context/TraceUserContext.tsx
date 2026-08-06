import { createContext, useContext, type ReactNode } from 'react';
import type { UseTraceUserReturn } from '../hooks/useTraceUser';

const TraceUserContext = createContext<UseTraceUserReturn | null>(null);

export function TraceUserProvider({
  value,
  children,
}: {
  value: UseTraceUserReturn;
  children: ReactNode;
}) {
  return <TraceUserContext.Provider value={value}>{children}</TraceUserContext.Provider>;
}

/** Must be used within (tabs)/_layout.tsx's TraceUserProvider — every screen
 * past the auth gate shares one profile fetch instead of re-querying it. */
export function useTraceUserContext(): UseTraceUserReturn {
  const ctx = useContext(TraceUserContext);
  if (!ctx) {
    throw new Error('useTraceUserContext must be used within TraceUserProvider');
  }
  return ctx;
}
