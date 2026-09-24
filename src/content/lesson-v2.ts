import type { Lesson } from './types';
import objectives from './objectives.json' with { type: 'json' };

export type LessonArchetype =
  | 'discovery'
  | 'proof-workshop'
  | 'algorithm-lab'
  | 'structure-bridge'
  | 'case-study';
export type LessonBlock =
  | { kind: 'question'; text: string }
  | { kind: 'definition'; id: string; text: string }
  | { kind: 'claim'; id: string }
  | { kind: 'proof'; id: string }
  | { kind: 'example'; id: string }
  | { kind: 'lab'; id: string }
  | { kind: 'practice'; id: string }
  | { kind: 'boundary'; text: string }
  | { kind: 'bridge'; text: string }
  | { kind: 'source'; text: string };
export type LessonV2 = {
  schemaVersion: 2;
  id: string;
  title: string;
  chapterId: string;
  archetype: LessonArchetype;
  prerequisites: {
    lessonId: string;
    kind: 'reading' | 'proof' | 'optional-lens';
  }[];
  objectives: string[];
  blocks: LessonBlock[];
  migration: 'legacy-adapted' | 'reviewed-v2';
};
export type Claim = {
  id: string;
  lessonId: string;
  title: string;
  hypotheses: string[];
  statement: string;
  dependencies: string[];
  proof: string[];
  proofStatus: 'legacy-preserved' | 'independently-reviewed';
  sourceNote: string;
};
export type Example = Lesson['example'] & { id: string; lessonId: string };
export type Exercise = Lesson['practice'] & { id: string; lessonId: string };

const archetypes: Record<string, LessonArchetype> = {
  P00: 'proof-workshop',
  D04: 'algorithm-lab',
  C02: 'structure-bridge',
  Q04: 'proof-workshop',
  R07: 'case-study',
  N04: 'algorithm-lab',
  P01: 'proof-workshop',
  X05: 'algorithm-lab',
  X06: 'proof-workshop',
  N02: 'structure-bridge',
  N09: 'case-study',
  N11: 'structure-bridge',
};
function legacyArchetype(lesson: Lesson): LessonArchetype {
  if (archetypes[lesson.id]) return archetypes[lesson.id];
  if (lesson.lab) return 'algorithm-lab';
  return 'discovery';
}

export function adaptLessonV1(lesson: Lesson): {
  lesson: LessonV2;
  claims: Claim[];
  examples: Example[];
  exercises: Exercise[];
} {
  const claimId = `${lesson.id}.claim`;
  const exampleId = `${lesson.id}.example`;
  const exerciseId = `${lesson.id}.practice`;
  const archetype = legacyArchetype(lesson);
  const question: LessonBlock = { kind: 'question', text: lesson.question };
  const definitions: LessonBlock[] = lesson.definition.map((text, index) => ({
    kind: 'definition',
    id: `${lesson.id}.definition.${index + 1}`,
    text,
  }));
  const claim: LessonBlock = { kind: 'claim', id: claimId };
  const proof: LessonBlock = { kind: 'proof', id: claimId };
  const example: LessonBlock = { kind: 'example', id: exampleId };
  const practice: LessonBlock = { kind: 'practice', id: exerciseId };
  const boundary: LessonBlock = { kind: 'boundary', text: lesson.caution };
  const lab: LessonBlock[] = lesson.lab
    ? [{ kind: 'lab', id: lesson.lab }]
    : [];
  const bridge: LessonBlock[] = lesson.bridge
    ? [{ kind: 'bridge', text: lesson.bridge }]
    : [];
  const source: LessonBlock = { kind: 'source', text: lesson.sourceNote };
  const layouts: Record<LessonArchetype, LessonBlock[]> = {
    discovery: [
      question,
      example,
      ...definitions,
      claim,
      proof,
      ...lab,
      practice,
      boundary,
      ...bridge,
      source,
    ],
    'proof-workshop': [
      question,
      ...definitions,
      claim,
      proof,
      practice,
      example,
      ...lab,
      boundary,
      ...bridge,
      source,
    ],
    'algorithm-lab': [
      question,
      ...lab,
      ...definitions,
      claim,
      example,
      proof,
      practice,
      boundary,
      ...bridge,
      source,
    ],
    'structure-bridge': [
      question,
      ...lab,
      example,
      ...definitions,
      claim,
      proof,
      practice,
      boundary,
      ...bridge,
      source,
    ],
    'case-study': [
      question,
      example,
      boundary,
      ...definitions,
      claim,
      proof,
      practice,
      ...lab,
      ...bridge,
      source,
    ],
  };
  const blocks = layouts[archetype];
  return {
    lesson: {
      schemaVersion: 2,
      id: lesson.id,
      title: lesson.title,
      chapterId: lesson.cluster,
      archetype,
      prerequisites: lesson.prerequisites.map((lessonId) => ({
        lessonId,
        kind: 'reading',
      })),
      objectives: [(objectives as Record<string, string>)[lesson.id]],
      blocks,
      migration: 'legacy-adapted',
    },
    claims: [
      {
        id: claimId,
        lessonId: lesson.id,
        title: lesson.title,
        hypotheses: [],
        statement: lesson.theorem,
        dependencies: lesson.prerequisites,
        proof: lesson.proof,
        proofStatus: 'legacy-preserved',
        sourceNote: lesson.sourceNote,
      },
    ],
    examples: [{ ...lesson.example, id: exampleId, lessonId: lesson.id }],
    exercises: [{ ...lesson.practice, id: exerciseId, lessonId: lesson.id }],
  };
}
