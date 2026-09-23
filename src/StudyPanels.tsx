import { useState } from 'react';
import { lessons } from './content/lessons';
import type { Lesson } from './content/types';
import { MathText } from './MathText';

export function Practice({ lesson }: { lesson: Lesson }) {
  const [level, setLevel] = useState(0);
  return (
    <section id="practice" className="content-section practice">
      <span className="callout-label">YOUR TURN</span>
      <h2>Test the idea</h2>
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
