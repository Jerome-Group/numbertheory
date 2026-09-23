import { useEffect, useState, useSyncExternalStore } from 'react';
import { EuclidTiling } from './EuclidTiling';
import { MathText } from './MathText';
import { studyStore } from './state';

export function EuclidLab() {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [a, setA] = useState(state.a),
    [b, setB] = useState(state.b),
    [error, setError] = useState('');
  useEffect(() => {
    setA(state.a);
    setB(state.b);
  }, [state.a, state.b]);
  function run(e: React.FormEvent) {
    e.preventDefault();
    try {
      studyStore.setEuclidInputs(a.trim(), b.trim());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid input.');
    }
  }
  return (
    <section id="lab" className="content-section lab">
      <div className="lab-head">
        <div>
          <span className="callout-label">EXPERIMENT 01</span>
          <h2>Euclid, step by step</h2>
        </div>
        <span className="lab-badge">EXACT INTEGER TRACE</span>
      </div>
      <p>
        Change the inputs. The trace begins with the absolute values of the
        inputs. Each row keeps the gcd unchanged while the positive divisor
        decreases.
      </p>
      <form className="lab-controls" onSubmit={run}>
        <label>
          First integer
          <input
            inputMode="numeric"
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
        </label>
        <label>
          Second integer
          <input
            inputMode="numeric"
            value={b}
            onChange={(e) => setB(e.target.value)}
          />
        </label>
        <button type="submit">Run Euclid</button>
      </form>
      {error && (
        <p className="input-error" role="alert">
          {error}
        </p>
      )}
      {state.result && (
        <div className="lab-output" aria-live="polite">
          <div className="answer-strip">
            <span>GREATEST COMMON DIVISOR</span>
            <strong>
              <MathText
                text={`\\(\\gcd(${state.result.a},${state.result.b})=${state.result.gcd}\\)`}
              />
            </strong>
            <small>
              <MathText
                text={`\\(${state.result.gcd}=${state.result.x}(${state.result.a})+${state.result.y}(${state.result.b})\\)`}
              />
            </small>
          </div>
          <EuclidTiling
            key={`${state.result.a}-${state.result.b}`}
            result={state.result}
          />
          <div className="trace-wrap">
            <table>
              <caption>Exact division trace</caption>
              <thead>
                <tr>
                  <th>Dividend</th>
                  <th>Divisor</th>
                  <th>Quotient</th>
                  <th>Remainder</th>
                </tr>
              </thead>
              <tbody>
                {state.result.steps.map((s, i) => (
                  <tr key={i}>
                    <td>
                      <MathText text={`\\(${s.dividend}\\)`} />
                    </td>
                    <td>
                      <MathText text={`\\(${s.divisor}\\)`} />
                    </td>
                    <td>
                      <MathText text={`\\(${s.quotient}\\)`} />
                    </td>
                    <td>
                      <MathText text={`\\(${s.remainder}\\)`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {state.result.steps.length === 0 && (
              <p>
                One input is zero; the nonzero absolute value is already the
                gcd.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
