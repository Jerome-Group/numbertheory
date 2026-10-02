import { readFileSync } from 'node:fs';
import { validateLearningContent } from './verification/learning-content.mjs';
import { loadRepositoryModule } from './verification/repo-loader.mjs';

const root = process.cwd();
const { lessons } = await loadRepositoryModule(root, 'src/content/lessons.ts');
const { pathDetails } = await loadRepositoryModule(
  root,
  'src/content/paths.ts',
);
const { figures } = await loadRepositoryModule(root, 'src/content/figures.ts');
const teaching = JSON.parse(readFileSync('src/content/teaching.json', 'utf8'));
const inventory = JSON.parse(
  readFileSync('scripts/verification/lesson-inventory.json', 'utf8'),
);
const errors = validateLearningContent(
  lessons,
  teaching,
  pathDetails,
  figures,
  inventory,
);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Learning content valid: ${lessons.length} complete teaching records, ${Object.keys(figures).length} figures, closed ordered paths.`,
  );
