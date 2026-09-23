import { useEffect, useState } from 'react';
import type {
  ArithmeticFunction,
  DivisorIncidenceStudy,
} from './math/group-labs';
import { buildDivisorIncidenceStudy } from './math/group-labs';
import { MathText } from './MathText';
import { LabHeader } from './GroupLabHeader';
import './GroupLabs.css';

const functionLabels: Record<ArithmeticFunction, string> = {
  one: 'Constant one function',
  identity: 'Identity function',
  mobius: 'Möbius function',
  totient: 'Euler totient function',
};

type DivisorLessonId = 'A03' | 'A04';
export type DivisorLabInputs = {
  n: string;
  leftFunction: ArithmeticFunction;
  rightFunction: ArithmeticFunction;
};
const divisorExamples: Record<
  DivisorLessonId,
  { n: string; f: ArithmeticFunction; g: ArithmeticFunction; label: string }[]
> = {
  A03: [
    { label: '1 * 1 at 12', n: '12', f: 'one', g: 'one' },
    { label: 'id * 1 at 12', n: '12', f: 'identity', g: 'one' },
    { label: 'μ * 1 at 30', n: '30', f: 'mobius', g: 'one' },
  ],
  A04: [
    { label: 'Recover totient at 12', n: '12', f: 'totient', g: 'one' },
    { label: 'Recover 1(18)', n: '18', f: 'one', g: 'one' },
    { label: 'Recover id(30)', n: '30', f: 'identity', g: 'one' },
  ],
};

export function DivisorIncidenceLab({
  lessonId = 'A03',
  id = 'lab',
  initialInputs,
  onRun,
}: {
  lessonId?: DivisorLessonId;
  id?: string;
  initialInputs?: Partial<DivisorLabInputs>;
  onRun?: (inputs: DivisorLabInputs, result: DivisorIncidenceStudy) => void;
}) {
  const initialN = initialInputs?.n ?? '12';
  const initialFunction =
    initialInputs?.leftFunction ?? (lessonId === 'A04' ? 'totient' : 'one');
  const initialRightFunction = initialInputs?.rightFunction ?? 'one';
  const [n, setN] = useState(initialN);
  const [leftFunction, setLeftFunction] =
    useState<ArithmeticFunction>(initialFunction);
  const [rightFunction, setRightFunction] =
    useState<ArithmeticFunction>(initialRightFunction);
  const [result, setResult] = useState<DivisorIncidenceStudy>(() =>
    buildDivisorIncidenceStudy(initialN, initialFunction, initialRightFunction),
  );
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setN(initialN);
    setLeftFunction(initialFunction);
    setRightFunction(initialRightFunction);
    setResult(
      buildDivisorIncidenceStudy(
        initialN,
        initialFunction,
        initialRightFunction,
      ),
    );
    setRevealed(false);
    setError('');
  }, [initialFunction, initialN, initialRightFunction]);

  function run(event: React.FormEvent) {
    event.preventDefault();
    try {
      const nextResult = buildDivisorIncidenceStudy(
        n,
        leftFunction,
        rightFunction,
      );
      setResult(nextResult);
      onRun?.(
        { n: nextResult.n.toString(), leftFunction, rightFunction },
        nextResult,
      );
      setRevealed(false);
      setError('');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Invalid input.');
    }
  }

  function choose(example: (typeof divisorExamples)[DivisorLessonId][number]) {
    setN(example.n);
    setLeftFunction(example.f);
    setRightFunction(example.g);
    const nextResult = buildDivisorIncidenceStudy(
      example.n,
      example.f,
      example.g,
    );
    setResult(nextResult);
    onRun?.(
      { n: example.n, leftFunction: example.f, rightFunction: example.g },
      nextResult,
    );
    setRevealed(false);
    setError('');
  }

  const isInversion = lessonId === 'A04';
  const svgTitleId = `${id}-divisor-title`;
  const svgDescriptionId = `${id}-divisor-description`;
  return (
    <section
      id={id}
      className="group-lab content-section"
      aria-labelledby={`${id}-divisor-heading`}
    >
      <LabHeader
        label={
          isInversion ? 'A04 · MÖBIUS INVERSION' : 'A03 · DIRICHLET CONVOLUTION'
        }
        title={
          isInversion
            ? 'Undo a divisor sum'
            : 'Pair every divisor with its complement'
        }
        badge="FINITE DIVISOR TRACE"
        headingId={`${id}-divisor-heading`}
      />
      <p>
        {isInversion ? (
          <>
            The transform <MathText text={'\\(F=\\mathbf 1\\ast f\\)'} /> stores
            the sum of <MathText text={'\\(f\\)'} /> over each divisor set.
            Predict which signed terms survive when{' '}
            <MathText text={'\\(\\mu\\)'} />
            is convolved with <MathText text={'\\(F\\)'} />.
          </>
        ) : (
          <>
            For{' '}
            <MathText text={'\\((f\\ast g)(n)=\\sum_{d\\mid n}f(d)g(n/d)\\)'} />
            , each divisor contributes one product with its complementary
            divisor. Predict the total before opening the term table.
          </>
        )}
      </p>

      <form className="group-lab__controls" onSubmit={run}>
        <label>
          Positive integer n, 1–120
          <input
            inputMode="numeric"
            value={n}
            onChange={(event) => setN(event.target.value)}
          />
        </label>
        <label htmlFor={`${id}-left-function`}>
          {isInversion ? 'Source function f' : 'First function f'}
          <FunctionSelect
            id={`${id}-left-function`}
            value={leftFunction}
            onChange={setLeftFunction}
          />
        </label>
        {!isInversion && (
          <label htmlFor={`${id}-right-function`}>
            Second function g
            <FunctionSelect
              id={`${id}-right-function`}
              value={rightFunction}
              onChange={setRightFunction}
            />
          </label>
        )}
        <button type="submit">Build divisor trace</button>
      </form>

      <fieldset className="group-lab__presets">
        <legend>
          {isInversion ? 'Inversion examples' : 'Convolution examples'}
        </legend>
        {divisorExamples[lessonId].map((example) => (
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
        <strong>Before opening the proof readout:</strong>{' '}
        {isInversion ? (
          <>
            How do the <MathText text={'\\(\\mu(d)F(n/d)\\)'} /> terms cancel,
            and what remains?
          </>
        ) : (
          'Which divisor pairs with 3, and how many products enter the sum?'
        )}
      </div>

      {isInversion ? (
        <MobiusSignStrip result={result} />
      ) : (
        <ComplementDiagram
          result={result}
          titleId={svgTitleId}
          descriptionId={svgDescriptionId}
        />
      )}

      <div className="group-lab__summary" aria-live="polite">
        <strong>
          {isInversion ? (
            <MathText
              text={`\\((\\mathbf 1\\ast f)(${result.n})=${result.divisorSumValue}\\)`}
            />
          ) : (
            <MathText
              text={`\\((f\\ast g)(${result.n})=${result.convolutionValue}\\)`}
            />
          )}
        </strong>
        <span>{result.divisorCount} positive divisors, paired by d ↔ n/d.</span>
      </div>

      <button
        type="button"
        className="group-lab__reveal"
        aria-expanded={revealed}
        aria-controls={`${id}-divisor-details`}
        onClick={() => setRevealed((value) => !value)}
      >
        {revealed
          ? 'Hide terms and proof readout'
          : 'Open terms and proof readout'}
      </button>
      {revealed && (
        <div id={`${id}-divisor-details`} className="group-lab__detail">
          <DivisorTermsTable result={result} inversion={isInversion} />
          {isInversion ? (
            <div className="group-lab__proof">
              <h3>Inversion check</h3>
              <p>
                <MathText
                  text={`\\(\\sum_{d\\mid ${result.n}}\\mu(d)=${result.mobiusDivisorSum}=${result.mobiusIdentityValue}\\)`}
                />
                . For the full transform, each table row contributes
                <MathText text={'\\(\\mu(d)F(n/d)\\)'} />; the sum is{' '}
                <MathText
                  text={`\\(${result.inversionValue}=f(${result.n})=${result.sourceValue}\\)`}
                />
                .
              </p>
              <p>
                Since{' '}
                <MathText text={'\\(\\mathbf 1\\ast\\mu=\\varepsilon\\)'} />,
                associativity gives{' '}
                <MathText text={'\\(\\mu\\ast(\\mathbf 1\\ast f)=f\\)'} />. This
                finite instance checks the identity for the selected input; it
                does not prove inversion for every n.
              </p>
            </div>
          ) : (
            <div className="group-lab__proof">
              <h3>Complement map check</h3>
              <p>
                The map <MathText text={`\\(d\\mapsto ${result.n}/d\\)`} /> is
                an involution on the positive divisors: applying it twice
                returns
                <MathText text={'\\(d\\)'} />. Every row contributes exactly{' '}
                <MathText text={'\\(f(d)g(n/d)\\)'} /> to the convolution.
              </p>
              <p>
                The visible sum verifies this input only. Commutativity,
                associativity, the identity law, and multiplicativity require
                the divisor reindexings in the general proof.
              </p>
              <CoprimeProductReadout result={result} />
            </div>
          )}
        </div>
      )}
      <p className="group-lab__limit">
        Exact arithmetic is bounded to <MathText text={'\\(n\\le120\\)'} />
        so every divisor term stays legible.
      </p>
    </section>
  );
}

function CoprimeProductReadout({ result }: { result: DivisorIncidenceStudy }) {
  const factorization =
    result.primePowerFactors
      .map(({ prime, exponent }) =>
        exponent === 1 ? prime : `${prime}^{${exponent}}`,
      )
      .join('\\cdot') || '1';
  const check = result.coprimeProductCheck;
  return (
    <div className="group-lab__coprime-check">
      <h4>Prime-power split and multiplicativity check</h4>
      <p>
        <MathText text={`\\(${result.n}=${factorization}\\)`} />. The selected
        coprime split is{' '}
        <MathText
          text={`\\(${check.leftFactor}\\cdot${check.rightFactor}=${result.n},\\quad\\gcd(${check.leftFactor},${check.rightFactor})=${check.gcd}\\)`}
        />
        .
      </p>
      {check.isNontrivial ? (
        <p>
          <MathText
            text={`\\((f\\ast g)(${check.leftFactor})(f\\ast g)(${check.rightFactor})=${check.leftConvolution}\\cdot${check.rightConvolution}=${check.product}=(f\\ast g)(${result.n})=${check.fullConvolution}\\)`}
          />
          . This selected check matches; it illustrates, but does not prove,
          multiplicativity for every coprime pair.
        </p>
      ) : (
        <p>
          This input has one prime-power factor, so its available split is
          trivial. Choose an integer with at least two distinct prime factors to
          inspect a nontrivial multiplicativity check.
        </p>
      )}
    </div>
  );
}

function FunctionSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ArithmeticFunction;
  onChange: (value: ArithmeticFunction) => void;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as ArithmeticFunction)}
    >
      {Object.entries(functionLabels).map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  );
}

function ComplementDiagram({
  result,
  titleId,
  descriptionId,
}: {
  result: DivisorIncidenceStudy;
  titleId: string;
  descriptionId: string;
}) {
  const width = 520;
  const margin = 30;
  const step = (width - margin * 2) / Math.max(result.rows.length - 1, 1);
  const positions = new Map(
    result.rows.map((row, index) => [row.divisor, margin + index * step]),
  );
  return (
    <div className="group-lab__visual">
      <p className="group-lab__visual-title">Complement map: d → n/d</p>
      <svg
        className="group-lab__complement"
        viewBox={`0 0 ${width} 150`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>Complementary divisors of {result.n}</title>
        <desc id={descriptionId}>
          Each upper divisor connects to its complementary divisor in the lower
          row. Repeating the map returns to the starting divisor.
        </desc>
        {result.rows.map((row) => (
          <line
            key={`edge-${row.divisor}`}
            x1={positions.get(row.divisor)}
            y1="43"
            x2={positions.get(row.complementaryDivisor)}
            y2="108"
          />
        ))}
        {result.rows.map((row, index) => {
          const x = margin + index * step;
          const complementIndex = result.rows.findIndex(
            (candidate) => candidate.divisor === row.complementaryDivisor,
          );
          const complementX = margin + complementIndex * step;
          return (
            <g key={row.divisor}>
              <circle
                className="group-lab__incidence-node"
                cx={x}
                cy="43"
                r="14"
              />
              <text x={x} y="47" textAnchor="middle">
                {row.divisor}
              </text>
              <circle
                className="group-lab__incidence-node group-lab__incidence-node--complement"
                cx={complementX}
                cy="108"
                r="14"
              />
              <text x={complementX} y="112" textAnchor="middle">
                {row.complementaryDivisor}
              </text>
            </g>
          );
        })}
        <text className="group-lab__axis-label" x="9" y="47">
          d
        </text>
        <text className="group-lab__axis-label" x="5" y="112">
          n/d
        </text>
      </svg>
      <div className="group-lab__visual-legend">
        Upper labels are d · lower labels are n/d · each line is one convolution
        term.
      </div>
    </div>
  );
}

function MobiusSignStrip({ result }: { result: DivisorIncidenceStudy }) {
  return (
    <div className="group-lab__visual">
      <p className="group-lab__visual-title">
        Möbius cancellation over divisors
      </p>
      <div className="group-lab__signs">
        {result.rows.map((row) => {
          const sign = Number(row.mobiusValue);
          return (
            <div
              key={row.divisor}
              className={`group-lab__sign group-lab__sign--${sign < 0 ? 'negative' : sign > 0 ? 'positive' : 'zero'}`}
            >
              <span>d = {row.divisor}</span>
              <strong>{sign < 0 ? '−1' : sign > 0 ? '+1' : '0'}</strong>
              <small>
                {sign === 0 ? 'repeated prime factor' : 'squarefree term'}
              </small>
            </div>
          );
        })}
      </div>
      <p className="group-lab__visual-legend">
        Signed labels distinguish positive, negative, and zero terms without
        colour.
      </p>
    </div>
  );
}

function DivisorTermsTable({
  result,
  inversion,
}: {
  result: DivisorIncidenceStudy;
  inversion: boolean;
}) {
  return (
    <div className="group-lab__table-wrap">
      <table>
        <caption>
          {inversion ? (
            <>
              Divisor terms for Möbius inversion at{' '}
              <MathText text={`\\(n=${result.n}\\)`} />
            </>
          ) : (
            <>
              Complementary-divisor summands at{' '}
              <MathText text={`\\(n=${result.n}\\)`} />
            </>
          )}
        </caption>
        <thead>
          {inversion ? (
            <tr>
              <th scope="col">
                <MathText text={'\\(d\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(n/d\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(\\mu(d)\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(F(n/d)\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(\\mu(d)F(n/d)\\)'} />
              </th>
            </tr>
          ) : (
            <tr>
              <th scope="col">
                <MathText text={'\\(d\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(n/d\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(f(d)\\)'} />
              </th>
              <th scope="col">
                <MathText text={'\\(g(n/d)\\)'} />
              </th>
              <th scope="col">Product</th>
            </tr>
          )}
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr key={row.divisor}>
              <th scope="row">{row.divisor}</th>
              <td>{row.complementaryDivisor}</td>
              {inversion ? (
                <>
                  <td>{row.mobiusValue}</td>
                  <td>{row.transformedComplement}</td>
                  <td>{row.inversionTerm}</td>
                </>
              ) : (
                <>
                  <td>{row.leftValue}</td>
                  <td>{row.rightValue}</td>
                  <td>{row.convolutionTerm}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td colSpan={3}>
              {inversion ? (
                <>
                  Recovered <MathText text={'\\(f(n)\\)'} />
                </>
              ) : (
                <MathText text={'\\((f\\ast g)(n)\\)'} />
              )}
            </td>
            <td>
              {inversion ? result.inversionValue : result.convolutionValue}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
