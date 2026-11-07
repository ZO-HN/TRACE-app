// Types for the direct-to-R2 media upload path. See docs/adr/0001-media-storage.md.

// All kinds require the matching canonical Edge/schema deployment. Progress
// photos stay owner-only; kind support does not grant coach access.
export type MediaKind = 'form-video' | 'meal-photo' | 'coach-image' | 'progress-photo' | 'file';

/** What the client asks the edge function to presign. */
export interface PresignRequest {
  kind: MediaKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
  protocolVersion: 2;
  ownerId: string;
  operationId: string;
}

/** What the edge function returns: a short-lived PUT URL and the object key to persist. */
export interface PresignResponse {
  uploadUrl: string;
  key: string;
  expiresIn: number;
  protocolVersion: 2;
  uploadHeaders: {'Content-Type': string; 'If-None-Match': '*'};
}

/** Result of a completed upload — the key is what gets stored in the DB. */
export interface UploadResult {
  key: string;
  contentType: string;
  sizeBytes: number;
  operationId: string;
  recordedDate: string;
}
