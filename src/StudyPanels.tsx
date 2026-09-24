import { useState, useSyncExternalStore } from 'react';
import { lessons } from './content/lessons';
import type { Lesson } from './content/types';
import { MathText } from './MathText';
import { progressStore } from './progress';

export function Practice({ lesson }: { lesson: Lesson }) {
  const [level, setLevel] = useState(0);
  const [recalled, setRecalled] = useState(false);
  const progress = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
  );
  return (
    <section id="practice" className="content-section practice">
      <span className="callout-label">YOUR TURN</span>
      <h2>Test the idea</h2>
      <div className="retrieval-prompt">
        <p>
          Before re-reading, recall the claim and its conditions in your own
          words.
        </p>
        <button
          type="button"
          aria-expanded={recalled}
          onClick={() => setRecalled(!recalled)}
        >
          {recalled ? 'Hide claim' : 'Check the claim'}
        </button>
        {recalled && (
          <p>
            <MathText text={lesson.theorem} />
          </p>
        )}
      </div>
      <p>
        <MathText text={lesson.practice.prompt} />
      </p>
      <div className="practice-actions">
        {level < lesson.practice.hints.length && (
          <button type="button" onClick={() => setLevel(level + 1)}>
            Show hint {level + 1}
          </button>
        )}
        <button
          type="button"
          onClick={() => setLevel(lesson.practice.hints.length + 1)}
        >
          Show justified answer
        </button>
      </div>
      {lesson.practice.hints.slice(0, level).map((text, i) => (
        <p className="hint" key={i}>
          <strong>Hint {i + 1}.</strong> <MathText text={text} />
        </p>
      ))}
      {level > lesson.practice.hints.length && (
        <p className="answer">
          <strong>Answer.</strong> <MathText text={lesson.practice.answer} />
        </p>
      )}
      <fieldset className="progress-actions">
        <legend>Local lesson progress</legend>
        <button
          type="button"
          aria-pressed={progress[lesson.id] === 'complete'}
          onClick={() => progressStore.set(lesson.id, 'complete')}
        >
          Mark understood
        </button>
        <button
          type="button"
          aria-pressed={progress[lesson.id] === 'review'}
          onClick={() => progressStore.set(lesson.id, 'review')}
        >
          Review later
        </button>
        {progress[lesson.id] && (
          <button
            type="button"
            onClick={() => progressStore.set(lesson.id, null)}
          >
            Clear mark
          </button>
        )}
        <span role="status">
          {progress[lesson.id] === 'complete'
            ? 'Marked understood on this device.'
            : progress[lesson.id] === 'review'
              ? 'Added to review on this device.'
              : 'Progress stays in this browser.'}
        </span>
      </fieldset>
    </section>
  );
}
export function NextLesson({
  id,
  onSelect,
}: {
  id: string;
  onSelect: (id: string) => void;
}) {
  const index = lessons.findIndex((x) => x.id === id),
    next = lessons[index + 1];
  return next ? (
    <button
      type="button"
      className="next-lesson"
      onClick={() => onSelect(next.id)}
    >
      <span>CONTINUE READING</span>
      <strong>{next.title} →</strong>
    </button>
  ) : null;
}
