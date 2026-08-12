// Types for the direct-to-R2 media upload path. See docs/adr/0001-media-storage.md.

// 'progress-photo' is a client-side addition for the Tracked-parity
// progress-photos feature (docs/feature-research/tracked-app-parity-gap.md
// Tier B) — per AGENTS.md, MEDIA_POLICY here must stay in sync with the
// r2-presign edge function's server-side copy in the dashboard repo. That
// function does NOT yet have a 'progress-photo' case, so uploads of this
// kind will fail server-side until the dashboard repo adds it — same
// "client contract defined, server side pending" pattern as several other
// cross-repo items in this codebase.
export type MediaKind = 'form-video' | 'meal-photo' | 'coach-image' | 'progress-photo' | 'file';

/** What the client asks the edge function to presign. */
export interface PresignRequest {
  kind: MediaKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

/** What the edge function returns: a short-lived PUT URL and the object key to persist. */
export interface PresignResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

/** Result of a completed upload — the key is what gets stored in the DB. */
export interface UploadResult {
  key: string;
  contentType: string;
  sizeBytes: number;
}
