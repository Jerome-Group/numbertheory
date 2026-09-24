import type { Lesson } from './types';

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
  const blocks: LessonBlock[] = [{ kind: 'question', text: lesson.question }];
  if ((lesson.id === 'C02' || lesson.id === 'N04') && lesson.lab)
    blocks.push({ kind: 'lab', id: lesson.lab });
  lesson.definition.forEach((text, index) => {
    blocks.push({
      kind: 'definition',
      id: `${lesson.id}.definition.${index + 1}`,
      text,
    });
  });
  blocks.push({ kind: 'claim', id: claimId }, { kind: 'proof', id: claimId });
  blocks.push({ kind: 'example', id: exampleId });
  if (lesson.lab && lesson.id !== 'C02' && lesson.id !== 'N04')
    blocks.push({ kind: 'lab', id: lesson.lab });
  blocks.push({ kind: 'practice', id: exerciseId });
  blocks.push({ kind: 'boundary', text: lesson.caution });
  if (lesson.bridge) blocks.push({ kind: 'bridge', text: lesson.bridge });
  blocks.push({ kind: 'source', text: lesson.sourceNote });
  return {
    lesson: {
      schemaVersion: 2,
      id: lesson.id,
      title: lesson.title,
      chapterId: lesson.cluster,
      archetype: legacyArchetype(lesson),
      prerequisites: lesson.prerequisites.map((lessonId) => ({
        lessonId,
        kind: 'reading',
      })),
      objectives: [],
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
