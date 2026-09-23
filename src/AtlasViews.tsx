import { useState } from 'react';
import courseMap from './content/course-map.json';
import { lessons } from './content/lessons';
import { MathText } from './MathText';
import { type AtlasView, studyStore } from './state';

const clusters = [...new Set(lessons.map((lesson) => lesson.cluster))];
const labCount = new Set(lessons.map((lesson) => lesson.lab).filter(Boolean))
  .size;
const course = new Map(courseMap.map((row) => [row.id, row.handouts]));

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
              Follow the
              <br />
              <em>integer thread.</em>
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
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="orbit orbit-three" />
            <div className="orbit-center">
              <MathText text={'\\(\\mathbb Z\\)'} />
            </div>
            <span className="orbit-label orbit-a">divisibility</span>
            <span className="orbit-label orbit-b">congruence</span>
            <span className="orbit-label orbit-c">proof</span>
          </div>
        </section>
        <div className="overview-stats">
          <div>
            <strong>{lessons.length}</strong>
            <span>complete lessons</span>
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
