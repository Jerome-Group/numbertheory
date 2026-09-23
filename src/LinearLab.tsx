import { useEffect, useState, useSyncExternalStore } from 'react';
import { MathText } from './MathText';
import { studyStore } from './state';

export function LinearLab() {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [a, setA] = useState(state.la),
    [b, setB] = useState(state.lb),
    [n, setN] = useState(state.ln),
    [error, setError] = useState('');
  useEffect(() => {
    setA(state.la);
    setB(state.lb);
    setN(state.ln);
  }, [state.la, state.lb, state.ln]);
  function run(e: React.FormEvent) {
    e.preventDefault();
    try {
      studyStore.setLinearInputs(a.trim(), b.trim(), n.trim());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid input.');
    }
  }
  const result = state.linear;
  return (
    <section id="lab" className="content-section lab">
      <div className="lab-head">
        <div>
          <span className="callout-label">EXPERIMENT 03</span>
          <h2>Find the fibres</h2>
        </div>
        <span className="lab-badge">EXACT CONGRUENCE SOLVER</span>
      </div>
      <p>
        Predict whether the target belongs to the image of multiplication. The
        gcd decides solvability and the number of residue classes.
      </p>
      <form className="lab-controls" onSubmit={run}>
        <label>
          Coefficient
          <input
            inputMode="numeric"
            value={a}
            onChange={(e) => setA(e.target.value)}
          />
        </label>
        <label>
          Target
          <input
            inputMode="numeric"
            value={b}
            onChange={(e) => setB(e.target.value)}
          />
        </label>
        <label>
          Modulus
          <input
            inputMode="numeric"
            value={n}
            onChange={(e) => setN(e.target.value)}
          />
        </label>
        <button type="submit">Solve congruence</button>
      </form>
      {error && (
        <p className="input-error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="answer-strip" aria-live="polite">
          <span>{result.solvable ? 'SOLVABLE FIBRE' : 'NO SOLUTION'}</span>
          <strong>
            <MathText
              text={`\\(${result.count}\\text{ solution${result.count === '1' ? '' : 's'} modulo }${result.n}\\)`}
            />
          </strong>
          <small>
            <MathText
              text={`\\(\\gcd(${result.a},${result.n})=${result.gcd}\\). ${result.reason}`}
            />
          </small>
          {result.solvable && (
            <small>
              <MathText
                text={`\\(x=${result.base}+k\\cdot${result.step}\\pmod{${result.n}}\\)`}
              />
              .{' '}
              {result.sample.length < Number(result.count)
                ? 'First twelve representatives:'
                : 'Representatives:'}{' '}
              <MathText text={`\\(${result.sample.join(',\\;')}\\)`} />
            </small>
          )}
        </div>
      )}
    </section>
  );
}
