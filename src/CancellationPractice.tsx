import { useState } from 'react';
import { MathText } from './MathText';
import experiences from './content/experiences.json';

const content = experiences.C02;
const stages = content.stages;

export function CancellationPractice() {
  const [stage, setStage] = useState(0);
  const [response, setResponse] = useState('');
  const [hint, setHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const item = stages[stage];
  function next() {
    setStage((current) => Math.min(current + 1, stages.length - 1));
    setResponse('');
    setHint(false);
    setRevealed(false);
  }
  return (
    <section
      id="practice-ladder"
      className="cancellation-practice content-section"
      aria-labelledby="cancellation-practice-title"
    >
      <span className="callout-label">{content.eyebrow}</span>
      <h2 id="cancellation-practice-title">{content.title}</h2>
      <p>
        Stage {stage + 1} of {stages.length}: {item.kind}
      </p>
      <p>
        <MathText text={item.prompt} />
      </p>
      <label htmlFor="cancellation-response">
        Work it out before revealing the reasoning
      </label>
      <textarea
        id="cancellation-response"
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        rows={3}
      />
      <div className="practice-actions">
        {!hint && (
          <button type="button" onClick={() => setHint(true)}>
            Show a hint
          </button>
        )}
        <button type="button" onClick={() => setRevealed(true)}>
          Compare reasoning
        </button>
      </div>
      {hint && (
        <p className="hint">
          <MathText text={item.hint} />
        </p>
      )}
      {revealed && (
        <div className="practice-reveal">
          <strong>Reasoning</strong>
          <p>
            <MathText text={item.answer} />
          </p>
        </div>
      )}
      {revealed && stage < stages.length - 1 && (
        <button type="button" onClick={next}>
          Next challenge →
        </button>
      )}
      {revealed && stage === stages.length - 1 && <p>{content.outro}</p>}
      <p className="lab-boundary">
        Your draft stays in this page only. Compare the mathematical conditions;
        a free-text answer is not automatically graded.
      </p>
    </section>
  );
}
