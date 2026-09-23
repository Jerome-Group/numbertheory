import { useState } from 'react';
import type { EuclidResult } from './math/euclid';
import { MathText } from './MathText';

export function EuclidTiling({ result }: { result: EuclidResult }) {
  const [index, setIndex] = useState(0);
  if (result.steps.length === 0) return null;
  const step = result.steps[Math.min(index, result.steps.length - 1)];
  const quotient = BigInt(step.quotient);
  const exactScale = quotient <= 8n;
  const divisor = Number(step.divisor);
  const remainder = Number(step.remainder);
  const tileCount = exactScale ? Number(quotient) : 1;
  const tileWidth = exactScale ? 70 : 620;
  const remainderWidth = exactScale ? (70 * remainder) / divisor : 100;
  const canvasWidth = exactScale
    ? Math.max(70, tileCount * tileWidth + remainderWidth)
    : 720;

  return (
    <div className="euclid-tiling">
      <div className="tiling-heading">
        <strong>
          Square tiling · step {index + 1} of {result.steps.length}
        </strong>
        <div className="tiling-controls">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={index === result.steps.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            Next step
          </button>
        </div>
      </div>
      <p>
        <MathText
          text={`\\(${step.dividend}=${step.quotient}\\cdot${step.divisor}+${step.remainder}\\)`}
        />
        . Each whole tile has side length{' '}
        <MathText text={`\\(${step.divisor}\\)`} />; the last strip has width{' '}
        <MathText text={`\\(${step.remainder}\\)`} />.
      </p>
      <svg
        viewBox={`0 0 ${canvasWidth} 90`}
        role="img"
        aria-label={`Division tiling for ${step.dividend} equals ${step.quotient} times ${step.divisor} plus ${step.remainder}`}
      >
        <title>Division as square tiles and a remainder strip</title>
        {Array.from({ length: tileCount }, (_, tile) => (
          <rect
            key={tile}
            x={tile * tileWidth}
            y="8"
            width={Math.max(tileWidth - 2, 0)}
            height="70"
            rx="3"
            className="tiling-square"
          />
        ))}
        {remainder > 0 && (
          <rect
            x={tileCount * tileWidth}
            y="8"
            width={Math.max(remainderWidth - 2, 0)}
            height="70"
            rx="3"
            className="tiling-remainder"
          />
        )}
      </svg>
      {!exactScale && (
        <p className="tiling-note">
          Diagram schematic: <MathText text={`\\(${step.quotient}\\)`} /> whole
          tiles are compressed into one block. The equation and table give exact
          sizes.
        </p>
      )}
      <p className="tiling-invariant">
        Predict the next divisor. Every common divisor of the dividend and
        divisor also divides their remainder, and conversely.
      </p>
    </div>
  );
}
