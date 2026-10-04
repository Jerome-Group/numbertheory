import type { Claim } from './content/lesson-v2';
import { teachingFor } from './content/teaching';
import { MathText } from './MathText';
import { ReasoningCheck } from './ReasoningCheck';

export function AnnotatedProof({ claim }: { claim: Claim }) {
  const teaching = teachingFor(claim.lessonId);
  return (
    <section id="proof" className="content-section proof-workshop">
      <div className="section-heading">
        <h2>The argument</h2>
        <span className="reading-label">COMPLETE PROOF</span>
      </div>
      <div className="proof-strategy">
        <span className="callout-label">THE PLAN</span>
        <p>
          <MathText text={teaching.strategy} />
        </p>
      </div>
      <ol className="proof-steps">
        {claim.proof.map((text, step) => {
          const annotation = teaching.proofSteps[step];
          if (!annotation)
            throw new Error(
              `Missing proof annotation ${claim.lessonId}.${step}`,
            );
          return (
            <li key={`${claim.id}.${step}`}>
              <h3>
                <span aria-hidden="true">
                  {String(step + 1).padStart(2, '0')}
                </span>
                {annotation.label}
              </h3>
              <p>
                <MathText text={text} />
              </p>
              <details className="proof-note">
                <summary>Why this step works</summary>
                <p>
                  <MathText text={annotation.reason} />
                </p>
              </details>
            </li>
          );
        })}
      </ol>
      <ReasoningCheck id={claim.lessonId} />
    </section>
  );
}
