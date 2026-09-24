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
      'S01',
      'S04',
      'R01',
      'R02',
      'R03',
      'R04',
      'R05',
      'R06',
      'R07',
    ],
  },
  mh3210: {
    title: 'MH3210',
    description:
      'Topic alignment with the current overview; late handout locators remain provisional.',
    ids: courseMap.map((row) => row.id),
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
        /enrichment|original extension|independent extension/i.test(
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
      'R01',
      'R02',
      'R06',
      'R07',
    ],
  },
};
export const pathIds = Object.keys(pathDetails) as PathId[];
export function lessonsForPath(id: PathId) {
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  return pathDetails[id].ids
    .map((lessonId) => byId.get(lessonId))
    .filter((lesson): lesson is (typeof lessons)[number] => Boolean(lesson));
}
