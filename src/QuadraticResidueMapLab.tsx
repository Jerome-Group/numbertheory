import { useEffect, useState, useSyncExternalStore } from 'react';
import { MathText } from './MathText';
import { buildQuadraticResidueMap } from './math/residue';
import { pointOnResidueCircle as at } from './ResidueDiagram';
import { studyStore } from './state';
import './ResidueLabs.css';

export function QuadraticResidueMapLab({ id = 'lab' }: { id?: string }) {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [prime, setPrime] = useState(state.qp);
  const [target, setTarget] = useState(state.qt);
  const result = state.quadratic ?? buildQuadraticResidueMap('7', '2');
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setPrime(state.qp);
    setTarget(state.qt);
    setRevealed(false);
  }, [state.qp, state.qt]);
  function run(event: React.FormEvent) {
    event.preventDefault();
    try {
      studyStore.setQuadraticInputs(prime, target);
      setRevealed(false);
      setError('');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Invalid input.');
    }
  }
  const p = result.prime;
  return (
    <section
      id={id}
      className="nt-lab content-section"
      aria-labelledby={`${id}-quadratic-heading`}
    >
      <div className="nt-lab__head">
        <div>
          <span className="callout-label">QUADRATIC RESIDUE MAP</span>
          <h2 id={`${id}-quadratic-heading`}>Which classes are squares?</h2>
        </div>
        <span className="nt-lab__badge">ODD PRIME FIELD</span>
      </div>
      <p>
        Pick an odd prime and a target class. Predict whether it has two roots,
        one root, or none. The prime condition keeps the two-root claim valid.
      </p>
      <form className="nt-lab__controls" onSubmit={run}>
        <label>
          Odd prime, 3–31
          <input
            value={prime}
            onChange={(e) => setPrime(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          Target integer
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <button type="submit">Set residue</button>
      </form>
      {error && (
        <p className="nt-lab__error" role="alert">
          {error}
        </p>
      )}
      <div className="nt-lab__layout">
        <div className="nt-lab__visual">
          <svg
            viewBox="0 0 360 360"
            aria-hidden="true"
            className="nt-lab__clock"
          >
            <circle
              cx="180"
              cy="180"
              r="139"
              fill="none"
              stroke="#a5c7c6"
              strokeWidth="2"
            />
            {revealed &&
              result.roots
                .filter((root) => root !== result.target)
                .map((root) => {
                  const from = at(root, p),
                    to = at(result.target, p);
                  return (
                    <line
                      key={root}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#c18237"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                    />
                  );
                })}
            {result.rows.map((row) => {
              const point = at(row.input, p);
              const isTarget = row.input === result.target;
              const isSquare = result.nonzeroSquares.includes(row.input);
              return (
                <g
                  key={row.input}
                  transform={`translate(${point.x} ${point.y})`}
                  className={`nt-lab__node ${revealed && isSquare ? 'nt-lab__node--square' : ''} ${isTarget ? 'nt-lab__node--target' : ''} ${revealed && row.selectedRoot ? 'nt-lab__node--root' : ''}`}
                >
                  <circle r={Math.min(16, Math.floor(420 / p))} />
                  <text
                    className="nt-lab__node-number"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {row.input}
                  </text>
                  {(isTarget || (revealed && row.selectedRoot)) && (
                    <text
                      className="nt-lab__node-mark"
                      y="28"
                      textAnchor="middle"
                    >
                      {isTarget ? 'T' : 'R'}
                    </text>
                  )}
                </g>
              );
            })}
            <text
              x="180"
              y="166"
              textAnchor="middle"
              className="nt-lab__center-title"
            >
              MODULUS
            </text>
            <text
              x="180"
              y="203"
              textAnchor="middle"
              className="nt-lab__center-number"
            >
              {p}
            </text>
          </svg>
          <p className="nt-lab__legend">
            T target{' '}
            {revealed ? '· pale nodes squares · outlined nodes roots' : ''}
          </p>
        </div>
        <div className="nt-lab__readout" aria-live="polite">
          <h3>Squaring fibres</h3>
          <p>
            <MathText
              text={`\\(${result.input}\\equiv${result.target}\\pmod{${p}}\\)`}
            />
            . Predict the number of roots before revealing the fibre.
          </p>
          <button
            className="nt-lab__reveal"
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-expanded={revealed}
          >
            {revealed ? 'Hide classification' : 'Reveal roots and symbol'}
          </button>
          {revealed && (
            <div className="nt-lab__answer">
              <strong>
                <MathText
                  text={`\\(\\left(\\frac{${result.target}}{${p}}\\right)=${result.symbol}\\)`}
                />
              </strong>
              <p>
                {result.roots.length === 0
                  ? 'No square root exists.'
                  : `Root${result.roots.length === 1 ? '' : 's'}: `}
                {result.roots.length > 0 && (
                  <MathText text={`\\(${result.roots.join(',\\;')}\\)`} />
                )}
              </p>
              <p>
                The nonzero squares are{' '}
                <MathText
                  text={`\\(\\{${result.nonzeroSquares.join(',\\;')}\\}\\)`}
                />
                , exactly{' '}
                <MathText
                  text={`\\((${p}-1)/2=${result.nonzeroSquares.length}\\)`}
                />{' '}
                classes.
              </p>
              <p>
                Each nonzero root pairs with its negative. If{' '}
                <MathText text={'\\(x^2=a\\)'} /> in this prime field, then{' '}
                <MathText text={'\\((-x)^2=a\\)'} />; the polynomial{' '}
                <MathText text={'\\(X^2-a\\)'} /> has at most two roots.
              </p>
              <p>
                Closure witness:{' '}
                <MathText
                  text={`\\(${result.closure.left}\\cdot${result.closure.right}\\equiv${result.closure.product}\\equiv${result.closure.productRoot}^2\\pmod{${p}}\\)`}
                />
                .
              </p>
            </div>
          )}
        </div>
      </div>
      {revealed && (
        <>
          <div className="nt-lab__table-wrap">
            <table>
              <caption>Complete squaring table modulo {p}</caption>
              <thead>
                <tr>
                  <th scope="col">Input</th>
                  <th scope="col">Square class</th>
                  <th scope="col">Root of target?</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.input}>
                    <th scope="row">{row.input}</th>
                    <td>{row.square}</td>
                    <td>{row.selectedRoot ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="nt-lab__table-wrap">
            <table>
              <caption>Opposite nonzero roots have the same square</caption>
              <thead>
                <tr>
                  <th scope="col">Root</th>
                  <th scope="col">Opposite root</th>
                  <th scope="col">Common square</th>
                </tr>
              </thead>
              <tbody>
                {result.pairs.map((pair) => (
                  <tr key={pair.root}>
                    <td>{pair.root}</td>
                    <td>{pair.opposite}</td>
                    <td>{pair.square}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="nt-lab__limit">
        The finite table verifies this choice of prime. The pairing and
        polynomial root bound prove the claim for every odd prime.
      </p>
    </section>
  );
}
