import { readFileSync } from 'node:fs';
import katex from 'katex';
import ts from '@typescript/typescript6';

let source = readFileSync('src/content/lessons.ts', 'utf8');
source = source.replace(
  /import (\w+) from '\.\/(.+\.json)';/g,
  (_, variable, file) => {
    const contents = readFileSync(`src/content/${file}`, 'utf8');
    JSON.parse(contents);
    return `const ${variable} = ${contents};`;
  },
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { lessons } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
);
const errors = [];
const ids = new Set();
const requiredLabs = {
  D04: 'euclid',
  C01: 'residue',
  C02: 'cancellation',
  C03: 'linear',
  C04: 'crt',
  A03: 'divisor',
  F03: 'hensel',
  U02: 'order',
  Q01: 'quadratic',
  Q04: 'lattice',
  R01: 'continued-fraction',
  R06: 'pell',
  N04: 'gaussian',
  X05: 'local-squares',
};
const math = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
let formulas = 0;
for (const lesson of lessons) {
  if (ids.has(lesson.id)) errors.push(`Duplicate ID ${lesson.id}`);
  ids.add(lesson.id);
  if (requiredLabs[lesson.id] && lesson.lab !== requiredLabs[lesson.id])
    errors.push(`${lesson.id}: expected ${requiredLabs[lesson.id]} lab`);
  for (const key of [
    'id',
    'title',
    'cluster',
    'question',
    'summary',
    'theorem',
    'caution',
    'sourceNote',
  ])
    if (!lesson[key]) errors.push(`${lesson.id}: missing ${key}`);
  if (
    !lesson.proof?.length ||
    !lesson.example?.steps?.length ||
    !lesson.practice?.hints?.length ||
    !lesson.practice?.answer
  )
    errors.push(`${lesson.id}: incomplete proof, example, or practice`);
  const fields = [
    lesson.question,
    lesson.summary,
    ...lesson.definition,
    lesson.theorem,
    ...lesson.proof,
    lesson.example.prompt,
    ...lesson.example.steps,
    lesson.example.conclusion,
    lesson.practice.prompt,
    ...lesson.practice.hints,
    lesson.practice.answer,
    lesson.caution,
    lesson.bridge ?? '',
    lesson.sourceNote,
  ];
  for (const [index, value] of fields.entries()) {
    if (typeof value !== 'string') {
      errors.push(`${lesson.id}: non-text field ${index}`);
      continue;
    }
    if (
      [...value].some(
        (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
      )
    )
      errors.push(`${lesson.id}: control character in field ${index}`);
    const openings =
      (value.match(/\\\(/g) ?? []).length + (value.match(/\\\[/g) ?? []).length;
    const matches = [...value.matchAll(math)];
    if (openings !== matches.length)
      errors.push(`${lesson.id}: unmatched math delimiter in field ${index}`);
    const plain = value.replace(math, '');
    if (/[=<>∈∣≤≥±√∑]/.test(plain))
      errors.push(
        `${lesson.id}: raw math symbol outside LaTeX in field ${index}`,
      );
    if (
      index !== fields.length - 1 &&
      /(?<![A-Za-z0-9])\d+(?![A-Za-z0-9])/.test(
        plain.replace(/Handout \d+/g, ''),
      )
    )
      errors.push(`${lesson.id}: raw number outside LaTeX in field ${index}`);
    for (const match of matches) {
      formulas++;
      try {
        katex.renderToString(match[1] ?? match[2], {
          throwOnError: true,
          trust: false,
        });
      } catch (e) {
        errors.push(
          `${lesson.id}: invalid LaTeX in field ${index}: ${e.message}`,
        );
      }
    }
  }
}
for (const lesson of lessons)
  for (const pre of lesson.prerequisites)
    if (!ids.has(pre)) errors.push(`${lesson.id}: missing prerequisite ${pre}`);
const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
const visited = new Set();
const visiting = new Set();
function visit(id, trail) {
  if (visiting.has(id)) {
    errors.push(`Prerequisite cycle: ${[...trail, id].join(' -> ')}`);
    return;
  }
  if (visited.has(id)) return;
  visiting.add(id);
  for (const pre of byId.get(id)?.prerequisites ?? [])
    if (byId.has(pre)) visit(pre, [...trail, id]);
  visiting.delete(id);
  visited.add(id);
}
for (const id of ids) visit(id, []);
const order = JSON.parse(readFileSync('src/content/order.json', 'utf8'));
const objectives = JSON.parse(
  readFileSync('src/content/objectives.json', 'utf8'),
);
if (Object.keys(objectives).length !== ids.size)
  errors.push('Learning objectives must cover each lesson exactly once.');
for (const [id, objective] of Object.entries(objectives)) {
  if (!ids.has(id)) errors.push(`Unknown learning objective ${id}`);
  if (typeof objective !== 'string' || !objective.trim())
    errors.push(`${id}: empty learning objective`);
  else if (/[=<>∈∣≤≥±√∑]/.test(objective.replace(math, '')))
    errors.push(`${id}: raw math symbol in learning objective`);
}
if (order.length !== ids.size || new Set(order).size !== ids.size)
  errors.push('Order manifest must contain each lesson exactly once.');
for (const id of order)
  if (!ids.has(id)) errors.push(`Order manifest has unknown lesson ${id}`);
const courseMap = JSON.parse(
  readFileSync('src/content/course-map.json', 'utf8'),
);
const mapped = new Set();
for (const row of courseMap) {
  if (!ids.has(row.id)) errors.push(`Course map has unknown lesson ${row.id}`);
  if (mapped.has(row.id)) errors.push(`Course map repeats lesson ${row.id}`);
  mapped.add(row.id);
  if (!Array.isArray(row.handouts)) {
    errors.push(`${row.id}: course handouts must be a list`);
    continue;
  }
  if (new Set(row.handouts).size !== row.handouts.length)
    errors.push(`${row.id}: duplicate course handout`);
  for (const handout of row.handouts) {
    if (!/^MH-H(0[1-9]|10)$/.test(handout))
      errors.push(`${row.id}: unknown course handout ${handout}`);
    if (
      ['MH-H08', 'MH-H09', 'MH-H10'].includes(handout) &&
      !byId.get(row.id)?.sourceNote.includes('historical same-course handout')
    )
      errors.push(`${row.id}: historical handout needs visible source status`);
  }
}
const checkpointSource = ts.transpileModule(
  readFileSync('src/content/checkpoints.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { chapterCheckpoints } = await import(
  `data:text/javascript;base64,${Buffer.from(checkpointSource).toString('base64')}`
);
for (const cluster of new Set(lessons.map((lesson) => lesson.cluster)))
  if (!chapterCheckpoints[cluster])
    errors.push(`Missing chapter checkpoint: ${cluster}`);
for (const [cluster, checkpoint] of Object.entries(chapterCheckpoints)) {
  if (!lessons.some((lesson) => lesson.cluster === cluster))
    errors.push(`Unknown chapter checkpoint: ${cluster}`);
  for (const id of checkpoint.links)
    if (!ids.has(id)) errors.push(`${cluster}: unknown checkpoint link ${id}`);
  for (const field of [checkpoint.prompt, checkpoint.answer]) {
    const matches = [...field.matchAll(math)];
    const openings =
      (field.match(/\\\(/g) ?? []).length + (field.match(/\\\[/g) ?? []).length;
    if (openings !== matches.length)
      errors.push(`${cluster}: unmatched checkpoint math`);
    for (const match of matches) {
      formulas++;
      try {
        katex.renderToString(match[1] ?? match[2], {
          throwOnError: true,
          trust: false,
        });
      } catch (error) {
        errors.push(`${cluster}: invalid checkpoint math: ${error.message}`);
      }
    }
  }
}
const experiences = JSON.parse(
  readFileSync('src/content/experiences.json', 'utf8'),
);
for (const [id, experience] of Object.entries(experiences)) {
  if (!ids.has(id)) errors.push(`Unknown interactive experience ${id}`);
  if ('choices' in experience) {
    const choices = experience.choices.map((item) => item.id);
    if (
      new Set(choices).size !== choices.length ||
      !choices.includes(experience.correct)
    )
      errors.push(`${id}: invalid reasoning choices`);
  }
  if ('stages' in experience && experience.stages.length < 2)
    errors.push(`${id}: reasoning ladder needs multiple stages`);
  function checkExperience(value, path) {
    if (typeof value === 'string') {
      const matches = [...value.matchAll(math)];
      const openings =
        (value.match(/\\\(/g) ?? []).length +
        (value.match(/\\\[/g) ?? []).length;
      if (openings !== matches.length)
        errors.push(`${path}: unmatched math delimiter`);
      if (/[=<>∈∣≤≥±√∑]/.test(value.replace(math, '')))
        errors.push(`${path}: raw math symbol outside LaTeX`);
      if (
        [...value].some(
          (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
        )
      )
        errors.push(`${path}: control character`);
      for (const match of matches) {
        formulas++;
        try {
          katex.renderToString(match[1] ?? match[2], {
            throwOnError: true,
            trust: false,
          });
        } catch (error) {
          errors.push(`${path}: invalid LaTeX: ${error.message}`);
        }
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        checkExperience(item, `${path}.${index}`);
      });
    } else if (value && typeof value === 'object') {
      for (const [key, item] of Object.entries(value))
        checkExperience(item, `${path}.${key}`);
    }
  }
  checkExperience(experience, `Experience ${id}`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Content valid: ${lessons.length} lessons, ${formulas} strict LaTeX formulas, unique IDs, resolved prerequisites.`,
  );
