import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apk = path.join(root, 'artifacts/TRACE-android-arm64.apk');
if (!existsSync(apk)) throw new Error('Build the APK first with npm run android:apk.');
const port = Number(process.env.TRACE_DOWNLOAD_PORT ?? 8090);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid download port.');
const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405).end(); return; }
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/TRACE-android-arm64.apk') {
      const file = await stat(apk);
      response.writeHead(200, { 'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': file.size, 'Content-Disposition': 'attachment; filename="TRACE-android-arm64.apk"' });
      if (request.method === 'HEAD') response.end();
      else createReadStream(apk).on('error', () => response.destroy()).pipe(response);
      return;
    }
    if (pathname === '/TRACE-android-arm64.apk.sha256') {
      const checksum = await readFile(`${apk}.sha256`);
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(request.method === 'HEAD' ? undefined : checksum);
      return;
    }
    if (pathname !== '/') { response.writeHead(404).end(); return; }
    const page = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TRACE Android Download</title><style>body{font:16px system-ui;margin:0;background:#101012;color:#eee}main{max-width:600px;margin:40px auto;padding:24px}h1{font-size:28px}a{color:#4ade80}p{line-height:1.6}button,a.download{display:inline-block;background:#4ade80;color:#101012;padding:14px 20px;border-radius:16px;text-decoration:none;font-weight:600}</style><main><h1>TRACE for Android</h1><p>Android 7.0 or newer, ARM64 phone. Local testing build, signed with a development key.</p><p><a class="download" href="/TRACE-android-arm64.apk">Download APK</a></p><p>Open the downloaded file on your Android phone and allow installation from your browser when Android asks. Sign in with your TRACE account and choose a coach.</p><p>This build is not an iPhone app or an app-store release. Remote push notifications and physical-device QA are still pending.</p><p><a href="/TRACE-android-arm64.apk.sha256">SHA-256 checksum</a></p></main></html>`;
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(request.method === 'HEAD' ? undefined : page);
  } catch { if (!response.headersSent) response.writeHead(500); response.end('Download unavailable.'); }
});
server.listen(port, '0.0.0.0', () => {
  console.log(`TRACE download: http://localhost:${port}/`);
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) console.log(`Same-network phone link: http://${entry.address}:${port}/`);
    }
  }
  console.log('Serves only the APK and checksum. Keep this computer on; phone must be on the same network.');
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
