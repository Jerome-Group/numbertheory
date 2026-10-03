import { useRef, useState, useSyncExternalStore } from 'react';
import type { Claim, Exercise } from './content/lesson-v2';
import { lessons } from './content/lessons';
import { lessonsForPath, pathDetails, selectedPath } from './content/paths';
import { MathText } from './MathText';
import { progressStore } from './progress';

export function Practice({
  lessonId,
  claim,
  exercise,
  embedded = false,
}: {
  lessonId: string;
  claim: Claim;
  exercise: Exercise;
  embedded?: boolean;
}) {
  const [level, setLevel] = useState(0);
  const [recalled, setRecalled] = useState(false);
  const answerButton = useRef<HTMLButtonElement>(null);
  const progress = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
  );
  return (
    <section
      id={embedded ? `practice-${lessonId}` : 'practice'}
      className="content-section practice"
    >
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
          <button
            type="button"
            onClick={(event) => {
              if (
                level + 1 === exercise.hints.length &&
                document.activeElement === event.currentTarget
              ) {
                answerButton.current?.focus({ preventScroll: true });
              }
              setLevel(level + 1);
            }}
          >
            Show hint {level + 1}
          </button>
        )}
        <button
          ref={answerButton}
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
          {progressStore.getStorageStatus() === 'session'
            ? 'Storage unavailable: marks last for this session. Export a backup to keep them.'
            : progress[lessonId] === 'complete'
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
  const path = selectedPath();
  const route = path === 'all' ? lessons : lessonsForPath(path);
  const inPath = route.some((lesson) => lesson.id === id);
  const sequence = inPath ? route : lessons;
  const index = sequence.findIndex((x) => x.id === id);
  const next = sequence[index + 1],
    previous = sequence[index - 1];
  return (
    <div className="lesson-pagination">
      {previous && (
        <button
          type="button"
          className="previous-lesson"
          onClick={() => onSelect(previous.id)}
        >
          ← {previous.title}
        </button>
      )}
      {next ? (
        <button
          type="button"
          className="next-lesson"
          onClick={() => onSelect(next.id)}
        >
          <span>
            {inPath && path !== 'all'
              ? `CONTINUE ${pathDetails[path].title}`
              : 'CONTINUE READING'}
          </span>
          <strong>{next.title} →</strong>
        </button>
      ) : (
        <p className="path-finish">
          You reached the end of this route. Revisit your reasoning and marked
          lessons in Practice.
        </p>
      )}
    </div>
  );
}
