import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const sourcePaths = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter((path) => path && existsSync(path));

function filesUnder(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).flatMap((name) => {
    const child = join(path, name);
    return statSync(child).isDirectory() ? filesUnder(child) : [child];
  });
}

const publicPaths = [...sourcePaths, ...filesUnder('dist')];
const forbiddenPaths = [
  /(^|\/)\.env(?:\.|$)/i,
  /\.(?:pdf|zip|docx|pptx|xlsx|pem|p12|key)$/i,
  /(^|\/)(?:credentials?|secrets?)(?:\.|\/|$)/i,
];
const forbiddenText = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp_|github_pat_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9_]{20,}\b/,
  /\bsk-[A-Za-z0-9_-]{20,}\b/,
  /\/Users\/[^/]+\/(?:Downloads|Library)\//,
  /https?:\/\/drive\.google\.com\/(?:file|open|drive\/u)/i,
];
const problems = [];
for (const path of publicPaths) {
  if (forbiddenPaths.some((rule) => rule.test(path))) {
    problems.push(`${path}: forbidden public file type or name`);
    continue;
  }
  if (!/\.(?:md|json|js|mjs|ts|tsx|css|html|svg|txt|yml|yaml)$/.test(path))
    continue;
  const value = readFileSync(path, 'utf8');
  if (forbiddenText.some((rule) => rule.test(value)))
    problems.push(
      `${path}: private path, private source link, or secret pattern`,
    );
}

if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Public-surface scan passed: ${sourcePaths.length} source files, ${publicPaths.length - sourcePaths.length} build files.`,
  );
}
