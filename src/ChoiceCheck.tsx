import { useState } from 'react';
import experiences from './content/experiences.json';
import { MathText } from './MathText';

type ChoiceId = 'P00' | 'Q04' | 'R07';

export function ChoiceCheck({ id }: { id: ChoiceId }) {
  const content = experiences[id];
  const [choice, setChoice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const titleId = `choice-${id.toLowerCase()}`;
  return (
    <section className="proof-repair content-section" aria-labelledby={titleId}>
      <span className="callout-label">{content.eyebrow}</span>
      <h2 id={titleId}>{content.title}</h2>
      <p>
        <MathText text={content.prompt} />
      </p>
      <fieldset>
        <legend>{content.legend}</legend>
        {content.choices.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={choice === item.id}
            onClick={() => setChoice(item.id)}
          >
            <MathText text={item.label} />
          </button>
        ))}
      </fieldset>
      {choice && (
        <p role="status">
          {choice === content.correct
            ? content.correctFeedback
            : content.wrongFeedback}
        </p>
      )}
      <button
        type="button"
        aria-expanded={revealed}
        onClick={() => setRevealed(!revealed)}
      >
        {revealed ? 'Hide reasoning' : content.revealLabel}
      </button>
      {revealed && (
        <p>
          <MathText text={content.reveal} />
        </p>
      )}
    </section>
  );
}
