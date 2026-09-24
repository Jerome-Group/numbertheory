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
if (order.length !== ids.size || new Set(order).size !== ids.size)
  errors.push('Order manifest must contain each lesson exactly once.');
for (const id of order)
  if (!ids.has(id)) errors.push(`Order manifest has unknown lesson ${id}`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else
  console.log(
    `Content valid: ${lessons.length} lessons, ${formulas} strict LaTeX formulas, unique IDs, resolved prerequisites.`,
  );
