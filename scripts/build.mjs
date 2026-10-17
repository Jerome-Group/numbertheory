import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fingerprint } from './verification/verify.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const receipt = new URL('../dist/source-identity.json', import.meta.url);
rmSync(receipt, { force: true });
const before = fingerprint(root);
execFileSync(
  process.execPath,
  [
    fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)),
    'build',
  ],
  { cwd: root, stdio: 'inherit' },
);
const after = fingerprint(root);
if (
  before.sourceHash !== after.sourceHash ||
  before.lockHash !== after.lockHash
)
  throw new Error('Source changed during build; rebuild before verification.');
writeFileSync(
  receipt,
  `${JSON.stringify({ schemaVersion: 1, sourceHash: before.sourceHash, lockHash: before.lockHash })}\n`,
);
