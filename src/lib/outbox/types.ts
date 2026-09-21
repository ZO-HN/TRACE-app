// Outbox types for offline session logging.
// See docs/specs/offline-sync-outbox.md.

import type { Database } from '../database.types';
import type { NutritionLogInsert } from '../nutrition/types';

export type { NutritionLogInsert };

/**
 * Insert payload for public.set_logs.
 *
 * IMPORTANT: `estimated_1rm` is a GENERATED ALWAYS column in the database
 * (weight_kg * (1 + reps / 30)) and must NEVER appear in a write payload.
 * It is intentionally absent from this type.
 */
export type SetLogInsert = Pick<Database['public']['Tables']['set_logs']['Insert'],
  'session_id' | 'exercise_id' | 'set_number' | 'weight_kg' | 'reps' | 'rpe' |
  'is_completed' | 'form_video_s3_key' | 'is_warmup' | 'is_failure' | 'duration_seconds'
> & { id: string; set_type?: 'reps' | 'duration' };

/** Session snapshots are delivered through the owner-scoped sync RPC. */
export type WorkoutSessionInsert = Pick<Database['public']['Tables']['workout_sessions']['Insert'],
  'user_id' | 'template_id' | 'session_name' | 'completed_at' | 'duration_seconds' |
  'rpe_average' | 'compliance_score'
> & { id: string };

export type OutboxStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export type OutboxTable = 'workout_sessions' | 'set_logs' | 'nutrition_logs';

export interface OutboxItem {
  /** Explicit owner for new entries; legacy sets are resolved via their parent. */
  owner_id?: string;
  revision?: number;
  id: string; // mirrors payload.id — the idempotency key
  /** Target table. Items persisted before this field existed are set_logs. */
  table?: OutboxTable;
  payload: SetLogInsert | WorkoutSessionInsert | NutritionLogInsert;
  status: OutboxStatus;
  attempts: number;
  updated_at: string; // ISO timestamp
  last_error?: string;
}
