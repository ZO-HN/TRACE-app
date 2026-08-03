import type { ReactNode } from 'react';
import { MotiView } from 'moti';

/** Staggered entrance for lists — pass an increasing `delay` per item. */
export default function FadeInView({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 350, delay }}
    >
      {children}
    </MotiView>
  );
}
