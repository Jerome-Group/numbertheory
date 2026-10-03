import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateMathSurface } from './verification/math-surface.mjs';

const errors = [];
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (file.endsWith('.tsx')) {
      const source = readFileSync(file, 'utf8');
      errors.push(...validateMathSurface(source, file));
    }
  }
}
scan('src');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    'TSX math source valid: delimiters, glyphs and MathText-only heading labels.',
  );
