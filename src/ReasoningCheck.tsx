import { useState } from 'react';
import { teachingFor } from './content/teaching';
import { MathText } from './MathText';

export function ReasoningCheck({ id }: { id: string }) {
  const { check } = teachingFor(id);
  const offset =
    [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    check.choices.length;
  const choices = [
    ...check.choices.slice(offset),
    ...check.choices.slice(0, offset),
  ];
  const [choice, setChoice] = useState<number | null>(null);
  return (
    <section className="reasoning-check" aria-labelledby={`reasoning-${id}`}>
      <span className="callout-label">CHECK THE REASONING</span>
      <h3 id={`reasoning-${id}`}>
        <MathText text={check.prompt} />
      </h3>
      <fieldset>
        <legend>Choose an explanation</legend>
        {choices.map((item, index) => (
          <button
            type="button"
            key={item.text}
            aria-label={item.label ?? item.text}
            aria-pressed={choice === index}
            onClick={() => setChoice(index)}
          >
            <span aria-hidden="true">{String.fromCharCode(65 + index)}</span>
            <MathText text={item.text} />
          </button>
        ))}
      </fieldset>
      {choice !== null && (
        <p
          role="status"
          className={choices[choice].correct ? 'check-correct' : 'check-retry'}
        >
          <strong>
            {choices[choice].correct ? 'Yes. ' : 'Try another explanation. '}
          </strong>
          <MathText text={choices[choice].feedback} />
        </p>
      )}
    </section>
  );
}
