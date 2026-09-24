import { useState, useSyncExternalStore } from 'react';
import { lessons } from './content/lessons';
import type { Claim, Exercise } from './content/lesson-v2';
import { MathText } from './MathText';
import { progressStore } from './progress';

export function Practice({
  lessonId,
  claim,
  exercise,
}: {
  lessonId: string;
  claim: Claim;
  exercise: Exercise;
}) {
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
            <MathText text={claim.statement} />
          </p>
        )}
      </div>
      <p>
        <MathText text={exercise.prompt} />
      </p>
      <div className="practice-actions">
        {level < exercise.hints.length && (
          <button type="button" onClick={() => setLevel(level + 1)}>
            Show hint {level + 1}
          </button>
        )}
        <button
          type="button"
          onClick={() => setLevel(exercise.hints.length + 1)}
        >
          Show justified answer
        </button>
      </div>
      {exercise.hints.slice(0, level).map((text, i) => (
        <p className="hint" key={i}>
          <strong>Hint {i + 1}.</strong> <MathText text={text} />
        </p>
      ))}
      {level > exercise.hints.length && (
        <p className="answer">
          <strong>Answer.</strong> <MathText text={exercise.answer} />
        </p>
      )}
      <fieldset className="progress-actions">
        <legend>Local lesson progress</legend>
        <button
          type="button"
          aria-pressed={progress[lessonId] === 'complete'}
          onClick={() => progressStore.set(lessonId, 'complete')}
        >
          Mark understood
        </button>
        <button
          type="button"
          aria-pressed={progress[lessonId] === 'review'}
          onClick={() => progressStore.set(lessonId, 'review')}
        >
          Review later
        </button>
        {progress[lessonId] && (
          <button
            type="button"
            onClick={() => progressStore.set(lessonId, null)}
          >
            Clear mark
          </button>
        )}
        <span role="status">
          {progress[lessonId] === 'complete'
            ? 'Marked understood on this device.'
            : progress[lessonId] === 'review'
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
