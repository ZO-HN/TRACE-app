// Maps to the (not-yet-applied) progress_photos table — see
// docs/migrations-drafts/009_tracked_parity_tier_b.sql.

export interface ProgressPhotoInsert {
  id: string;
  user_id: string;
  taken_date: string; // YYYY-MM-DD — may differ from upload date
  photo_s3_key: string;
  note?: string | null;
}

export interface ProgressPhoto {
  id: string;
  taken_date: string;
  photo_s3_key: string;
  note: string | null;
  created_at: string;
}
