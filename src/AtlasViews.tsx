import { useState } from 'react';
import courseMap from './content/course-map.json';
import { lessons } from './content/lessons';
import {
  lessonsForPath,
  pathDetails,
  pathIds,
  type PathId,
} from './content/paths';
import { buildCancellationMap } from './math/cancellation';
import { MathText } from './MathText';
import { type AtlasView, studyStore } from './state';

const clusters = [...new Set(lessons.map((lesson) => lesson.cluster))];
const labCount = new Set(lessons.map((lesson) => lesson.lab).filter(Boolean))
  .size;
const course = new Map(courseMap.map((row) => [row.id, row.handouts]));

function initialPath(): PathId | 'all' {
  try {
    const value = localStorage.getItem('numbertheory.path.v1');
    return value && pathIds.includes(value as PathId)
      ? (value as PathId)
      : 'all';
  } catch {
    return 'all';
  }
}
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
      <h1>{title}</h1>
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
function OpenButton({ id, open }: { id: string; open: (id: string) => void }) {
  return (
    <button type="button" className="text-link" onClick={() => open(id)}>
      Open lesson <span aria-hidden="true">→</span>
    </button>
  );
}
export function AtlasViews({
  view,
  open,
}: {
  view: AtlasView;
  open: (id: string) => void;
}) {
  const [filter, setFilter] = useState('');
  const [path, setPath] = useState<PathId | 'all'>(initialPath);
  const pathLessons = path === 'all' ? lessons : lessonsForPath(path);
  const pathLessonIds = new Set(pathLessons.map((lesson) => lesson.id));
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
            <h1>
              What does multiplication <em>forget?</em>
            </h1>
            <p>
              Start with proof. Reach primes, congruences, quadratic
              reciprocity, Pell equations, and beyond—one complete argument at a
              time.
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
        <section className="path-panel" aria-labelledby="path-heading">
          <p className="eyebrow">FIVE WAYS THROUGH THE IDEAS</p>
          <h2 id="path-heading">Choose a learning path</h2>
          <PathSelector selected={path} choose={choosePath} />
          <p>
            {path === 'all'
              ? 'Browse every published lesson.'
              : pathDetails[path].description}
          </p>
          <div className="path-preview">
            {pathLessons.slice(0, 5).map((lesson) => (
              <LessonCard key={lesson.id} id={lesson.id} open={open} />
            ))}
          </div>
        </section>
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
          eyebrow="THE CONCEPT MAP"
          title="Explore the atlas"
          lead="A connected route from divisibility to deeper arithmetic. Open any idea, or follow the prerequisites in each lesson."
        />
        <PathSelector selected={path} choose={choosePath} />
        <p className="path-description">
          {path === 'all'
            ? 'Every published lesson.'
            : pathDetails[path].description}
        </p>
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
        {clusters.map((cluster) => {
          const matching = lessons.filter(
            (x) =>
              x.cluster === cluster &&
              pathLessonIds.has(x.id) &&
              `${x.id} ${x.title} ${x.question}`
                .toLowerCase()
                .includes(filter.toLowerCase()),
          );
          return matching.length ? (
            <section className="chapter" key={cluster}>
              <h2>
                {cluster}
                <span>{String(matching.length).padStart(2, '0')}</span>
              </h2>
              <div className="chapter-grid">
                {matching.map((x) => (
                  <LessonCard key={x.id} id={x.id} open={open} />
                ))}
              </div>
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
        <div className="practice-list">
          {lessons.map((lesson) => (
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
              <div className="practice-item-actions">
                <button
                  type="button"
                  onClick={() => toggle(lesson.id)}
                  aria-expanded={shown.includes(lesson.id)}
                >
                  {shown.includes(lesson.id) ? 'Hide answer' : 'Reveal answer'}
                </button>
                <OpenButton id={lesson.id} open={open} />
              </div>
              {shown.includes(lesson.id) && (
                <div className="practice-reveal">
                  <strong>Justified answer</strong>
                  <p>
                    <MathText text={lesson.practice.answer} />
                  </p>
                </div>
              )}
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
        <div className="reference-list">
          {lessons.map((lesson) => (
            <article key={lesson.id}>
              <span>{lesson.id}</span>
              <div>
                <h2>{lesson.title}</h2>
                <p>
                  <MathText text={lesson.theorem} />
                </p>
                <OpenButton id={lesson.id} open={open} />
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
                  {handout >= 'MH-H08'
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
