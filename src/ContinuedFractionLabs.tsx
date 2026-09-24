import { useId, useState, type FormEvent } from 'react';
import { MathText } from './MathText';
import {
  buildRationalContinuedFraction,
  buildSqrtContinuedFraction,
  type RationalContinuedFraction,
  type SqrtContinuedFraction,
} from './math/continued-fraction';
import './ContinuedFractionLabs.css';

export type ContinuedFractionLabResult =
  | RationalContinuedFraction
  | SqrtContinuedFraction;
export type ContinuedFractionLabInput =
  | { kind: 'rational'; numerator: string; denominator: string }
  | { kind: 'sqrt'; radicand: string };
export type ContinuedFractionStaircaseLabProps = {
  id?: string;
  initialInput?: ContinuedFractionLabInput;
  initialVisibleTerms?: number;
  onRun?: (
    result: ContinuedFractionLabResult,
    input: ContinuedFractionLabInput,
    visibleTerms: number,
  ) => void;
};

const MAX_STAIRCASE_TILES = 14;

function formatPrefix(coefficients: string[], continues: boolean) {
  if (coefficients.length === 1)
    return continues ? `[${coefficients[0]};\\ldots]` : `[${coefficients[0]}]`;
  const head = coefficients[0];
  const tail = coefficients.slice(1);
  return `[${head};${tail.join(',')}${continues ? ',\\ldots' : ''}]`;
}

function message(issue: unknown) {
  return issue instanceof Error
    ? issue.message
    : 'The input could not be computed.';
}

function runContinuedFraction(
  input: ContinuedFractionLabInput,
  depth: number,
): ContinuedFractionLabResult {
  return input.kind === 'rational'
    ? buildRationalContinuedFraction(input.numerator, input.denominator)
    : buildSqrtContinuedFraction(input.radicand, String(depth));
}

function StaircaseFigure({
  entries,
  label,
}: {
  entries: Array<{ index: number; coefficient: string }>;
  label: string;
}) {
  const height = Math.max(110, 34 + entries.length * 43);
  return (
    <figure className="cf-lab__staircase-figure">
      <svg
        viewBox={`0 0 720 ${height}`}
        role="img"
        aria-label={label}
        className="cf-lab__staircase"
      >
        <title>Continued-fraction quotient staircase</title>
        <desc>
          Each outlined tile counts one copy of the current unit in a quotient.
          Long quotients are clipped after {MAX_STAIRCASE_TILES} tiles; exact
          values appear in the table.
        </desc>
        {entries.map((entry, row) => {
          const coefficient = BigInt(entry.coefficient);
          const count = Number(coefficient < 0n ? -coefficient : coefficient);
          const shown = Math.min(count, MAX_STAIRCASE_TILES);
          const xStart = 25 + row * 12;
          const y = 18 + row * 43;
          return (
            <g key={entry.index}>
              <text x={xStart} y={y + 16} className="cf-lab__staircase-index">
                a{entry.index}
              </text>
              {Array.from({ length: shown }, (_, tile) => (
                <rect
                  key={tile}
                  x={xStart + 28 + tile * 20}
                  y={y}
                  width="17"
                  height="24"
                  rx="2"
                  className={`cf-lab__staircase-tile${row % 2 ? ' cf-lab__staircase-tile--alternate' : ''}`}
                />
              ))}
              <text x={xStart + 31 + shown * 20} y={y + 16}>
                {coefficient < 0n
                  ? `a${entry.index} = ${entry.coefficient}`
                  : `× ${entry.coefficient}`}
                {count > shown ? ` (${shown} shown)` : ''}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>
        One tile represents one quotient unit. The count is clipped at{' '}
        {MAX_STAIRCASE_TILES} tiles per row; quotient labels and the table keep
        every value exact.
      </figcaption>
    </figure>
  );
}

export function ContinuedFractionStaircaseLab({
  id = 'continued-fraction-staircase',
  initialInput = { kind: 'rational', numerator: '43', denominator: '19' },
  initialVisibleTerms = 1,
  onRun,
}: ContinuedFractionStaircaseLabProps) {
  const localId = useId().replaceAll(':', '');
  const depth = Math.min(Math.max(initialVisibleTerms, 1), 16);
  const [setup] = useState(() => {
    try {
      const result = runContinuedFraction(initialInput, depth);
      return {
        result,
        activeInput: initialInput,
        visible:
          result.kind === 'rational'
            ? Math.min(depth, result.coefficients.length)
            : depth,
        error: '',
      };
    } catch (issue) {
      const fallback: ContinuedFractionLabInput = {
        kind: 'rational',
        numerator: '43',
        denominator: '19',
      };
      return {
        result: buildRationalContinuedFraction('43', '19'),
        activeInput: fallback,
        visible: 1,
        error: message(issue),
      };
    }
  });
  const [kind, setKind] = useState<'rational' | 'sqrt'>(initialInput.kind);
  const [numerator, setNumerator] = useState(
    initialInput.kind === 'rational' ? initialInput.numerator : '43',
  );
  const [denominator, setDenominator] = useState(
    initialInput.kind === 'rational' ? initialInput.denominator : '19',
  );
  const [radicand, setRadicand] = useState(
    initialInput.kind === 'sqrt' ? initialInput.radicand : '2',
  );
  const [result, setResult] = useState<ContinuedFractionLabResult>(
    setup.result,
  );
  const [activeInput, setActiveInput] = useState<ContinuedFractionLabInput>(
    setup.activeInput,
  );
  const [visible, setVisible] = useState(setup.visible);
  const [error, setError] = useState(setup.error);
  const entries =
    result.kind === 'rational'
      ? result.coefficients.slice(0, visible).map((coefficient, index) => ({
          index,
          coefficient,
        }))
      : result.states.map((state) => ({
          index: state.index,
          coefficient: state.coefficient,
        }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input: ContinuedFractionLabInput =
      kind === 'rational'
        ? { kind, numerator, denominator }
        : { kind, radicand };
    try {
      const depth = Math.min(Math.max(visible, 1), 16);
      const next = runContinuedFraction(input, depth);
      const displayedDepth = next.kind === 'rational' ? 1 : depth;
      setActiveInput(input);
      setResult(next);
      setVisible(displayedDepth);
      onRun?.(next, input, displayedDepth);
      setError('');
    } catch (issue) {
      setError(message(issue));
    }
  }

  function changeVisible(value: number) {
    setVisible(value);
    if (activeInput.kind === 'sqrt') {
      try {
        const next = buildSqrtContinuedFraction(
          activeInput.radicand,
          String(value),
        );
        setResult(next);
        onRun?.(next, activeInput, value);
        setError('');
      } catch (issue) {
        setError(message(issue));
      }
    } else {
      onRun?.(result, activeInput, value);
    }
  }

  function chooseRational() {
    setKind('rational');
    setNumerator('43');
    setDenominator('19');
    try {
      const input: ContinuedFractionLabInput = {
        kind: 'rational',
        numerator: '43',
        denominator: '19',
      };
      const next = runContinuedFraction(input, 1);
      setResult(next);
      setActiveInput(input);
      setVisible(1);
      onRun?.(next, input, 1);
      setError('');
    } catch (issue) {
      setError(message(issue));
    }
  }

  function chooseRootTwo() {
    setKind('sqrt');
    setRadicand('2');
    const input: ContinuedFractionLabInput = { kind: 'sqrt', radicand: '2' };
    try {
      const next = buildSqrtContinuedFraction('2', '1');
      setResult(next);
      setActiveInput(input);
      setVisible(1);
      onRun?.(next, input, 1);
      setError('');
    } catch (issue) {
      setError(message(issue));
    }
  }

  return (
    <section
      id={id}
      className="cf-lab content-section"
      aria-labelledby={`${id}-heading`}
    >
      <div className="cf-lab__head">
        <div>
          <span className="callout-label">CONTINUED-FRACTION STAIRCASE</span>
          <h2 id={`${id}-heading`}>Read quotients as steps</h2>
        </div>
        <span className="cf-lab__badge">EXACT INTEGER TRACE</span>
      </div>
      <p>
        Euclidean quotients become continued-fraction entries. The convergent
        recurrence records the truncations; for a square root, exact states
        repeat and the convergents alternate around the target.
      </p>
      <form className="cf-lab__controls" onSubmit={submit}>
        <label htmlFor={`${localId}-kind`}>Target type</label>
        <select
          id={`${localId}-kind`}
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as 'rational' | 'sqrt')
          }
        >
          <option value="rational">Rational number</option>
          <option value="sqrt">Square root of D</option>
        </select>
        {kind === 'rational' ? (
          <>
            <label htmlFor={`${localId}-numerator`}>
              Numerator, <MathText text={'\\(-999\\) to \\(999\\)'} />
            </label>
            <input
              id={`${localId}-numerator`}
              type="number"
              min="-999"
              max="999"
              step="1"
              value={numerator}
              onChange={(event) => setNumerator(event.target.value)}
            />
            <label htmlFor={`${localId}-denominator`}>
              Positive denominator, <MathText text={'\\(1\\) to \\(999\\)'} />
            </label>
            <input
              id={`${localId}-denominator`}
              type="number"
              min="1"
              max="999"
              step="1"
              value={denominator}
              onChange={(event) => setDenominator(event.target.value)}
            />
          </>
        ) : (
          <>
            <label htmlFor={`${localId}-radicand`}>
              Nonsquare <MathText text={'\\(D\\), \\(2\\) to \\(9999\\)'} />
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
          </>
        )}
        <button type="submit">Build exact staircase</button>
      </form>
      <fieldset className="cf-lab__presets">
        <legend>Worked examples</legend>
        <button type="button" onClick={chooseRational}>
          <MathText text={'\\(43/19\\) · finite'} />
        </button>
        <button type="button" onClick={chooseRootTwo}>
          <MathText text={'\\(\\sqrt2\\) · periodic'} />
        </button>
      </fieldset>
      {error && (
        <p className="cf-lab__error" role="alert">
          {error}
        </p>
      )}
      <p className="cf-lab__sr-only" aria-live="polite">
        {result.kind === 'rational'
          ? `Built ${visible} of ${result.coefficients.length} entries for ${result.numerator} over ${result.denominator}.`
          : `Built ${result.states.length} entries for the square root of ${result.radicand}; period length ${result.periodLength}.`}
      </p>

      {result.kind === 'rational' ? (
        <RationalReadout
          result={result}
          visible={visible}
          localId={localId}
          onVisibleChange={changeVisible}
          entries={entries}
        />
      ) : (
        <SqrtReadout
          result={result}
          localId={localId}
          onVisibleChange={changeVisible}
          entries={entries}
        />
      )}
    </section>
  );
}

function RationalReadout({
  result,
  visible,
  localId,
  onVisibleChange,
  entries,
}: {
  result: RationalContinuedFraction;
  visible: number;
  localId: string;
  onVisibleChange: (value: number) => void;
  entries: Array<{ index: number; coefficient: string }>;
}) {
  const rows = result.convergents.slice(0, visible);
  return (
    <div className="cf-lab__result">
      <div className="cf-lab__result-card">
        <span>Finite continued-fraction prefix</span>
        <strong>
          <MathText
            text={`\\(${formatPrefix(result.coefficients.slice(0, visible), visible < result.coefficients.length)}\\)`}
          />
        </strong>
        <p>
          The reduced input is{' '}
          <MathText text={`\\(${result.numerator}/${result.denominator}\\)`} />.
          The highlighted convergents are built one quotient at a time.
        </p>
        <details>
          <summary>Reveal both complete finite expansions</summary>
          <p>
            Canonical form: <MathText text={`\\(${result.canonical}\\)`} />. Its
            final entry is at least 2 unless the expansion is an integer.
          </p>
          <p>
            The same value has the alternative form{' '}
            <MathText text={`\\(${result.alternative}\\)`} />. Replacing the
            final entry by one less and appending 1 preserves the value.
          </p>
        </details>
      </div>
      <DepthControl
        id={`${localId}-rational-depth`}
        label="Reveal convergents through entry"
        value={visible}
        max={result.coefficients.length}
        onChange={onVisibleChange}
      />
      <StaircaseFigure
        entries={entries}
        label={`Quotient staircase; ${visible} of ${result.coefficients.length} entries are shown.`}
      />
      <div className="cf-lab__tables">
        <div className="cf-lab__table-wrap">
          <table>
            <caption>Euclidean quotient and remainder trace</caption>
            <thead>
              <tr>
                <th scope="col">k</th>
                <th scope="col">Dividend</th>
                <th scope="col">Divisor</th>
                <th scope="col">
                  <MathText text={'\\(a_k\\)'} />
                </th>
                <th scope="col">Remainder</th>
              </tr>
            </thead>
            <tbody>
              {result.divisions.slice(0, visible).map((step) => (
                <tr key={step.index}>
                  <th scope="row">{step.index}</th>
                  <td>{step.dividend}</td>
                  <td>{step.divisor}</td>
                  <td>{step.quotient}</td>
                  <td>{step.remainder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cf-lab__table-wrap">
          <table>
            <caption>Truncations, determinants, and exact errors</caption>
            <thead>
              <tr>
                <th scope="col">k</th>
                <th scope="col">
                  <MathText text={'\\(p_k/q_k\\)'} />
                </th>
                <th scope="col">
                  <MathText text={'\\(p_kq_{k-1}-p_{k-1}q_k\\)'} />
                </th>
                <th scope="col">
                  Input − <MathText text={'\\(p_k/q_k\\)'} />
                </th>
                <th scope="col">Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.index}>
                  <th scope="row">{row.index}</th>
                  <td>
                    <MathText
                      text={`\\(${row.numerator}/${row.denominator}\\)`}
                    />
                  </td>
                  <td>{row.determinantWithPrevious}</td>
                  <td>
                    <MathText
                      text={`\\(${row.errorNumerator}/${row.errorDenominator}\\)`}
                    />
                  </td>
                  <td>{positionLabel(row.errorSide)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="cf-lab__invariant">
        Every row checks{' '}
        <MathText text={'\\(p_kq_{k-1}-p_{k-1}q_k=(-1)^{k-1}\\)'} />. The
        adjacent determinant has absolute value 1, so each displayed convergent
        is reduced. The terminal convergent of the complete expansion equals the
        input exactly; this table shows the selected prefix.
      </p>
      <details className="cf-lab__prompt">
        <summary>
          {visible < result.coefficients.length
            ? 'Predict before revealing another step'
            : 'Check the terminal division'}
        </summary>
        <p>
          {visible < result.coefficients.length
            ? 'Use the last divisor and remainder to predict the next quotient, then reveal a row and check the division identity '
            : 'The final remainder is zero. Compare the canonical expansion and its alternative form.'}
          {visible < result.coefficients.length && (
            <MathText text={'\\(r_{k-1}=a_kr_k+r_{k+1}\\)'} />
          )}
        </p>
      </details>
      <p className="cf-lab__limit">
        The staircase encodes quotient counts; it does not prove the convergence
        or best-approximation theorems. The displayed division, determinant, and
        error identities are exact for these finite rows.
      </p>
    </div>
  );
}

function SqrtReadout({
  result,
  localId,
  onVisibleChange,
  entries,
}: {
  result: SqrtContinuedFraction;
  localId: string;
  onVisibleChange: (value: number) => void;
  entries: Array<{ index: number; coefficient: string }>;
}) {
  const visible = result.states.length;
  return (
    <div className="cf-lab__result">
      <div className="cf-lab__result-card">
        <span>Exact square-root expansion</span>
        <strong>
          <MathText text={`\\(\\sqrt{${result.radicand}}\\)`} />
        </strong>
        <p>
          The repeating quotient period has length {result.periodLength}. Its
          state update is{' '}
          <MathText
            text={
              '\\(m\\prime=da-m,\\quad d\\prime=(D-m\\prime^2)/d,\\quad a\\prime=\\lfloor(a_0+m\\prime)/d\\prime\\rfloor\\)'
            }
          />
          . Each stored denominator divides <MathText text={'\\(D-m_n^2\\)'} />
          exactly.
        </p>
        <details>
          <summary>Reveal the full periodic expansion</summary>
          <p>
            <MathText
              text={`\\(\\sqrt{${result.radicand}}=[${result.integerPart};\\overline{${result.period.join(',')}}]\\)`}
            />
          </p>
        </details>
      </div>
      <DepthControl
        id={`${localId}-sqrt-depth`}
        label="Reveal continued-fraction entries"
        value={visible}
        max={16}
        onChange={onVisibleChange}
      />
      <StaircaseFigure
        entries={entries}
        label={`First ${visible} quotient entries of the periodic continued fraction for square root ${result.radicand}.`}
      />
      <div className="cf-lab__tables">
        <div className="cf-lab__table-wrap">
          <table>
            <caption>Periodic square-root states</caption>
            <thead>
              <tr>
                <th scope="col">n</th>
                <th scope="col">
                  <MathText text={'\\(m_n\\)'} />
                </th>
                <th scope="col">
                  <MathText text={'\\(d_n\\)'} />
                </th>
                <th scope="col">
                  <MathText text={'\\(a_n\\)'} />
                </th>
                <th scope="col">State check</th>
              </tr>
            </thead>
            <tbody>
              {result.states.map((state) => (
                <tr key={state.index}>
                  <th scope="row">{state.index}</th>
                  <td>{state.m}</td>
                  <td>{state.d}</td>
                  <td>{state.coefficient}</td>
                  <td>
                    {state.index === 0 ? (
                      'initial state'
                    ) : (
                      <MathText text={'\\(d_n\\mid(D-m_n^2)\\)'} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cf-lab__table-wrap">
          <table>
            <caption>
              Convergents, norm differences, and error certificates
            </caption>
            <thead>
              <tr>
                <th scope="col">k</th>
                <th scope="col">
                  <MathText text={'\\(p_k/q_k\\)'} />
                </th>
                <th scope="col">Determinant</th>
                <th scope="col">
                  <MathText text={'\\(Dq_k^2-p_k^2\\)'} />
                </th>
                <th scope="col">Position</th>
                <th scope="col">
                  <MathText text={'\\(q_{k+1}\\)'} />
                </th>
                <th scope="col">Error bound</th>
              </tr>
            </thead>
            <tbody>
              {result.convergents.map((row) => (
                <tr key={row.index}>
                  <th scope="row">{row.index}</th>
                  <td>
                    <MathText
                      text={`\\(${row.numerator}/${row.denominator}\\)`}
                    />
                  </td>
                  <td>{row.determinantWithPrevious}</td>
                  <td>{row.normDifference}</td>
                  <td>
                    <MathText
                      text={
                        row.errorSide === 'below'
                          ? 'below \\(\\sqrt D\\)'
                          : 'above \\(\\sqrt D\\)'
                      }
                    />
                  </td>
                  <td>{row.nextDenominator}</td>
                  <td>
                    <MathText text={`\\(<1/${row.errorBoundDenominator}\\)`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="cf-lab__invariant">
        The signed norm difference gives the side exactly. For each row the next
        denominator certifies{' '}
        <MathText
          text={
            '\\(0<\\left|\\sqrt D-p_k/q_k\\right|<1/(q_kq_{k+1})\\le1/q_k^2\\)'
          }
        />
        . Even convergents lie below <MathText text={'\\(\\sqrt D\\)'} /> and
        odd convergents above it.
      </p>
      <details className="cf-lab__prompt">
        <summary>Predict before revealing another entry</summary>
        <p>
          Predict whether the next convergent crosses to the other side of{' '}
          <MathText text={`\\(\\sqrt{${result.radicand}}\\)`} />. Then move the
          control one step and verify the sign of{' '}
          <MathText text={'\\(Dq_k^2-p_k^2\\)'} />.
        </p>
      </details>
      <div className="cf-lab__theorem-note">
        <strong>Best-approximation scope from R04</strong>
        <p>
          For this irrational target, convergent{' '}
          <MathText text={'\\(p_k/q_k\\)'} />
          minimizes the second-kind error{' '}
          <MathText text={'\\(\\left|b\\sqrt D-a\\right|\\)'} /> among integer
          pairs with <MathText text={'\\(0<b<q_{k+1}\\)'} />. The table gives
          the exact convergents and denominator thresholds; it does not
          enumerate every competing pair.
        </p>
      </div>
      <p className="cf-lab__limit">
        Repeated states prove periodicity of this square-root algorithm. A
        finite table illustrates the recurrence and error theorem; it is not a
        proof that all continued fractions converge. The entry slider is capped
        at 16 for display, while the exact period remains complete.
      </p>
    </div>
  );
}

function DepthControl({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="cf-lab__depth">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="range"
        min="1"
        max={max}
        step="1"
        value={value}
        aria-valuetext={`${value} ${value === 1 ? 'entry' : 'entries'}`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output htmlFor={id}>
        {value} of {max} entries
      </output>
    </div>
  );
}

function positionLabel(position: 'below' | 'above' | 'exact') {
  return position === 'exact'
    ? 'equals input'
    : position === 'below'
      ? 'below input'
      : 'above input';
}

export { PellHyperbolaOrbitLab } from './PellLab';
export type { PellHyperbolaOrbitLabProps } from './PellLab';
