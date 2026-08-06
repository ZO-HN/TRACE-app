// Maps to the (not-yet-applied) follows table + get_exercise_leaderboard RPC
// — see docs/migrations-drafts/004_leaderboards.sql. Every consumer of
// these types must treat their data as possibly empty until that migration
// lands in the dashboard repo.

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  weightLbs: number;
  reps: number;
  rpe: number | null;
  volume: number;
  sets: number;
  isSelf: boolean;
}

export interface FollowRow {
  followeeId: string;
  displayName: string;
}
