import { useEffect, useState } from 'react';
import type { ReciprocityLattice } from './math/group-labs';
import { buildReciprocityLattice } from './math/group-labs';
import { MathText } from './MathText';
import { LabHeader } from './GroupLabHeader';
import './GroupLabs.css';

export type ReciprocityLabInputs = { p: string; q: string };

const reciprocityExamples = [
  { label: 'Both 3 mod 4: 7, 11', p: '7', q: '11' },
  { label: 'Positive sign: 5, 13', p: '5', q: '13' },
  { label: 'Swap the rectangle: 11, 7', p: '11', q: '7' },
];

export function ReciprocityLatticeLab({
  id = 'lab',
  initialInputs,
  onRun,
}: {
  id?: string;
  initialInputs?: Partial<ReciprocityLabInputs>;
  onRun?: (inputs: ReciprocityLabInputs, result: ReciprocityLattice) => void;
}) {
  const initialP = initialInputs?.p ?? '7';
  const initialQ = initialInputs?.q ?? '11';
  const [p, setP] = useState(initialP);
  const [q, setQ] = useState(initialQ);
  const [result, setResult] = useState<ReciprocityLattice>(() =>
    buildReciprocityLattice(initialP, initialQ),
  );
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setP(initialP);
    setQ(initialQ);
    setResult(buildReciprocityLattice(initialP, initialQ));
    setRevealed(false);
    setError('');
  }, [initialP, initialQ]);

  function run(event: React.FormEvent) {
    event.preventDefault();
    try {
      const nextResult = buildReciprocityLattice(p, q);
      setResult(nextResult);
      onRun?.(
        { p: nextResult.p.toString(), q: nextResult.q.toString() },
        nextResult,
      );
      setRevealed(false);
      setError('');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Invalid input.');
    }
  }

  function choose(example: (typeof reciprocityExamples)[number]) {
    setP(example.p);
    setQ(example.q);
    const nextResult = buildReciprocityLattice(example.p, example.q);
    setResult(nextResult);
    onRun?.({ p: example.p, q: example.q }, nextResult);
    setRevealed(false);
    setError('');
  }

  return (
    <section
      id={id}
      className="group-lab content-section"
      aria-labelledby={`${id}-reciprocity-heading`}
    >
      <LabHeader
        label="Q04 · QUADRATIC RECIPROCITY"
        title="Count the two sides of the prime rectangle"
        badge="LATTICE PARITY"
        headingId={`${id}-reciprocity-heading`}
      />
      <p>
        For distinct odd primes <MathText text={'\\(p,q\\)'} />, the
        half-rectangle has <MathText text={'\\(((p-1)/2)((q-1)/2)\\)'} />{' '}
        lattice points. Predict the two strict counts, then compare their parity
        with the two Legendre symbols.
      </p>
      <form className="group-lab__controls" onSubmit={run}>
        <label>
          Odd prime <MathText text={'\\(p\\)'} />, 3–31
          <input
            inputMode="numeric"
            value={p}
            onChange={(event) => setP(event.target.value)}
          />
        </label>
        <label>
          Distinct odd prime <MathText text={'\\(q\\)'} />, 3–31
          <input
            inputMode="numeric"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </label>
        <button type="submit">Build lattice count</button>
      </form>
      <fieldset className="group-lab__presets">
        <legend>Example prime pairs</legend>
        {reciprocityExamples.map((example) => (
          <button
            type="button"
            key={example.label}
            onClick={() => choose(example)}
          >
            {example.label}
          </button>
        ))}
      </fieldset>
      {error && (
        <p className="group-lab__error" role="alert">
          {error}
        </p>
      )}
      <div className="group-lab__prompt">
        <strong>Before opening the count:</strong> which side is larger, and
        when does the reciprocity sign become negative?
      </div>

      <LatticeDiagram result={result} />
      <div
        className="group-lab__summary group-lab__summary--lattice"
        aria-live="polite"
      >
        <span>
          <b>Below</b> <MathText text={'\\(py<qx\\)'} />: {result.countBelow}{' '}
          points · <b>above</b> <MathText text={'\\(py>qx\\)'} />:{' '}
          {result.countAbove} points
        </span>
        <strong>
          <MathText
            text={`\\(S_${result.p}(${result.q})+S_${result.q}(${result.p})=${result.countBelow}+${result.countAbove}=${result.parityExponent}\\)`}
          />
        </strong>
      </div>

      <button
        type="button"
        className="group-lab__reveal"
        aria-expanded={revealed}
        aria-controls={`${id}-reciprocity-details`}
        onClick={() => setRevealed((value) => !value)}
      >
        {revealed
          ? 'Hide coordinates and parity proof'
          : 'Open coordinates and parity proof'}
      </button>
      {revealed && (
        <div id={`${id}-reciprocity-details`} className="group-lab__detail">
          <FloorSumTables result={result} />
          <LatticePointTable result={result} />
          <div className="group-lab__proof">
            <h3>Parity proof readout</h3>
            <p>
              The floor rows give{' '}
              <MathText
                text={`\\(S_${result.p}(${result.q})=${result.floorSumPq}\\)`}
              />{' '}
              and{' '}
              <MathText
                text={`\\(S_${result.q}(${result.p})=${result.floorSumQp}\\)`}
              />
              . No lattice point lies on <MathText text={'\\(py=qx\\)'} />, so
              the two counts partition the rectangle:{' '}
              <MathText
                text={`\\(${result.countBelow}+${result.countAbove}=${result.mP}\\cdot${result.mQ}\\)`}
              />
              .
            </p>
            <p>
              The Gauss floor-parity bridge gives{' '}
              <MathText
                text={`\\(\\chi_${result.p}(${result.q})=(-1)^{${result.floorSumPq}}=${signed(result.gaussSignPq)}\\)`}
              />{' '}
              and{' '}
              <MathText
                text={`\\(\\chi_${result.q}(${result.p})=(-1)^{${result.floorSumQp}}=${signed(result.gaussSignQp)}\\)`}
              />
              . Their product is {signed(result.symbolProduct)}, which matches{' '}
              <MathText
                text={`\\((-1)^{${result.parityExponent}}=${signed(result.reciprocitySign)}\\)`}
              />
              .
            </p>
            <p>
              The sign is negative exactly when{' '}
              <MathText text={'\\(p\\equiv q\\equiv3\\pmod4\\)'} />: then both
              half-prime counts are odd. If either prime is{' '}
              <MathText text={'\\(1\\pmod4\\)'} />, the sign is positive.
            </p>
            <p>
              The picture counts a bounded instance. The general proof also
              needs the floor-parity bridge and the argument excluding diagonal
              points; the grid alone is not a proof for all prime pairs.
            </p>
          </div>
        </div>
      )}
      <p className="group-lab__limit">
        The exact grid is capped at 31; the largest half-rectangle has 225
        points.
      </p>
    </section>
  );
}

function signed(value: number) {
  return value < 0 ? '−1' : '+1';
}

function LatticeDiagram({ result }: { result: ReciprocityLattice }) {
  const step = 22;
  const left = 36;
  const top = 22;
  const width = left + result.mP * step + 32;
  const height = top + result.mQ * step + 38;
  const xCoordinate = (x: number) => left + x * step;
  const yCoordinate = (y: number) => top + (result.mQ - y) * step;
  const exitX = Math.min(result.mP, (result.mQ * result.p) / result.q);
  const exitY = (result.q * exitX) / result.p;
  const axisEndX = xCoordinate(result.mP) + step / 2;
  const axisEndY = yCoordinate(1) + step / 2;
  return (
    <div className="group-lab__visual group-lab__lattice-visual">
      <p className="group-lab__visual-title">
        Half-rectangle for p = {result.p}, q = {result.q}
      </p>
      <svg
        className="group-lab__lattice"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Lattice rectangle with ${result.mP} columns and ${result.mQ} rows. Filled circles are below py equals qx (${result.countBelow}); outlined squares are above it (${result.countAbove}).`}
      >
        <line
          className="group-lab__lattice-axis"
          x1={left - 8}
          y1={top + result.mQ * step + step / 2}
          x2={axisEndX}
          y2={top + result.mQ * step + step / 2}
        />
        <line
          className="group-lab__lattice-axis"
          x1={left - 8}
          y1={top + result.mQ * step + step / 2}
          x2={left - 8}
          y2={top - step / 2}
        />
        <line
          className="group-lab__lattice-diagonal"
          x1={xCoordinate(0)}
          y1={yCoordinate(0)}
          x2={xCoordinate(exitX)}
          y2={yCoordinate(exitY)}
        />
        {Array.from({ length: result.mP }, (_, index) => index + 1).map((x) => (
          <text
            className="group-lab__tick"
            key={`x-${x}`}
            x={xCoordinate(x)}
            y={axisEndY + 17}
            textAnchor="middle"
          >
            {x}
          </text>
        ))}
        {Array.from({ length: result.mQ }, (_, index) => index + 1).map((y) => (
          <text
            className="group-lab__tick"
            key={`y-${y}`}
            x={left - 17}
            y={yCoordinate(y) + 4}
            textAnchor="end"
          >
            {y}
          </text>
        ))}
        {result.cells.map((cell) => {
          const x = xCoordinate(cell.x);
          const y = yCoordinate(cell.y);
          return cell.region === 'below' ? (
            <circle
              className="group-lab__lattice-below"
              key={`${cell.x}-${cell.y}`}
              cx={x}
              cy={y}
              r="6"
            />
          ) : (
            <rect
              className="group-lab__lattice-above"
              key={`${cell.x}-${cell.y}`}
              x={x - 5}
              y={y - 5}
              width="10"
              height="10"
            />
          );
        })}
        <text
          className="group-lab__axis-title"
          x={axisEndX - 3}
          y={height - 3}
          textAnchor="end"
        >
          x
        </text>
        <text className="group-lab__axis-title" x={5} y={top - 8}>
          y
        </text>
      </svg>
      <div className="group-lab__visual-legend">
        <span>
          <i className="group-lab__legend-circle" /> Below the line:{' '}
          <MathText text={'\\(py<qx\\)'} />
        </span>
        <span>
          <i className="group-lab__legend-square" /> Above the line:{' '}
          <MathText text={'\\(py>qx\\)'} />
        </span>
      </div>
    </div>
  );
}

function FloorSumTables({ result }: { result: ReciprocityLattice }) {
  return (
    <div className="group-lab__spectrum-grid">
      <div className="group-lab__table-wrap">
        <table>
          <caption>
            Below-line count <MathText text={'\\(S_p(q)\\)'} />, one column per
            x
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <MathText text={'\\(x\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(\\lfloor qx/p\\rfloor\\)'} />
              </th>
              <th scope="col">Points below</th>
            </tr>
          </thead>
          <tbody>
            {result.pRows.map((row) => (
              <tr key={row.x}>
                <th scope="row">{row.x}</th>
                <td>{row.floor}</td>
                <td>{row.belowCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Sum</th>
              <td>{result.floorSumPq}</td>
              <td>{result.countBelow}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="group-lab__table-wrap">
        <table>
          <caption>
            Above-line count <MathText text={'\\(S_q(p)\\)'} />, one row per y
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <MathText text={'\\(y\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(\\lfloor py/q\\rfloor\\)'} />
              </th>
              <th scope="col">Points above</th>
            </tr>
          </thead>
          <tbody>
            {result.qRows.map((row) => (
              <tr key={row.y}>
                <th scope="row">{row.y}</th>
                <td>{row.floor}</td>
                <td>{row.aboveCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Sum</th>
              <td>{result.floorSumQp}</td>
              <td>{result.countAbove}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function LatticePointTable({ result }: { result: ReciprocityLattice }) {
  return (
    <div className="group-lab__table-wrap group-lab__point-table">
      <table>
        <caption>
          Every lattice point and its strict side of{' '}
          <MathText text={'\\(py=qx\\)'} />
        </caption>
        <thead>
          <tr>
            <th scope="col">x</th>
            <th scope="col">y</th>
            <th scope="col">Comparison</th>
            <th scope="col">Region</th>
          </tr>
        </thead>
        <tbody>
          {result.cells.map((cell) => (
            <tr key={`${cell.x}-${cell.y}`}>
              <td>{cell.x}</td>
              <td>{cell.y}</td>
              <td>
                <MathText
                  text={`\\(${result.p}\\cdot${cell.y}${cell.region === 'below' ? '<' : '>'}${result.q}\\cdot${cell.x}\\)`}
                />
              </td>
              <td>{cell.region === 'below' ? 'Below' : 'Above'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
