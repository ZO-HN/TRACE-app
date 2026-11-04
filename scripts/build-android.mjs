import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const options = new Set(process.argv.slice(2));
for (const option of options) {
  if (!['--reuse-native', '--emulator-test'].includes(option)) throw new Error(`Unknown build option: ${option}`);
}
const emulatorTest = options.has('--emulator-test');
const architecture = emulatorTest ? 'x86_64' : 'arm64-v8a';
for (const file of ['.env', '.env.local']) {
  const location = path.join(root, file);
  if (existsSync(location)) process.loadEnvFile(location);
}
const env = { ...process.env, NODE_ENV: 'production', CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1',
  CMAKE_BUILD_PARALLEL_LEVEL: '2' };
for (const name of Object.keys(env)) {
  if (name.startsWith('EXPO_PUBLIC_DEV_')) delete env[name];
}
if (!env.EXPO_PUBLIC_SUPABASE_URL || !env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Configure the public Supabase URL and anon key before building. Never use a service-role key.');
}
if (process.platform === 'win32') {
  env.JAVA_HOME ??= 'C:\\Program Files\\Android\\Android Studio\\jbr';
  env.ANDROID_HOME ??= path.join(env.LOCALAPPDATA, 'Android', 'Sdk');
}
async function run(command, args, cwd = root, shell = false) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', shell });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} failed (${code})`)));
  });
}

if (!options.has('--reuse-native') || !existsSync(path.join(root, 'android/app/build.gradle'))) {
  await run(process.execPath, ['node_modules/expo/bin/cli', 'prebuild', '--platform', 'android', '--no-install']);
}
// Android's Ninja compiler otherwise defaults to all available CPU cores.
const gradleFile = path.join(root, 'android/app/build.gradle');
const gradle = await readFile(gradleFile, 'utf8');
if (!gradle.includes('CMAKE_JOB_POOL_COMPILE')) {
  const marker = '    defaultConfig {';
  if (!gradle.includes(marker)) throw new Error('Cannot locate Android defaultConfig to limit native compilation.');
  await writeFile(gradleFile, gradle.replace(marker, `${marker}\n        externalNativeBuild {\n            cmake {\n                arguments "-DCMAKE_JOB_POOLS=compile=2;link=1", "-DCMAKE_JOB_POOL_COMPILE=compile", "-DCMAKE_JOB_POOL_LINK=link"\n            }\n        }`));
}
const gradleProperties = path.join(root, 'android/gradle.properties');
const properties = await readFile(gradleProperties, 'utf8');
await writeFile(gradleProperties, properties.replace(/^org\.gradle\.jvmargs=.*$/m,
  'org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=1024m'));
await run(process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
  [':app:assembleRelease', `-PreactNativeArchitectures=${architecture}`, '--max-workers=2', '--console=plain'],
  path.join(root, 'android'), process.platform === 'win32');
const output = path.join(root, 'artifacts', emulatorTest ? 'TRACE-android-emulator-x86_64.apk' : 'TRACE-android-arm64.apk');
await mkdir(path.dirname(output), { recursive: true });
await copyFile(path.join(root, 'android/app/build/outputs/apk/release/app-release.apk'), output);
const bytes = await readFile(output);
const sha256 = createHash('sha256').update(bytes).digest('hex');
await writeFile(`${output}.sha256`, `${sha256}  ${path.basename(output)}\n`);
console.log(`\nInstallable Android testing APK: ${output}\nSHA-256: ${sha256}`);
console.log('Signed with the local development key. Not a store release. Requires a real account and assigned coach.');
if (emulatorTest) console.log('x86_64 emulator testing only. Use the ARM64 artifact for your phone.');
