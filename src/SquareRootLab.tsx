import { useEffect, useState, useSyncExternalStore } from 'react';
import { MathText } from './MathText';
import { studyStore } from './state';

export function SquareRootLab() {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [modulus, setModulus] = useState(state.squareM);
  const [target, setTarget] = useState(state.squareA);
  const [prediction, setPrediction] = useState<'yes' | 'no' | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setModulus(state.squareM);
    setTarget(state.squareA);
  }, [state.squareM, state.squareA]);

  function run(m: string, a: string) {
    try {
      studyStore.setLocalSquares(m, a);
      setError('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Invalid input.');
    }
  }

  const result = state.squareResult;
  return (
    <section
      id="lab"
      className="square-root-lab"
      aria-labelledby="square-root-title"
    >
      <p className="eyebrow">EXACT EXPERIMENT · X05</p>
      <h2 id="square-root-title">Can local roots assemble?</h2>
      <p>
        Predict solvability, inspect each prime power, then reconstruct every
        global root.
      </p>
      <fieldset className="prediction-row">
        <legend>Predict</legend>
        <button
          type="button"
          aria-pressed={prediction === 'yes'}
          onClick={() => setPrediction('yes')}
        >
          There is a root
        </button>
        <button
          type="button"
          aria-pressed={prediction === 'no'}
          onClick={() => setPrediction('no')}
        >
          There is an obstruction
        </button>
      </fieldset>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          run(modulus, target);
        }}
      >
        <label>
          Modulus <MathText text={'\\(m\\)'} />
          <input
            aria-label="Modulus m"
            inputMode="numeric"
            value={modulus}
            onChange={(event) => setModulus(event.target.value)}
          />
        </label>
        <label>
          Target <MathText text={'\\(a\\)'} />
          <input
            aria-label="Target a"
            inputMode="numeric"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </label>
        <button type="submit">Find exact roots</button>
      </form>
      <fieldset className="square-presets">
        <legend>Example congruences</legend>
        <button
          type="button"
          aria-label="x squared congruent to 1 modulo 72"
          onClick={() => run('72', '1')}
        >
          <MathText text={'\\(x^2\\equiv1\\pmod{72}\\)'} />
        </button>
        <button
          type="button"
          aria-label="x squared congruent to 12 modulo 32"
          onClick={() => run('32', '12')}
        >
          <MathText text={'\\(x^2\\equiv12\\pmod{32}\\)'} />
        </button>
        <button
          type="button"
          aria-label="x squared congruent to 0 modulo 16"
          onClick={() => run('16', '0')}
        >
          <MathText text={'\\(x^2\\equiv0\\pmod{16}\\)'} />
        </button>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div aria-live="polite" className="square-result">
          {prediction && (
            <p>
              {result.roots.length > 0 === (prediction === 'yes')
                ? 'Your prediction matches the local conditions.'
                : 'The local conditions overturn that prediction.'}
            </p>
          )}
          <div className="square-local-grid">
            {result.local.map((item) => (
              <div className="square-local-card" key={item.modulus}>
                <h3
                  aria-label={`Local modulus ${item.prime} to the power ${item.exponent}`}
                >
                  <MathText
                    text={`\\(\\bmod ${item.prime}^{${item.exponent}}\\)`}
                  />
                </h3>
                <p>{item.condition}</p>
                <p>
                  <strong>Roots:</strong>{' '}
                  <MathText
                    text={`\\(${item.roots.length ? item.roots.join(',\\;') : '\\varnothing'}\\)`}
                  />
                </p>
              </div>
            ))}
          </div>
          {result.obstruction ? (
            <p role="status">{result.obstruction}</p>
          ) : (
            <p>
              <MathText
                text={`The complete global root set for \\(x^2\\equiv ${result.target}\\pmod{${result.modulus}}\\) is \\(\\{${result.roots.join(',\\;')}\\}\\).`}
              />
            </p>
          )}
        </div>
      )}
      <p className="lab-boundary">
        These bounded exact computations display all roots for the selected
        modulus. The prime-power criteria and CRT proof below establish the
        general result.
      </p>
    </section>
  );
}
