export type Lesson = {
  id: string;
  title: string;
  cluster: string;
  question: string;
  prerequisites: string[];
  summary: string;
  definition: string[];
  theorem: string;
  proof: string[];
  example: { prompt: string; steps: string[]; conclusion: string };
  practice: { prompt: string; hints: string[]; answer: string };
  caution: string;
  bridge?: string;
  sourceNote: string;
  lab?:
    | 'euclid'
    | 'crt'
    | 'linear'
    | 'residue'
    | 'quadratic'
    | 'hensel'
    | 'divisor'
    | 'order'
    | 'lattice'
    | 'continued-fraction'
    | 'pell';
};
