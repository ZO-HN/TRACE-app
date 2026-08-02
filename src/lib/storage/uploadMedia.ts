// Orchestrates a direct-to-R2 upload: validate -> presign -> PUT -> return key.
// Dependency-injected (presign + put) so it is unit-testable without network.
//
// RN has no File/Blob the way the DOM does — a captured asset is a local
// {uri, name, type, size} descriptor instead, and the actual upload streams
// from that uri via expo-file-system rather than loading bytes into JS.

import type { MediaKind, PresignRequest, PresignResponse, UploadResult } from './types';
import { validateUpload } from './policy';

export interface RNFile {
  uri: string;
  name: string;
  type: string;
  size: number;
}

export interface UploadDeps {
  presign: (req: PresignRequest) => Promise<PresignResponse>;
  put: (url: string, file: RNFile) => Promise<{ ok: boolean; status: number }>;
}

export async function uploadMedia(
  file: RNFile,
  kind: MediaKind,
  deps: UploadDeps,
): Promise<UploadResult> {
  const check = validateUpload({
    kind,
    contentType: file.type,
    sizeBytes: file.size,
  });
  if (!check.ok) throw new Error(check.reason);

  const { uploadUrl, key } = await deps.presign({
    kind,
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });

  const res = await deps.put(uploadUrl, file);
  if (!res.ok) {
    throw new Error(`R2 upload failed (HTTP ${res.status})`);
  }

  return { key, contentType: file.type, sizeBytes: file.size };
}
