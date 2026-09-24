import type { Lesson } from './types';

const aliases: Record<string, string> = {
  phi: 'totient',
  eulerphi: 'totient',
  crt: 'chinese remainder',
  bezout: 'bezout',
  mobius: 'mobius',
  'quadratic integer': 'quadratic ring',
  'euclidean domain': 'euclidean division',
};
const normalize = (text: string) =>
  text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\\[a-z]+/g, (command) => command.slice(1))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function lessonMatches(query: string, lesson: Lesson): boolean {
  const term = normalize(query);
  if (!term) return true;
  const target = aliases[term] ?? term;
  const corpus = normalize(
    [
      lesson.id,
      lesson.title,
      lesson.cluster,
      lesson.question,
      lesson.summary,
      ...lesson.definition,
      lesson.theorem,
      lesson.caution,
      lesson.bridge ?? '',
      lesson.practice.prompt,
    ].join(' '),
  );
  return corpus.includes(target);
}
