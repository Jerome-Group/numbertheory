import { MathText } from './MathText';
import type { ProofSource } from './proof-notebook';

export function ProofNotebookCues({ source }: { source: ProofSource }) {
  return (
    <div className="notebook-cues">
      <details>
        <summary>Conditions to keep in view</summary>
        <ul>
          {source.conditions.map((text) => (
            <li key={text}>
              <MathText text={text} />
            </li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Definitions</summary>
        {source.definitions.map((text) => (
          <p key={text}>
            <MathText text={text} />
          </p>
        ))}
      </details>
      <details>
        <summary>Source strategy</summary>
        <p>
          <MathText text={source.strategy} />
        </p>
      </details>
      <details>
        <summary>Source paragraph cues</summary>
        <p>One possible route. Your argument can take another valid route.</p>
        <ol>
          {source.proof.map((paragraph, index) => (
            <li key={index}>
              <MathText text={paragraph.label} />
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

export function ProofNotebookReference({ source }: { source: ProofSource }) {
  return (
    <div className="notebook-source-proof">
      <h4>Authored proof</h4>
      <p>
        Compare the assumptions, logical steps, and conclusion. A different
        argument may also be valid.
      </p>
      <ol>
        {source.proof.map((paragraph, index) => (
          <li key={index}>
            <h5>
              <MathText text={paragraph.label} />
            </h5>
            <p className="notebook-proof-paragraph">
              <MathText text={paragraph.text} />
            </p>
            <details className="proof-note">
              <summary>Why this step works</summary>
              <p>
                <MathText text={paragraph.reason} />
              </p>
            </details>
          </li>
        ))}
      </ol>
      <div className="notebook-boundary">
        <h5>Check the boundary</h5>
        <p>
          <MathText text={source.boundary} />
        </p>
      </div>
      <p className="notebook-source-note">
        <MathText text={source.sourceNote} />
      </p>
    </div>
  );
}
