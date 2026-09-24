import { useEffect, useState, useSyncExternalStore } from 'react';
import { MathText } from './MathText';
import { studyStore } from './state';

function complex(re: string, im: string): string {
  return `${re}${im.startsWith('-') ? '' : '+'}${im}i`;
}

export function GaussianLab() {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [a, setA] = useState(state.ga);
  const [b, setB] = useState(state.gb);
  const [c, setC] = useState(state.gc);
  const [d, setD] = useState(state.gd);
  const [error, setError] = useState('');
  useEffect(() => {
    setA(state.ga);
    setB(state.gb);
    setC(state.gc);
    setD(state.gd);
  }, [state.ga, state.gb, state.gc, state.gd]);
  const result = state.gaussian;
  function run() {
    try {
      studyStore.setGaussianDivision(a, b, c, d);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Invalid input.');
    }
  }
  return (
    <section
      id="gaussian-lab"
      className="gaussian-lab"
      aria-labelledby="gaussian-lab-title"
    >
      <span className="instrument-kicker">EXACT EXPERIMENT · N04</span>
      <h2 id="gaussian-lab-title">Find a smaller remainder</h2>
      <p>
        Predict a nearby integer lattice point for the quotient, then compare
        its exact remainder norm with the divisor norm.
      </p>
      <div className="gaussian-fields">
        {(
          [
            ['Real part of dividend', a, setA],
            ['Imaginary part of dividend', b, setB],
            ['Real part of divisor', c, setC],
            ['Imaginary part of divisor', d, setD],
          ] as const
        ).map(([label, value, setter]) => (
          <label key={label}>
            {label}
            <input
              inputMode="numeric"
              value={value}
              onChange={(event) => setter(event.target.value)}
            />
          </label>
        ))}
        <button type="button" onClick={run}>
          Divide exactly
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div className="gaussian-certificate">
          <p>
            <MathText
              text={`\\(\\frac{\\alpha}{\\beta}=\\frac{${complex(result.rationalQuotient.reNumerator, result.rationalQuotient.imNumerator)}}{${result.denominator}}\\)`}
            />
          </p>
          <p>
            <MathText
              text={`\\(q=${complex(result.quotient.re, result.quotient.im)},\\quad r=${complex(result.remainder.re, result.remainder.im)}\\)`}
            />
          </p>
          <p>
            <MathText
              text={`\\(N(r)=${result.remainderNorm}<N(\\beta)=${result.divisorNorm}\\)`}
            />
          </p>
          <details>
            <summary>Read the exact certificate</summary>
            <p>
              <MathText
                text={`\\(${complex(result.alpha.re, result.alpha.im)}=(${complex(result.quotient.re, result.quotient.im)})(${complex(result.beta.re, result.beta.im)})+(${complex(result.remainder.re, result.remainder.im)})\\)`}
              />
            </p>
          </details>
        </div>
      )}
      <p className="lab-limit">
        This certificate checks the selected inputs. The nearest-point
        inequality in the proof establishes division for every nonzero Gaussian
        divisor. Coordinates are bounded to keep the experiment readable.
      </p>
    </section>
  );
}
