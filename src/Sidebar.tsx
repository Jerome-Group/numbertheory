import { useMemo, useState, useSyncExternalStore } from 'react';
import { lessons } from './content/lessons';
import { studyStore } from './state';

const clusters = [...new Set(lessons.map((x) => x.cluster))];
export function Sidebar({
  drawer,
  onClose,
  onSelect,
}: {
  drawer: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const lesson = lessons.find((x) => x.id === state.lessonId) ?? lessons[0];
  const [query, setQuery] = useState('');
  const found = useMemo(
    () =>
      lessons.filter((x) =>
        `${x.title} ${x.question} ${x.summary}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query],
  );
  const select = onSelect;
  const setDrawer = (_: boolean) => onClose();
  return (
    <aside
      className={`sidebar ${drawer ? 'open' : ''}`}
      aria-label="Lesson navigation"
    >
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64">
            <title>Number Theory mark</title>
            <circle
              cx="32"
              cy="32"
              r="25"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M32 7v25L12 47m20-15 20 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle cx="32" cy="7" r="4" />
            <circle cx="12" cy="47" r="4" />
            <circle cx="52" cy="47" r="4" />
          </svg>
        </span>
        <div>
          <strong>Number Theory</strong>
          <small>Jerome Group</small>
        </div>
      </div>
      <button
        type="button"
        className="drawer-close"
        onClick={() => setDrawer(false)}
        aria-label="Close lessons"
      >
        ×
      </button>
      <label className="search-label" htmlFor="lesson-search">
        Find a concept
      </label>
      <input
        id="lesson-search"
        className="search"
        type="search"
        placeholder="Theorem, method, question…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <nav className="lesson-nav">
        {query ? (
          <>
            <div className="nav-heading">Results · {found.length}</div>
            {found.map((x) => (
              <button
                type="button"
                key={x.id}
                className={`nav-link ${state.view === 'lesson' && x.id === lesson.id ? 'active' : ''}`}
                onClick={() => select(x.id)}
              >
                <span>{x.id}</span>
                {x.title}
              </button>
            ))}
          </>
        ) : (
          clusters.map((cluster) => (
            <section key={cluster}>
              <div className="nav-heading">{cluster}</div>
              {lessons
                .filter((x) => x.cluster === cluster)
                .map((x) => (
                  <button
                    type="button"
                    key={x.id}
                    className={`nav-link ${state.view === 'lesson' && x.id === lesson.id ? 'active' : ''}`}
                    onClick={() => select(x.id)}
                  >
                    <span>{x.id}</span>
                    {x.title}
                  </button>
                ))}
            </section>
          ))
        )}
      </nav>
      <div className="side-foot">
        Original lessons · Exact arithmetic
        <br />
        Course alignment is shown in each lesson.
      </div>
    </aside>
  );
}
