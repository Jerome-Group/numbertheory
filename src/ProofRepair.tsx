import { useState } from 'react';
import { MathText } from './MathText';

const choices = [
  { id: 'sample', label: 'The table checks only a finite sample.' },
  { id: 'base', label: 'The base case was not checked.' },
  { id: 'algebra', label: 'The expression was simplified incorrectly.' },
] as const;

export function ProofRepair() {
  const [choice, setChoice] = useState<string | null>(null);
  const [showRepair, setShowRepair] = useState(false);
  return (
    <section
      className="proof-repair content-section"
      aria-labelledby="proof-repair-title"
    >
      <span className="callout-label">PROOF REPAIR · P00</span>
      <h2 id="proof-repair-title">Find the missing bridge</h2>
      <p>
        <MathText
          text={
            'A draft says: “\\(n^2+n+41\\) is prime for the first ten nonnegative integers, so it is prime for every \\(n\\ge0\\).”'
          }
        />
      </p>
      <fieldset>
        <legend>Which step fails?</legend>
        {choices.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={choice === item.id}
            onClick={() => setChoice(item.id)}
          >
            {item.label}
          </button>
        ))}
      </fieldset>
      {choice && (
        <p role="status">
          {choice === 'sample'
            ? 'Correct. The examples do not cover every allowed integer.'
            : 'Look at the move from checked cases to every integer.'}
        </p>
      )}
      <button
        type="button"
        aria-expanded={showRepair}
        onClick={() => setShowRepair(!showRepair)}
      >
        {showRepair ? 'Hide repair' : 'Show a decisive counterexample'}
      </button>
      {showRepair && (
        <p>
          <MathText
            text={
              'At \\(n=41\\), \\(n^2+n+41=41(41+2)\\), which is composite. One counterexample refutes the universal claim. A valid proof of a true universal claim would need an argument covering every allowed input.'
            }
          />
        </p>
      )}
    </section>
  );
}
