import { lessons } from './content/lessons';

const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
const slug = (title: string) =>
  title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function lessonPath(id: string): string {
  const lesson = byId.get(id);
  if (!lesson) throw new Error('Unknown lesson ID.');
  return `/lessons/${id.toLowerCase()}-${slug(lesson.title)}`;
}

export function routeFromLocation(pathname: string, search: string) {
  const query = new URLSearchParams(search);
  const match = /^\/lessons\/([a-z][0-9]{2})(?:-[a-z0-9-]+)?\/?$/i.exec(
    pathname,
  );
  if (match) {
    const id = match[1].toUpperCase();
    return byId.has(id)
      ? { view: 'lesson' as const, lessonId: id }
      : { view: 'not-found' as const, lessonId: id };
  }
  if (pathname === '/' || pathname === '') {
    const requested = query.get('lesson');
    if (query.get('view') === 'lesson' && requested && !byId.has(requested))
      return { view: 'not-found' as const, lessonId: requested };
    if (query.get('view') === 'lesson' && requested)
      return { view: 'lesson' as const, lessonId: requested };
    const view = query.get('view');
    if (
      view &&
      ['learn', 'explore', 'practice', 'reference', 'course'].includes(view)
    )
      return { view, lessonId: null };
    return { view: 'learn' as const, lessonId: null };
  }
  const view = pathname.replace(/^\//, '').replace(/\/$/, '');
  if (['learn', 'explore', 'practice', 'reference', 'course'].includes(view))
    return { view, lessonId: null };
  return { view: 'not-found' as const, lessonId: null };
}

export function viewPath(view: string): string {
  return view === 'learn' ? '/' : `/${view}`;
}
