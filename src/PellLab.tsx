import { useId, useState, type FormEvent } from 'react';
import { MathText } from './MathText';
import { buildPellOrbit, type PellOrbit } from './math/continued-fraction';
import './ContinuedFractionLabs.css';

export type PellHyperbolaOrbitLabProps = {
  id?: string;
  initialRadicand?: string;
  initialCount?: string;
  onRun?: (orbit: PellOrbit) => void;
};
function message(issue: unknown) {
  return issue instanceof Error
    ? issue.message
    : 'The input could not be computed.';
}

function log10Decimal(value: string) {
  const digits = value.length;
  const leadingDigits = value.slice(0, Math.min(15, digits));
  const leading = Number(leadingDigits);
  return digits - leadingDigits.length + Math.log10(leading);
}

function PellOrbitPlot({ orbit }: { orbit: PellOrbit }) {
  const width = 540;
  const height = 280;
  const left = 66;
  const right = 22;
  const top = 22;
  const bottom = 46;
  const points = orbit.solutions.map((solution) => ({
    index: solution.index,
    x: log10Decimal(solution.y),
    y: log10Decimal(solution.x),
  }));
  const maxX = Math.max(1, ...points.map((point) => point.x));
  const maxY = Math.max(1, ...points.map((point) => point.y));
  const plotX = (value: number) =>
    left + (value / maxX) * (width - left - right);
  const plotY = (value: number) =>
    height - bottom - (value / maxY) * (height - top - bottom);
  const labels = orbit.solutions
    .map(
      (solution) =>
        `solution ${solution.index}: x ${solution.x}, y ${solution.y}`,
    )
    .join('; ');
  return (
    <figure className="pell-lab__plot-figure">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Logarithmic map of positive Pell solutions for D=${orbit.radicand}. ${labels}.`}
        className="pell-lab__plot"
      >
        <title>Positive Pell orbit on logarithmic axes</title>
        <desc>
          Exact integer solutions plotted at logarithmic coordinates; each point
          is labelled by its orbit index. The adjacent table gives exact values.
        </desc>
        <line
          x1={left}
          y1={top}
          x2={left}
          y2={height - bottom}
          className="pell-lab__axis"
        />
        <line
          x1={left}
          y1={height - bottom}
          x2={width - right}
          y2={height - bottom}
          className="pell-lab__axis"
        />
        <line
          x1={left}
          y1={height - bottom}
          x2={width - right}
          y2={top}
          className="pell-lab__growth-guide"
        />
        <text
          x={(left + width - right) / 2}
          y={height - 10}
          textAnchor="middle"
          className="pell-lab__axis-label"
        >
          log₁₀(y)
        </text>
        <text
          x="16"
          y={(top + height - bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 16 ${(top + height - bottom) / 2})`}
          className="pell-lab__axis-label"
        >
          log₁₀(x)
        </text>
        <text
          x={width - right - 3}
          y={top + 11}
          textAnchor="end"
          className="pell-lab__guide-label"
        >
          growth guide
        </text>
        {points.map((point) => {
          const x = plotX(point.x);
          const y = plotY(point.y);
          return (
            <g key={point.index}>
              <circle cx={x} cy={y} r="7" className="pell-lab__point" />
              <text x={x + 9} y={y - 8} className="pell-lab__point-label">
                n={point.index}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        Each exact orbit point satisfies{' '}
        <MathText text={`\\(x^2-${orbit.radicand}y^2=1\\)`} />. Both axes use
        base-10 logarithms so later solutions stay visible. The dashed diagonal
        is only a growth guide, not the hyperbola itself.
      </figcaption>
    </figure>
  );
}

export function PellHyperbolaOrbitLab({
  id = 'pell-hyperbola-orbit',
  initialRadicand = '13',
  initialCount = '5',
  onRun,
}: PellHyperbolaOrbitLabProps) {
  const localId = useId().replaceAll(':', '');
  const [setup] = useState(() => {
    try {
      return {
        orbit: buildPellOrbit(initialRadicand, initialCount),
        error: '',
      };
    } catch (issue) {
      return { orbit: buildPellOrbit('13', '5'), error: message(issue) };
    }
  });
  const [radicand, setRadicand] = useState(initialRadicand);
  const [count, setCount] = useState(initialCount);
  const [orbit, setOrbit] = useState<PellOrbit>(setup.orbit);
  const [error, setError] = useState(setup.error);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = buildPellOrbit(radicand, count);
      setOrbit(next);
      onRun?.(next);
      setError('');
    } catch (issue) {
      setError(message(issue));
    }
  }

  function choose(value: string) {
    setRadicand(value);
    try {
      const next = buildPellOrbit(value, count);
      setOrbit(next);
      onRun?.(next);
      setError('');
    } catch (issue) {
      setError(message(issue));
    }
  }

  return (
    <section
      id={id}
      className="pell-lab content-section"
      aria-labelledby={`${id}-heading`}
    >
      <div className="pell-lab__head">
        <div>
          <span className="callout-label">PELL HYPERBOLA AND UNIT ORBIT</span>
          <h2 id={`${id}-heading`}>Multiply one solution to make the orbit</h2>
        </div>
        <span className="pell-lab__badge">NORM PRESERVED</span>
      </div>
      <p>
        A period of <MathText text={'\\(\\sqrt D\\)'} /> selects the least
        positive solution of <MathText text={'\\(x^2-Dy^2=1\\)'} />. Multiplying
        by that norm-one unit generates every positive solution; exact integers
        verify each point in the orbit.
      </p>
      <form className="pell-lab__controls" onSubmit={submit}>
        <label htmlFor={`${localId}-radicand`}>
          Positive nonsquare D, 2 to 9,999
        </label>
        <input
          id={`${localId}-radicand`}
          type="number"
          min="2"
          max="9999"
          step="1"
          value={radicand}
          onChange={(event) => setRadicand(event.target.value)}
        />
        <label htmlFor={`${localId}-count`}>
          Positive solutions to show, 1 to 8
        </label>
        <input
          id={`${localId}-count`}
          type="number"
          min="1"
          max="8"
          step="1"
          value={count}
          onChange={(event) => setCount(event.target.value)}
        />
        <button type="submit">Build Pell orbit</button>
      </form>
      <fieldset className="pell-lab__presets">
        <legend>Worked Pell examples</legend>
        <button type="button" onClick={() => choose('2')}>
          D = 2 · odd period
        </button>
        <button type="button" onClick={() => choose('3')}>
          D = 3 · even period
        </button>
        <button type="button" onClick={() => choose('13')}>
          D = 13 · larger unit
        </button>
      </fieldset>
      {error && (
        <p className="pell-lab__error" role="alert">
          {error}
        </p>
      )}
      <div className="pell-lab__result">
        <p className="pell-lab__sr-only" aria-live="polite">
          For D {orbit.radicand}, the square-root period has length{' '}
          {orbit.periodLength}. The fundamental positive Pell pair is x{' '}
          {orbit.fundamental.x}, y {orbit.fundamental.y}.
          {orbit.solutions.length} positive solutions are shown.
        </p>
        <div className="pell-lab__readouts">
          <article className="pell-lab__readout">
            <span>Square-root period</span>
            <strong>
              <MathText
                text={`\\(\\sqrt{${orbit.radicand}}=[${orbit.integerPart};\\overline{${orbit.period.join(',')}}]\\)`}
              />
            </strong>
            <p>
              Length <b>{orbit.periodLength}</b>.
            </p>
          </article>
          <article className="pell-lab__readout">
            <span>Fundamental positive unit</span>
            <strong>
              <MathText
                text={`\\(${orbit.fundamental.x}+${orbit.fundamental.y}\\sqrt{${orbit.radicand}}\\)`}
              />
            </strong>
            <p>
              Norm <MathText text={`\\(${orbit.fundamental.norm}\\)`} /> at
              convergent index <b>{orbit.fundamentalIndex}</b>.
            </p>
          </article>
          <article
            className={`pell-lab__readout${orbit.negative ? ' pell-lab__readout--negative' : ''}`}
          >
            <span>Negative Pell boundary</span>
            {orbit.negative ? (
              <>
                <strong>
                  <MathText
                    text={`\\(${orbit.negative.x}^2-${orbit.radicand}(${orbit.negative.y})^2=-1\\)`}
                  />
                </strong>
                <p>An odd period produces a positive solution to norm −1.</p>
              </>
            ) : (
              <>
                <strong>No positive norm −1 solution</strong>
                <p>
                  An even period rules out solutions to{' '}
                  <MathText text={'\\(x^2-Dy^2=-1\\)'} />.
                </p>
              </>
            )}
          </article>
        </div>
        <p className="pell-lab__formula">
          The period rule chooses{' '}
          <MathText
            text={`\\(k=${orbit.periodLength % 2 === 0 ? `${orbit.periodLength}-1` : `2\\cdot${orbit.periodLength}-1`}\\)`}
          />
          and the convergent{' '}
          <MathText
            text={`\\((p_k,q_k)=(${orbit.fundamental.x},${orbit.fundamental.y})\\)`}
          />
          . Unit multiplication uses{' '}
          <MathText
            text={`\\(x_{n+1}=${orbit.fundamental.x}x_n+${orbit.radicand}\\cdot${orbit.fundamental.y}y_n,\\quad y_{n+1}=${orbit.fundamental.y}x_n+${orbit.fundamental.x}y_n\\)`}
          />
          .
        </p>
        <PellOrbitPlot orbit={orbit} />
        <div className="pell-lab__table-wrap">
          <table>
            <caption>
              Exact positive Pell solutions generated by unit powers
            </caption>
            <thead>
              <tr>
                <th scope="col">Power n</th>
                <th scope="col">x</th>
                <th scope="col">y</th>
                <th scope="col">
                  <MathText text={'\\(x^2-Dy^2\\)'} />
                </th>
              </tr>
            </thead>
            <tbody>
              {orbit.solutions.map((solution) => (
                <tr key={solution.index}>
                  <th scope="row">{solution.index}</th>
                  <td>{solution.x}</td>
                  <td>{solution.y}</td>
                  <td>{solution.norm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="pell-lab__prompt">
          <summary>Predict before advancing the orbit</summary>
          <p>
            Square the current unit and predict the next pair. The cross term
            comes from{' '}
            <MathText text={'\\((x+y\\sqrt D)(x_1+y_1\\sqrt D)\\)'} />; verify
            that the norm remains 1 after the multiplication.
          </p>
        </details>
        <p className="pell-lab__limit">
          The table verifies the shown integer solutions. Logarithmic
          coordinates preserve visibility, not Euclidean distances; a finite
          orbit plot alone does not prove minimality or that every solution
          occurs. Those claims come from the continued-fraction period theorem
          and unit-generation theorem.
        </p>
      </div>
    </section>
  );
}
