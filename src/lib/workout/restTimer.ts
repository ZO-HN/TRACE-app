export function restSecondsRemaining(deadlineMs: number | null, nowMs: number): number {
  if (deadlineMs === null) return 0;
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}

export function extendRestDeadline(deadlineMs: number | null, nowMs: number, seconds: number): number {
  return Math.max(deadlineMs ?? nowMs, nowMs) + seconds * 1000;
}
