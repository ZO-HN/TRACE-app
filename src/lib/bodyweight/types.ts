export interface BodyweightLogInsert {
  id: string;
  user_id: string;
  recorded_date: string; // YYYY-MM-DD
  weight_kg: number;
  note?: string | null;
}

/** Maps to the (not-yet-applied) bodyweight_settings table — see
 * docs/migrations-drafts/001_bodyweight_settings.sql. Until that migration
 * lands in the dashboard repo, useBodyweightSettings falls back to defaults. */
export interface BodyweightSettings {
  movingAverageWindow: 7 | 14;
  weighInReminderEnabled: boolean;
  weighInReminderTime: string | null; // "HH:mm"
}

export const DEFAULT_BODYWEIGHT_SETTINGS: BodyweightSettings = {
  movingAverageWindow: 14,
  weighInReminderEnabled: false,
  weighInReminderTime: null,
};
