import { MotiView } from 'moti';

/** Pulsing placeholder block for loading states, instead of a blank screen. */
export default function Skeleton({ className = 'h-4 w-full' }: { className?: string }) {
  return (
    <MotiView
      className={`bg-border rounded-md ${className}`}
      from={{ opacity: 0.3 }}
      animate={{ opacity: 0.7 }}
      transition={{ type: 'timing', duration: 700, loop: true }}
    />
  );
}
