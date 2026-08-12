// Crude readiness score (0-100) combining sleep quality, sleep duration,
// and recent training volume trend — the "M-effort proxy" option flagged
// in docs/feature-research/competitor-gap-analysis.md's Recovery section,
// not a WHOOP-style HRV-based score (that needs real wearable data, still
// XL/out of scope). Explicitly an estimate, not clinical-grade — surface it
// to users with that framing.
//
// Pure and framework-free.

export interface ReadinessInputs {
  /** Last night's sleep duration in hours, or null if not logged. */
  lastSleepHours: number | null;
  /** 1-5 self-reported sleep quality, or null if not logged. */
  lastSleepQuality: number | null;
  /** This week's total training volume (kg), for trend comparison. */
  thisWeekVolumeKg: number;
  /** Trailing 4-week average weekly volume (kg), excluding this week. */
  avgWeeklyVolumeKg: number;
}

export interface ReadinessResult {
  score: number; // 0-100
  /** True only when there's enough data to produce a meaningful score. */
  hasData: boolean;
}

const NEUTRAL_SCORE = 50;

function sleepDurationScore(hours: number | null): number | null {
  if (hours == null) return null;
  // 8h = 100, tapers off linearly outside a 6-9h "good" band.
  if (hours >= 6 && hours <= 9) return 100 - Math.abs(8 - hours) * 15;
  if (hours < 6) return Math.max(0, 100 - (6 - hours) * 25);
  return Math.max(0, 100 - (hours - 9) * 15);
}

function sleepQualityScore(quality: number | null): number | null {
  if (quality == null) return null;
  return ((quality - 1) / 4) * 100; // 1->0, 5->100
}

/** Training load score: 100 when this week's volume is at/below the
 * trailing average (fresh), tapering down the further above average it
 * runs (a crude proxy for "you've been overreaching lately"). */
function loadScore(thisWeekVolumeKg: number, avgWeeklyVolumeKg: number): number | null {
  if (avgWeeklyVolumeKg <= 0) return null;
  const ratio = thisWeekVolumeKg / avgWeeklyVolumeKg;
  if (ratio <= 1) return 100;
  return Math.max(0, 100 - (ratio - 1) * 100);
}

export function computeReadiness(inputs: ReadinessInputs): ReadinessResult {
  const components = [
    sleepDurationScore(inputs.lastSleepHours),
    sleepQualityScore(inputs.lastSleepQuality),
    loadScore(inputs.thisWeekVolumeKg, inputs.avgWeeklyVolumeKg),
  ].filter((c): c is number => c != null);

  if (components.length === 0) {
    return { score: NEUTRAL_SCORE, hasData: false };
  }

  const score = Math.round(components.reduce((s, c) => s + c, 0) / components.length);
  return { score: Math.min(100, Math.max(0, score)), hasData: true };
}
