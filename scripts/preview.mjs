import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--web', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_PUBLIC_DEV_PREVIEW: '1' },
});
child.on('error', (error) => { console.error(error); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
