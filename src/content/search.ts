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

export function lessonSearchScore(query: string, lesson: Lesson): number {
  const term = normalize(query);
  if (!term) return 1;
  const target = aliases[term] ?? term;
  const words = target.split(' ');
  const title = normalize(lesson.title);
  const question = normalize(lesson.question);
  const summary = normalize(lesson.summary);
  if (normalize(lesson.id) === target) return 100;
  if (title.includes(target)) return 90;
  if (words.every((word) => title.includes(word))) return 80;
  if (question.includes(target)) return 70;
  if (summary.includes(target)) return 60;
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
  if (corpus.includes(target)) return 40;
  return words.every((word) => corpus.includes(word)) ? 20 : 0;
}

export function lessonMatches(query: string, lesson: Lesson): boolean {
  return lessonSearchScore(query, lesson) > 0;
}
