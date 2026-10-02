import { useState, useSyncExternalStore } from 'react';
import { chapterCheckpoints } from './content/checkpoints';
import courseMap from './content/course-map.json';
import { lessons } from './content/lessons';
import {
  lessonsForPath,
  type PathId,
  pathDetails,
  pathIds,
  pathTargets,
  selectedPath,
} from './content/paths';
import { claimRegistry, exerciseRegistry } from './content/registries';
import { lessonMatches } from './content/search';
import { Diagnostic } from './Diagnostic';
import { MathText } from './MathText';
import { buildCancellationMap } from './math/cancellation';
import { ProgressControls } from './ProgressControls';
import { progressStore } from './progress';
import { Practice } from './StudyPanels';
import { type AtlasView, studyStore } from './state';

const clusters = [...new Set(lessons.map((lesson) => lesson.cluster))];
const labCount = new Set(lessons.map((lesson) => lesson.lab).filter(Boolean))
  .size;
const course = new Map(courseMap.map((row) => [row.id, row.handouts]));

function PathSelector({
  selected,
  choose,
}: {
  selected: PathId | 'all';
  choose: (id: PathId | 'all') => void;
}) {
  return (
    <fieldset className="path-selector">
      <legend>Learning path</legend>
      <button
        type="button"
        aria-pressed={selected === 'all'}
        onClick={() => choose('all')}
      >
        All lessons
      </button>
      {pathIds.map((id) => (
        <button
          type="button"
          key={id}
          aria-pressed={selected === id}
          onClick={() => choose(id)}
        >
          {pathDetails[id].title}
        </button>
      ))}
    </fieldset>
  );
}

function HomeFiberPreview({ open }: { open: (id: string) => void }) {
  const [factor, setFactor] = useState('4');
  const map = buildCancellationMap('12', factor);
  return (
    <section className="home-fiber" aria-labelledby="home-fiber-title">
      <span className="instrument-kicker">A QUESTION YOU CAN TEST</span>
      <h2 id="home-fiber-title">
        <MathText text={'What survives multiplication modulo \\(12\\)?'} />
      </h2>
      <fieldset className="home-fiber-controls">
        <legend>Choose a factor</legend>
        {['4', '5'].map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={factor === value}
            onClick={() => setFactor(value)}
          >
            <MathText text={`Multiply by \\(${value}\\)`} />
          </button>
        ))}
      </fieldset>
      <p>
        <MathText
          text={`\\(\\gcd(${factor},12)=${map.gcd}\\): each visible output has \\(${map.gcd}\\) input${map.gcd === 1 ? '' : 's'}.`}
        />
      </p>
      <div className="home-fiber-rows">
        {map.fibers.slice(0, 3).map((fiber) => (
          <div key={fiber.output}>
            <MathText
              text={`\\(\\{${fiber.inputs.join(',')}\\}\\mapsto ${fiber.output}\\)`}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="home-fiber-link"
        onClick={() => open('C02')}
      >
        Investigate every fiber →
      </button>
    </section>
  );
}

function Heading({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <header className="overview-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1 tabIndex={-1}>{title}</h1>
      <p>{lead}</p>
    </header>
  );
}
function LessonCard({ id, open }: { id: string; open: (id: string) => void }) {
  const lesson = lessons.find((item) => item.id === id);
  if (!lesson) return null;
  return (
    <button type="button" className="atlas-card" onClick={() => open(id)}>
      <span>
        {lesson.id} · {lesson.cluster}
      </span>
      <strong>{lesson.title}</strong>
      <small>
        <MathText text={lesson.question} />
      </small>
      <b aria-hidden="true">↗</b>
    </button>
  );
}
function PracticeWorksheet({ lessonId }: { lessonId: string }) {
  const claim = claimRegistry.get(`${lessonId}.claim`);
  const exercise = exerciseRegistry.get(`${lessonId}.practice`);
  if (!claim || !exercise)
    throw new Error(`Missing practice model ${lessonId}`);
  return (
    <Practice lessonId={lessonId} claim={claim} exercise={exercise} embedded />
  );
}
function OpenButton({
  id,
  open,
  section,
}: {
  id: string;
  open: (id: string, section?: string) => void;
  section?: string;
}) {
  return (
    <button
      type="button"
      className="text-link"
      onClick={() => open(id, section)}
    >
      Open lesson <span aria-hidden="true">→</span>
    </button>
  );
}
export function AtlasViews({
  view,
  open,
}: {
  view: AtlasView;
  open: (id: string, section?: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [chapter, setChapter] = useState('all');
  const [practiceScope, setPracticeScope] = useState<'all' | 'review'>('all');
  const progress = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
  );
  const [path, setPath] = useState<PathId | 'all'>(selectedPath);
  const pathLessons = path === 'all' ? lessons : lessonsForPath(path);
  const pathLessonIds = new Set(pathLessons.map((lesson) => lesson.id));
  const matches = (lesson: (typeof lessons)[number]) =>
    (chapter === 'all' || lesson.cluster === chapter) &&
    lessonMatches(filter, lesson);
  const next = pathLessons.find((lesson) => progress[lesson.id] !== 'complete');
  const understood = pathLessons.filter(
    (lesson) => progress[lesson.id] === 'complete',
  ).length;
  const catalogFilter = (
    <div className="filter-row">
      <label>
        Search this collection
        <input
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="A theorem, question, or idea…"
        />
      </label>
      <label>
        Chapter
        <select
          value={chapter}
          onChange={(event) => setChapter(event.target.value)}
        >
          <option value="all">Every chapter</option>
          {clusters.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
  function choosePath(id: PathId | 'all') {
    setPath(id);
    try {
      localStorage.setItem('numbertheory.path.v1', id);
    } catch {
      /* Browsing works without storage. */
    }
  }
  const [shown, setShown] = useState<string[]>([]);
  const toggle = (id: string) =>
    setShown((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  if (view === 'learn')
    return (
      <div className="overview-shell">
        <section className="atlas-hero">
          <div className="hero-copy">
            <p className="eyebrow">A PUBLIC MATHEMATICS ATLAS</p>
            <h1 tabIndex={-1}>
              Small integers.
              <br />
              <em>Big ideas.</em>
            </h1>
            <p>
              Discover the patterns. Find the argument. Make it yours. A
              complete undergraduate journey through the mathematics of
              integers.
            </p>
            <div className="hero-actions">
              <button type="button" onClick={() => open('P00')}>
                Begin at the beginning <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => studyStore.openView('explore')}
              >
                Explore the map <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
          <HomeFiberPreview open={open} />
        </section>
        <section className="continue-panel" aria-label="Continue your learning">
          <div>
            <span className="callout-label">YOUR NEXT ARGUMENT</span>
            <p>
              {understood} of {pathLessons.length} marked understood in{' '}
              {path === 'all' ? 'all lessons' : pathDetails[path].title}. These
              are your own marks, not a mastery score.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              next ? open(next.id) : studyStore.openView('practice')
            }
          >
            {next ? `Continue: ${next.title} →` : 'Revisit your learning →'}
          </button>
        </section>
        <section className="path-panel" aria-labelledby="path-heading">
          <p className="eyebrow">FIVE WAYS THROUGH THE IDEAS</p>
          <h2 id="path-heading">Choose a learning path</h2>
          <PathSelector selected={path} choose={choosePath} />
          <p>
            {path === 'all'
              ? 'Browse every published lesson.'
              : pathDetails[path].description}
          </p>
          {path !== 'all' && (
            <p className="path-preparation">
              {pathTargets[path].length} focus lessons +{' '}
              {pathLessons.length - pathTargets[path].length} preparation
              lessons. Every prerequisite is included in reading order.
            </p>
          )}
          <div className="path-preview">
            {pathLessons
              .filter((lesson) => progress[lesson.id] !== 'complete')
              .slice(0, 4)
              .map((lesson) => (
                <LessonCard key={lesson.id} id={lesson.id} open={open} />
              ))}
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => studyStore.openView('explore')}
          >
            See the complete route ({pathLessons.length} lessons) →
          </button>
        </section>
        <Diagnostic open={open} />
        <div className="overview-stats">
          <div>
            <strong>{lessons.length}</strong>
            <span>published modules</span>
          </div>
          <div>
            <strong>{clusters.length}</strong>
            <span>connected chapters</span>
          </div>
          <div>
            <strong>{labCount}</strong>
            <span>exact integer labs</span>
          </div>
          <div>
            <strong>
              <MathText text={'\\(\\infty\\)'} />
            </strong>
            <span>questions to ask</span>
          </div>
        </div>
        <section className="overview-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A ROUTE THROUGH THE IDEAS</span>
              <h2>Begin with a question.</h2>
            </div>
            <button
              type="button"
              onClick={() => studyStore.openView('explore')}
            >
              All lessons →
            </button>
          </div>
          <div className="featured-grid">
            {['P00', 'D04', 'C04', 'A05', 'Q04', 'U01'].map((id) => (
              <LessonCard key={id} id={id} open={open} />
            ))}
          </div>
        </section>
        <section className="method-band">
          <div>
            <span className="eyebrow">HOW TO USE THIS ATLAS</span>
            <h2>Read. Prove. Test.</h2>
            <p>
              Every lesson has a definition, a complete proof, a worked example,
              a boundary case, and a practice problem with a justified answer.
              The interactive labs compute with exact integers.
            </p>
          </div>
          <div className="method-diagram">
            <span>
              01 <b>Understand</b>
            </span>
            <span>
              02 <b>Try</b>
            </span>
            <span>
              03 <b>Explain</b>
            </span>
          </div>
        </section>
      </div>
    );
  if (view === 'explore')
    return (
      <div className="overview-shell">
        <Heading
          eyebrow="CONNECTIONS AND LESSONS"
          title="Explore the atlas"
          lead="A connected route from divisibility to deeper arithmetic. Open any idea, or follow the prerequisites in each lesson."
        />
        <PathSelector selected={path} choose={choosePath} />
        <p className="path-description">
          {path === 'all'
            ? 'Every published lesson.'
            : pathDetails[path].description}
        </p>
        <ol className="journey-map" aria-label="Chapters in this route">
          {clusters
            .filter((cluster) =>
              pathLessons.some(
                (lesson) =>
                  lesson.cluster === cluster && lessonMatches(filter, lesson),
              ),
            )
            .map((cluster, index) => (
              <li key={cluster}>
                <span aria-hidden="true">{index ? '→' : ''}</span>
                <a href={`#chapter-${clusters.indexOf(cluster)}`}>{cluster}</a>
              </li>
            ))}
        </ol>
        <div className="explore-filter">
          <label htmlFor="atlas-filter">Find a concept</label>
          <input
            id="atlas-filter"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search title, question, or chapter…"
          />
        </div>
        {!pathLessons.some((lesson) => lessonMatches(filter, lesson)) && (
          <p role="status">
            No matching lessons. Try a different word or clear the search.
          </p>
        )}
        {clusters.map((cluster) => {
          const matching = lessons.filter(
            (x) =>
              x.cluster === cluster &&
              pathLessonIds.has(x.id) &&
              lessonMatches(filter, x),
          );
          return matching.length ? (
            <section
              className="chapter"
              id={`chapter-${clusters.indexOf(cluster)}`}
              key={cluster}
            >
              <h2>
                {cluster}
                <span>{String(matching.length).padStart(2, '0')}</span>
              </h2>
              <div className="chapter-grid">
                {matching.map((x) => (
                  <LessonCard key={x.id} id={x.id} open={open} />
                ))}
              </div>
              {chapterCheckpoints[cluster] && (
                <div className="chapter-checkpoint">
                  <span className="callout-label">CHAPTER CHECKPOINT</span>
                  <p>
                    <MathText text={chapterCheckpoints[cluster].prompt} />
                  </p>
                  <button
                    type="button"
                    aria-expanded={shown.includes(`checkpoint:${cluster}`)}
                    onClick={() => toggle(`checkpoint:${cluster}`)}
                  >
                    {shown.includes(`checkpoint:${cluster}`)
                      ? 'Hide reasoning'
                      : 'Compare your reasoning'}
                  </button>
                  {shown.includes(`checkpoint:${cluster}`) && (
                    <p>
                      <MathText text={chapterCheckpoints[cluster].answer} />
                    </p>
                  )}
                  <div>
                    {chapterCheckpoints[cluster].links.map((id) => (
                      <button type="button" key={id} onClick={() => open(id)}>
                        {id} ·{' '}
                        {lessons.find((lesson) => lesson.id === id)?.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : null;
        })}
      </div>
    );
  if (view === 'practice')
    return (
      <div className="overview-shell">
        <Heading
          eyebrow="WORK THE IDEAS"
          title="Practice with purpose"
          lead="Try a problem before revealing the proof. Each answer explains why the method works."
        />
        {catalogFilter}
        <fieldset className="practice-scope">
          <legend>Practice scope</legend>
          <button
            type="button"
            aria-pressed={practiceScope === 'all'}
            onClick={() => setPracticeScope('all')}
          >
            All problems
          </button>
          <button
            type="button"
            aria-pressed={practiceScope === 'review'}
            onClick={() => setPracticeScope('review')}
          >
            Review later (
            {
              Object.values(progress).filter((status) => status === 'review')
                .length
            }
            )
          </button>
        </fieldset>
        <div className="practice-list">
          {!lessons.some(
            (lesson) =>
              matches(lesson) &&
              (practiceScope === 'all' || progress[lesson.id] === 'review'),
          ) && (
            <p role="status">
              No problems in this selection. Clear the search or choose another
              chapter.
            </p>
          )}
          {lessons
            .filter(
              (lesson) =>
                matches(lesson) &&
                (practiceScope === 'all' || progress[lesson.id] === 'review'),
            )
            .map((lesson) => (
              <article className="practice-item" key={lesson.id}>
                <div className="practice-item-head">
                  <span>
                    {lesson.id} · {lesson.cluster}
                  </span>
                  <h2>{lesson.title}</h2>
                </div>
                <p>
                  <MathText text={lesson.practice.prompt} />
                </p>
                <details className="practice-workspace">
                  <summary>Work this problem</summary>
                  <PracticeWorksheet lessonId={lesson.id} />
                </details>
                <OpenButton id={lesson.id} open={open} />
              </article>
            ))}
          {practiceScope === 'review' &&
            !Object.values(progress).includes('review') && (
              <p>
                No lessons marked for review. Use “Review later” in a lesson to
                build your queue.
              </p>
            )}
        </div>
        <ProgressControls />
      </div>
    );
  if (view === 'studio')
    return (
      <div className="overview-shell">
        <Heading
          eyebrow="EXACT EXPERIMENTS"
          title="The studio"
          lead="Change an input, inspect the exact result, then read the proof that explains it. Every instrument links to its full lesson."
        />
        {catalogFilter}
        <div className="chapter-grid">
          {!lessons.some((lesson) => lesson.lab && matches(lesson)) && (
            <p role="status">
              No experiments in this selection. Clear the search or choose
              another chapter.
            </p>
          )}
          {lessons
            .filter((lesson) => lesson.lab && matches(lesson))
            .map((lesson) => (
              <article className="atlas-card studio-card" key={lesson.id}>
                <span>
                  {lesson.id} · {lesson.cluster}
                </span>
                <h2>{lesson.title}</h2>
                <p>
                  <MathText text={lesson.question} />
                </p>
                <button type="button" onClick={() => open(lesson.id, 'lab')}>
                  Open exact lab <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
        </div>
      </div>
    );
  if (view === 'reference')
    return (
      <div className="overview-shell">
        <Heading
          eyebrow="A COMPACT INDEX"
          title="Theorem reference"
          lead="A quick path back to the exact statement and its proof. Conditions matter; open the lesson to see each theorem in context."
        />
        {catalogFilter}
        <div className="reference-list">
          {!lessons.some(matches) && (
            <p role="status">
              No claims in this selection. Clear the search or choose another
              chapter.
            </p>
          )}
          {lessons.filter(matches).map((lesson) => (
            <article key={lesson.id}>
              <span>{lesson.id}</span>
              <div>
                <h2>{lesson.title}</h2>
                <p>
                  <MathText text={lesson.theorem} />
                </p>
                <OpenButton id={lesson.id} open={open} section="theorem" />
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  if (view === 'course')
    return (
      <div className="overview-shell">
        <Heading
          eyebrow="OPTIONAL MH3210 ROUTE"
          title="Course alignment"
          lead="This public route maps original explanations to handout topics. Handout locators describe alignment only; private course material is not reproduced here."
        />
        <div className="course-note">
          <strong>Source status</strong>
          <p>
            Current official handouts 01–07 were identified; later topic
            locators are historical and await current verification. Lesson
            proofs and examples are original to this site.
          </p>
        </div>
        {[
          'MH-H01',
          'MH-H02',
          'MH-H03',
          'MH-H04',
          'MH-H05',
          'MH-H06',
          'MH-H07',
          'MH-H08',
          'MH-H09',
          'MH-H10',
        ].map((handout) => {
          const items = lessons.filter((x) =>
            course.get(x.id)?.includes(handout),
          );
          return items.length ? (
            <section key={handout} className="course-group">
              <h2>
                {handout}
                <span>
                  {['MH-H08', 'MH-H09', 'MH-H10'].includes(handout)
                    ? 'Historical alignment · verify current handout'
                    : 'Current handout topic'}
                </span>
              </h2>
              <div>
                {items.map((x) => (
                  <button type="button" key={x.id} onClick={() => open(x.id)}>
                    <span>{x.id}</span>
                    {x.title}
                    <b>→</b>
                  </button>
                ))}
              </div>
            </section>
          ) : null;
        })}
      </div>
    );
  return null;
}
