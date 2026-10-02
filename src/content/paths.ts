import courseMap from './course-map.json';
import { lessons } from './lessons';

export type PathId = 'core' | 'mh3210' | 'computational' | 'enrichment' | 'ant';
export const pathDetails: Record<
  PathId,
  { title: string; description: string; ids: string[] }
> = {
  core: {
    title: 'Core',
    description:
      'A complete route from proof foundations to reciprocity and Pell.',
    ids: [
      'P00',
      'P01',
      'P03',
      'P04',
      'D01',
      'D02',
      'P02',
      'D03',
      'D04',
      'D05',
      'D06',
      'X03',
      'D07',
      'X02',
      'C01',
      'C02',
      'C03',
      'C04',
      'C05',
      'C06',
      'C07',
      'A01',
      'A02',
      'A03',
      'A04',
      'F01',
      'F02',
      'F03',
      'U01',
      'U02',
      'Q01',
      'Q02',
      'Q03',
      'Q04',
      'Q05',
      'Q06',
      'Q07',
      'X05',
      'S01',
      'S04',
      'R01',
      'R02',
      'R03',
      'X07',
      'R04',
      'R05',
      'R06',
      'R07',
      'E01',
      'X06',
    ],
  },
  mh3210: {
    title: 'MH3210',
    description:
      'Current topic alignment through Handout 07; later Handouts 08–10 are historical same-course mappings awaiting current verification.',
    ids: courseMap.filter((row) => row.handouts.length).map((row) => row.id),
  },
  computational: {
    title: 'Computational',
    description: 'Exact experiments paired with proofs and boundary cases.',
    ids: lessons.filter((lesson) => lesson.lab).map((lesson) => lesson.id),
  },
  enrichment: {
    title: 'Enrichment',
    description:
      'Independent extensions beyond verified current handout alignment.',
    ids: lessons
      .filter((lesson) =>
        /enrichment|original extension|independent.*extension/i.test(
          lesson.sourceNote,
        ),
      )
      .map((lesson) => lesson.id),
  },
  ant: {
    title: 'ANT Runway',
    description:
      'The currently published bridge from elementary arithmetic toward rings and norms.',
    ids: [
      'P00',
      'D01',
      'D03',
      'D05',
      'C01',
      'C02',
      'C04',
      'A03',
      'U01',
      'S01',
      'S04',
      'S05',
      'N01',
      'N02',
      'N03',
      'N04',
      'N05',
      'N06',
      'N07',
      'N08',
      'N09',
      'N10',
      'N12',
      'R01',
      'R02',
      'R06',
      'R07',
      'R08',
      'N11',
    ],
  },
};
export const pathIds = Object.keys(pathDetails) as PathId[];
export const pathTargets = Object.fromEntries(
  pathIds.map((id) => [id, [...pathDetails[id].ids]]),
) as Record<PathId, string[]>;

export function closePrerequisites(ids: string[]) {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  const needed = new Set<string>();
  function visit(id: string, trail: string[]) {
    if (trail.includes(id))
      throw new Error(`Prerequisite cycle: ${[...trail, id].join(' → ')}`);
    const lesson = byId.get(id);
    if (!lesson) throw new Error(`Unknown path lesson ${id}`);
    if (needed.has(id)) return;
    for (const prerequisite of lesson.prerequisites)
      visit(prerequisite, [...trail, id]);
    needed.add(id);
  }
  for (const id of ids) visit(id, []);
  return lessons
    .filter((lesson) => needed.has(lesson.id))
    .map((lesson) => lesson.id);
}
for (const id of pathIds)
  pathDetails[id].ids = closePrerequisites(pathTargets[id]);

let sessionPath: PathId | 'all' | undefined;
export function selectedPath(): PathId | 'all' {
  if (sessionPath !== undefined) return sessionPath;
  try {
    const value = localStorage.getItem('numbertheory.path.v1');
    sessionPath =
      value && pathIds.includes(value as PathId) ? (value as PathId) : 'all';
    return sessionPath;
  } catch {
    return 'all';
  }
}
export function selectLearningPath(id: PathId | 'all') {
  if (id !== 'all' && !pathIds.includes(id))
    throw new Error(`Unknown learning path ${id}`);
  sessionPath = id;
  try {
    localStorage.setItem('numbertheory.path.v1', id);
  } catch {
    /* The selected route remains available in this session. */
  }
}
export function lessonsForPath(id: PathId) {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  return pathDetails[id].ids.map((lessonId) => {
    const lesson = byId.get(lessonId);
    if (!lesson) throw new Error(`Unknown path lesson ${id}:${lessonId}`);
    return lesson;
  });
}
