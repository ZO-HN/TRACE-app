// Concrete wiring of the upload path to the real backend:
//  - presign via the `r2-presign` Supabase Edge Function (JWT auto-attached)
//  - PUT the file straight to R2 at the returned presigned URL, streamed
//    from its local uri via expo-file-system (never loaded into JS memory —
//    form-check clips can be up to 50MB, see storage/policy.ts).

import * as FileSystem from 'expo-file-system';
import { supabase } from '../supabase';
import type { PresignRequest, PresignResponse } from './types';
import type { RNFile } from './uploadMedia';

export async function presignViaEdge(
  req: PresignRequest,
): Promise<PresignResponse> {
  const { data, error } = await supabase.functions.invoke<PresignResponse>(
    'r2-presign',
    { body: req },
  );
  if (error) throw error;
  if (!data) throw new Error('Presign function returned no data');
  return data;
}

export async function putToR2(
  url: string,
  file: RNFile,
): Promise<{ ok: boolean; status: number }> {
  const result = await FileSystem.uploadAsync(url, file.uri, {
    httpMethod: 'PUT',
    headers: { 'Content-Type': file.type },
  });
  return { ok: result.status >= 200 && result.status < 300, status: result.status };
}
