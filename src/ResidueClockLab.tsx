import { useEffect, useState, useSyncExternalStore } from 'react';
import { MathText } from './MathText';
import type { ResidueOperation } from './math/residue';
import { buildResidueClock } from './math/residue';
import { pointOnResidueCircle as at } from './ResidueDiagram';
import { studyStore } from './state';
import './ResidueLabs.css';

export function ResidueClockLab({ id = 'lab' }: { id?: string }) {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [modulus, setModulus] = useState(state.rm);
  const [first, setFirst] = useState(state.rf);
  const [second, setSecond] = useState(state.rs);
  const [operation, setOperation] = useState<ResidueOperation>(state.ro);
  const [start, setStart] = useState(state.rr0);
  const [end, setEnd] = useState(state.rr1);
  const result =
    state.residue ?? buildResidueClock('7', '-1', '9', 'add', '-7', '14');
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setModulus(state.rm);
    setFirst(state.rf);
    setSecond(state.rs);
    setOperation(state.ro);
    setStart(state.rr0);
    setEnd(state.rr1);
    setRevealed(false);
  }, [state.rm, state.rf, state.rs, state.ro, state.rr0, state.rr1]);
  function run(event: React.FormEvent) {
    event.preventDefault();
    try {
      studyStore.setResidueInputs(
        modulus,
        first,
        second,
        operation,
        start,
        end,
      );
      setRevealed(false);
      setError('');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Invalid input.');
    }
  }
  const symbol = result.operation === 'add' ? '+' : '\\cdot';
  return (
    <section
      id={id}
      className="nt-lab content-section"
      aria-labelledby={`${id}-clock-heading`}
    >
      <div className="nt-lab__head">
        <div>
          <span className="callout-label">RESIDUE CLOCK</span>
          <h2 id={`${id}-clock-heading`}>Same class, many integers</h2>
        </div>
        <span className="nt-lab__badge">EXACT MODULAR ARITHMETIC</span>
      </div>
      <p>
        Choose a modulus and two integers. Predict the result class, then shift
        both representatives by a whole modulus. Will the class change?
      </p>
      <form className="nt-lab__controls" onSubmit={run}>
        <label>
          Modulus, 1–24
          <input
            value={modulus}
            onChange={(e) => setModulus(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          First integer
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          Operation
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as ResidueOperation)}
          >
            <option value="add">Add</option>
            <option value="multiply">Multiply</option>
          </select>
        </label>
        <label>
          Second integer
          <input
            value={second}
            onChange={(e) => setSecond(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          Range start
          <input
            value={start}
            onChange={(e) => setStart(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <label>
          Range end
          <input
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <button type="submit">Set clock</button>
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
            {result.classes.map((cell) => {
              const point = at(cell.residue, result.modulus);
              const marks = [
                cell.isFirst ? 'A' : '',
                cell.isSecond ? 'B' : '',
                revealed && cell.isResult ? 'R' : '',
              ]
                .filter(Boolean)
                .join('');
              return (
                <g
                  key={cell.residue}
                  transform={`translate(${point.x} ${point.y})`}
                  className={`nt-lab__node ${cell.isFirst ? 'nt-lab__node--first' : ''} ${cell.isSecond ? 'nt-lab__node--second' : ''} ${revealed && cell.isResult ? 'nt-lab__node--result' : ''}`}
                >
                  <circle r="16" />
                  <text
                    className="nt-lab__node-number"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {cell.residue}
                  </text>
                  {marks && (
                    <text
                      className="nt-lab__node-mark"
                      y="28"
                      textAnchor="middle"
                    >
                      {marks}
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
              {result.modulus}
            </text>
          </svg>
          <p className="nt-lab__legend">
            A first class · B second class {revealed ? '· R result class' : ''}
          </p>
        </div>
        <div className="nt-lab__readout" aria-live="polite">
          <h3>What the clock shows</h3>
          <p>
            <MathText
              text={`\\(${result.first}\\equiv${result.firstClass}\\pmod{${result.modulus}}\\)`}
            />{' '}
            and{' '}
            <MathText
              text={`\\(${result.second}\\equiv${result.secondClass}\\pmod{${result.modulus}}\\)`}
            />
            .
          </p>
          <p>
            Class <MathText text={`\\(${result.firstClass}\\)`} /> is{' '}
            {result.classes[result.firstClass].isUnit ? 'a unit' : 'a nonunit'}{' '}
            under multiplication
            {result.modulus === 1 ? ' (the one-class convention)' : ''}.
          </p>
          <button
            className="nt-lab__reveal"
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-expanded={revealed}
          >
            {revealed ? 'Hide result' : 'Reveal result and invariant'}
          </button>
          {revealed && (
            <div className="nt-lab__answer">
              <strong>
                <MathText
                  text={`\\(${result.firstClass}${symbol}${result.secondClass}\\equiv${result.resultClass}\\pmod{${result.modulus}}\\)`}
                />
              </strong>
              <p>
                <MathText
                  text={`\\(${result.shiftedFirst}\\equiv${result.first}\\pmod{${result.modulus}}\\)`}
                />{' '}
                and{' '}
                <MathText
                  text={`\\(${result.shiftedSecond}\\equiv${result.second}\\pmod{${result.modulus}}\\)`}
                />
                . Replacing both operands gives the same result class{' '}
                <MathText text={`\\(${result.shiftedResultClass}\\)`} />.
              </p>
              <p>
                Why: adding a multiple of the modulus to either operand changes
                a sum or product by a multiple of that modulus.
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="nt-lab__table-wrap">
        <table>
          <caption>
            Integer representatives and their classes in the chosen range
          </caption>
          <thead>
            <tr>
              <th scope="col">Integer</th>
              <th scope="col">Class modulo {result.modulus}</th>
              <th scope="col">First operand’s class?</th>
              {revealed && <th scope="col">Result class?</th>}
            </tr>
          </thead>
          <tbody>
            {result.cells.map((cell) => (
              <tr key={cell.integer}>
                <th scope="row">{cell.integer}</th>
                <td>{cell.residue}</td>
                <td>{cell.isFirst ? 'Yes' : 'No'}</td>
                {revealed && <td>{cell.isResult ? 'Yes' : 'No'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nt-lab__limit">
        The diagram displays a finite range. The congruence proof, not the
        displayed sample, covers every integer representative.
      </p>
    </section>
  );
}
