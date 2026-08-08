// Maps to the (not-yet-applied) sleep_logs table — see
// docs/migrations-drafts/006_sleep_tracking.sql.

export interface SleepLog {
  id: string;
  sleepDate: string; // YYYY-MM-DD, the wake-up date
  bedtime: string; // ISO timestamp
  wakeTime: string; // ISO timestamp
  quality: 1 | 2 | 3 | 4 | 5;
}
