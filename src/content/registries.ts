import { lessons } from './lessons';
import { adaptLessonV1 } from './lesson-v2';

const adapted = lessons.map(adaptLessonV1);
export const lessonV2 = adapted.map((record) => record.lesson);
export const claimRegistry = new Map(
  adapted.flatMap((record) =>
    record.claims.map((claim) => [claim.id, claim] as const),
  ),
);
export const exampleRegistry = new Map(
  adapted.flatMap((record) =>
    record.examples.map((example) => [example.id, example] as const),
  ),
);
export const exerciseRegistry = new Map(
  adapted.flatMap((record) =>
    record.exercises.map((exercise) => [exercise.id, exercise] as const),
  ),
);
