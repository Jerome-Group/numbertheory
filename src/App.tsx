import { useEffect, useState, useSyncExternalStore } from 'react';
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
  const lesson = lessons.find((x) => x.id === state.lessonId) ?? lessons[0];
  const [drawer, setDrawer] = useState(false);
  useEffect(() => registerStudyTools(), []);
  useEffect(() => {
    document.title =
      state.view === 'lesson'
        ? `${lesson.title} · Number Theory`
        : `${state.view[0].toUpperCase()}${state.view.slice(1)} · Number Theory`;
  }, [lesson, state.view]);
  function select(id: string) {
    studyStore.openLesson(id);
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Sidebar
        drawer={drawer}
        onClose={() => setDrawer(false)}
        onSelect={select}
      />
      {drawer && (
        <button
          type="button"
          className="scrim"
          onClick={() => setDrawer(false)}
          aria-label="Close lesson navigation"
        />
      )}
      <main id="main-content" tabIndex={-1}>
        <header className="topbar">
          <button
            type="button"
            className="menu-button"
            onClick={() => setDrawer(true)}
            aria-label="Open lessons"
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
              ['learn', 'explore', 'practice', 'reference', 'course'] as const
            ).map((view) => (
              <button
                type="button"
                key={view}
                className={state.view === view ? 'active' : ''}
                onClick={() => studyStore.openView(view)}
              >
                {view === 'course'
                  ? 'MH3210'
                  : view[0].toUpperCase() + view.slice(1)}
              </button>
            ))}
          </nav>
        </header>
        {state.view !== 'lesson' ? (
          <AtlasViews view={state.view} open={select} />
        ) : (
          <LessonPage lesson={lesson} onSelect={select} />
        )}
      </main>
    </div>
  );
}
