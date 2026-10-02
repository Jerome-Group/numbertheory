import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AtlasViews } from './AtlasViews';
import { lessons } from './content/lessons';
import { LessonPage } from './LessonPage';
import { Sidebar } from './Sidebar';
import { studyStore } from './state';
import { registerStudyTools } from './webmcp/register';

export function App() {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const navigationRevision = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getNavigationRevision,
  );
  const lesson = lessons.find((x) => x.id === state.lessonId) ?? lessons[0];
  const [drawer, setDrawer] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const pendingSection = useRef<string | null>(null);
  useEffect(() => registerStudyTools(), []);
  useEffect(() => {
    setDrawer(false);
    const readingRoot =
      state.view === 'lesson'
        ? document.querySelector(`[data-lesson-id="${state.lessonId}"]`)
        : document.getElementById('main-content');
    if (!readingRoot) return;
    const hash = window.location.hash.slice(1);
    const sections = [
      'intuition',
      'definition',
      'theorem',
      'proof',
      'example',
      'practice',
      'boundary',
      ...(lesson.lab ? ['lab'] : []),
    ];
    const requestedSection =
      pendingSection.current ??
      (hash === 'main-content' ||
      (state.view === 'lesson' && sections.includes(hash)) ||
      (state.view === 'explore' && /^atlas-chapter-\d+$/.test(hash))
        ? hash
        : null);
    if (requestedSection) {
      const section = requestedSection;
      const jump = () => {
        const target =
          section === 'main-content'
            ? document.getElementById(section)
            : readingRoot.querySelector<HTMLElement>(`#${section}`);
        if (!target) return false;
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
        const heading =
          section === 'main-content'
            ? target
            : (target.querySelector<HTMLElement>('h2') ?? target);
        heading.tabIndex = -1;
        requestAnimationFrame(() => {
          if (
            studyStore.getNavigationRevision() === navigationRevision &&
            !document.getElementById('main-content')?.inert
          )
            heading.focus({ preventScroll: true });
        });
        const url = new URL(window.location.href);
        url.hash = section;
        window.history.replaceState(null, '', url);
        pendingSection.current = null;
        return true;
      };
      if (jump()) return;
      const observer = new MutationObserver(() => {
        if (jump()) observer.disconnect();
      });
      observer.observe(readingRoot, {
        childList: true,
        subtree: true,
      });
      return () => observer.disconnect();
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => {
      if (
        studyStore.getNavigationRevision() !== navigationRevision ||
        document.getElementById('main-content')?.inert
      )
        return;
      document
        .querySelector<HTMLElement>(
          '#lesson-heading, .overview-heading h1, .hero-copy h1',
        )
        ?.focus();
    });
  }, [state.view, state.lessonId, navigationRevision, lesson.lab]);
  useEffect(() => {
    if (!drawer) return;
    const main = document.getElementById('main-content');
    const sidebar = document.getElementById('lesson-sidebar');
    if (!main || !sidebar) return;
    main.inert = true;
    document.body.style.overflow = 'hidden';
    sidebar.querySelector<HTMLInputElement>('#lesson-search')?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDrawer(false);
        menuButton.current?.focus();
      }
      if (event.key !== 'Tab' || !sidebar) return;
      const focusable = [
        ...sidebar.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled])',
        ),
      ].filter((element) => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      main.inert = false;
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKey);
    };
  }, [drawer]);
  useEffect(() => {
    document.title =
      state.view === 'lesson'
        ? `${lesson.title} · Number Theory`
        : `${state.view[0].toUpperCase()}${state.view.slice(1)} · Number Theory`;
  }, [lesson, state.view]);
  function select(id: string, section?: string) {
    pendingSection.current = section ?? null;
    studyStore.openLesson(id);
    setDrawer(false);
  }
  function closeDrawer() {
    setDrawer(false);
    menuButton.current?.focus();
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar drawer={drawer} onClose={closeDrawer} onSelect={select} />
      {drawer && (
        <button
          type="button"
          className="scrim"
          onClick={closeDrawer}
          aria-label="Close lesson navigation"
        />
      )}
      <main id="main-content" tabIndex={-1}>
        <header className="topbar">
          <button
            type="button"
            className="menu-button"
            ref={menuButton}
            onClick={() => setDrawer(true)}
            aria-label="Open lessons"
            aria-expanded={drawer}
            aria-controls="lesson-sidebar"
          >
            ☰
          </button>
          <button
            type="button"
            className="topbar-name"
            onClick={() => studyStore.openView('learn')}
          >
            Number Theory
          </button>
          <nav className="primary-nav" aria-label="Main navigation">
            {(
              [
                'learn',
                'explore',
                'practice',
                'studio',
                'reference',
                'course',
              ] as const
            ).map((view) => (
              <button
                type="button"
                key={view}
                className={state.view === view ? 'active' : ''}
                aria-current={state.view === view ? 'page' : undefined}
                onClick={() => studyStore.openView(view)}
              >
                {view === 'course'
                  ? 'MH3210'
                  : view[0].toUpperCase() + view.slice(1)}
              </button>
            ))}
          </nav>
        </header>
        {state.view === 'not-found' ? (
          <div className="reading-shell">
            <h1>Page not found</h1>
            <p>That lesson or route is unavailable.</p>
            <button type="button" onClick={() => studyStore.openView('learn')}>
              Return to the atlas
            </button>
          </div>
        ) : state.view !== 'lesson' ? (
          <AtlasViews view={state.view} open={select} />
        ) : (
          <LessonPage key={lesson.id} lesson={lesson} onSelect={select} />
        )}
      </main>
    </div>
  );
}
