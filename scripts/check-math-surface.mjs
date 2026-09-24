import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const errors = [];
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (file.endsWith('.tsx')) {
      const source = readFileSync(file, 'utf8');
      for (const [pattern, reason] of [
        [/(?<!\\)\\[([]/g, 'single-escaped LaTeX delimiter in TSX'],
        [/[²³√≤≥≡∑∈∣±∞]/g, 'raw math glyph in TSX'],
      ]) {
        for (const match of source.matchAll(pattern)) {
          const line = source.slice(0, match.index).split('\n').length;
          errors.push(`${file}:${line}: ${reason}`);
        }
      }
    }
  }
}
scan('src');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    'TSX math surface valid: no dropped delimiters or raw math glyphs.',
  );
