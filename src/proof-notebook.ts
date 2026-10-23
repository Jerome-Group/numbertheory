import { claimRegistry, lessonV2 } from './content/registries';
import { teachingFor } from './content/teaching';
import { lessonPath } from './routes';

export type ProofSource = {
  readonly id: string;
  readonly title: string;
  readonly chapter: string;
  readonly claimId: string;
  readonly claim: string;
  readonly conditions: readonly string[];
  readonly definitions: readonly string[];
  readonly strategy: string;
  readonly proof: readonly {
    readonly text: string;
    readonly label: string;
    readonly reason: string;
  }[];
  readonly boundary: string;
  readonly sourceNote: string;
  readonly proofStatus: string;
  readonly canonicalPath: string;
};

type Capture = {
  readonly text: string;
  readonly reflection: string;
};
export type Notebook =
  | {
      readonly kind: 'writing';
      readonly text: string;
      readonly history: readonly Capture[];
    }
  | {
      readonly kind: 'comparing';
      readonly capture: Capture;
      readonly history: readonly Capture[];
    };
export type NotebookAction =
  | { kind: 'write'; text: string }
  | { kind: 'compare' }
  | { kind: 'reflect'; text: string }
  | { kind: 'revise' }
  | { kind: 'new' }
  | { kind: 'reset' };

export function sourceFor(id: string): ProofSource | null {
  const model = lessonV2.find((lesson) => lesson.id === id);
  if (!model) return null;
  const proofBlock = model.blocks.find((block) => block.kind === 'proof');
  const claim = proofBlock && claimRegistry.get(proofBlock.id);
  if (!claim) throw new Error(`Missing notebook claim ${id}`);
  const teaching = teachingFor(id);
  if (claim.proof.length !== teaching.proofSteps.length)
    throw new Error(`Misaligned notebook proof ${id}`);
  return {
    id: model.id,
    title: model.title,
    chapter: model.chapterId,
    claimId: claim.id,
    claim: claim.statement,
    conditions: claim.hypotheses,
    definitions: model.blocks
      .filter((block) => block.kind === 'definition')
      .map((block) => block.text),
    strategy: teaching.strategy,
    proof: claim.proof.map((text, index) => ({
      text,
      ...teaching.proofSteps[index],
    })),
    boundary:
      model.blocks.find((block) => block.kind === 'boundary')?.text ?? '',
    sourceNote: claim.sourceNote,
    proofStatus: claim.proofStatus,
    canonicalPath: lessonPath(model.id),
  };
}

export function reduceNotebook(
  notebook: Notebook = { kind: 'writing', text: '', history: [] },
  action: NotebookAction,
): Notebook {
  switch (action.kind) {
    case 'write':
      return notebook.kind === 'writing'
        ? { ...notebook, text: action.text }
        : notebook;
    case 'compare':
      return notebook.kind === 'writing'
        ? {
            kind: 'comparing',
            capture: Object.freeze({ text: notebook.text, reflection: '' }),
            history: notebook.history,
          }
        : notebook;
    case 'reflect':
      return notebook.kind === 'comparing'
        ? {
            ...notebook,
            capture: Object.freeze({
              ...notebook.capture,
              reflection: action.text,
            }),
          }
        : notebook;
    case 'revise':
    case 'new':
      return notebook.kind === 'comparing'
        ? {
            kind: 'writing',
            text: action.kind === 'revise' ? notebook.capture.text : '',
            history: [...notebook.history, notebook.capture],
          }
        : notebook;
    case 'reset':
      return { kind: 'writing', text: '', history: [] };
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function literal(text: string): string {
  let fenceLength = 3;
  for (const [run] of text.matchAll(/`+/g)) {
    fenceLength = Math.max(fenceLength, run.length + 1);
  }
  const fence = '`'.repeat(fenceLength);
  return `${fence}text\n${text}${text.endsWith('\n') ? '' : '\n'}${fence}`;
}

export function exportNotebook({
  source,
  notebook,
}: {
  source: ProofSource;
  notebook: Notebook;
}): string {
  const captures =
    notebook.kind === 'comparing'
      ? [...notebook.history, notebook.capture]
      : notebook.history;
  return [
    `# Proof notebook: ${source.id} · ${source.title}`,
    'Learner writing and reflections are self-assessment. This notebook does not grade correctness or establish mastery.',
    '## Source provenance',
    `Number Theory atlas lesson ${source.id}. Claim ${source.claimId}.`,
    `Canonical lesson locator: ${source.canonicalPath}`,
    `Authored proof status: ${source.proofStatus}`,
    source.sourceNote,
    '## Claim',
    source.claim,
    '## Conditions',
    ...source.conditions.map((text) => `- ${text}`),
    '## Definitions',
    ...source.definitions,
    '## Source strategy',
    source.strategy,
    ...captures.flatMap((capture, index) => [
      `## Captured attempt ${index + 1}`,
      literal(capture.text),
      '### Learner reflection',
      literal(capture.reflection),
    ]),
    ...(notebook.kind === 'writing'
      ? ['## Current draft (not compared)', literal(notebook.text)]
      : []),
    '## Authored proof for comparison',
    ...source.proof.flatMap((paragraph, index) => [
      `### ${index + 1}. ${paragraph.label}`,
      paragraph.text,
      `Why this step works: ${paragraph.reason}`,
    ]),
    '## Boundary to check',
    source.boundary,
    '',
  ].join('\n\n');
}
