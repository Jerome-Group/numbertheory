import { useEffect, useId, useState } from 'react';
import type { UnitOrderSpectrum } from './math/group-labs';
import { buildUnitOrderSpectrum } from './math/group-labs';
import { MathText } from './MathText';
import { LabHeader } from './GroupLabHeader';
import './GroupLabs.css';

export type UnitOrderLabInputs = { prime: string; candidate: string };
type OrderLessonId = 'U01' | 'U02';

const orderExamples = [
  { label: 'Generator modulo 7', prime: '7', candidate: '3' },
  { label: 'Short cycle modulo 7', prime: '7', candidate: '2' },
  { label: 'Generator modulo 11', prime: '11', candidate: '2' },
];

export function PrimitiveRootCycleLab({
  lessonId = 'U01',
  id = 'lab',
  initialInputs,
  onRun,
}: {
  lessonId?: OrderLessonId;
  id?: string;
  initialInputs?: Partial<UnitOrderLabInputs>;
  onRun?: (inputs: UnitOrderLabInputs, result: UnitOrderSpectrum) => void;
}) {
  const initialPrime = initialInputs?.prime ?? '7';
  const initialCandidate = initialInputs?.candidate ?? '3';
  const [prime, setPrime] = useState(initialPrime);
  const [candidate, setCandidate] = useState(initialCandidate);
  const [result, setResult] = useState<UnitOrderSpectrum>(() =>
    buildUnitOrderSpectrum(initialPrime, initialCandidate),
  );
  const [activeExponent, setActiveExponent] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const isGeneratorLesson = lessonId === 'U02';

  useEffect(() => {
    setPrime(initialPrime);
    setCandidate(initialCandidate);
    setResult(buildUnitOrderSpectrum(initialPrime, initialCandidate));
    setActiveExponent(0);
    setRevealed(false);
    setError('');
  }, [initialCandidate, initialPrime]);

  function run(event: React.FormEvent) {
    event.preventDefault();
    try {
      const nextResult = buildUnitOrderSpectrum(prime, candidate);
      setResult(nextResult);
      onRun?.(
        {
          prime: nextResult.prime.toString(),
          candidate: nextResult.candidate.toString(),
        },
        nextResult,
      );
      setActiveExponent(0);
      setRevealed(false);
      setError('');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Invalid input.');
    }
  }

  function choose(example: (typeof orderExamples)[number]) {
    setPrime(example.prime);
    setCandidate(example.candidate);
    const nextResult = buildUnitOrderSpectrum(example.prime, example.candidate);
    setResult(nextResult);
    onRun?.({ prime: example.prime, candidate: example.candidate }, nextResult);
    setActiveExponent(0);
    setRevealed(false);
    setError('');
  }

  function stepCycle(direction: -1 | 1) {
    setActiveExponent(
      (value) =>
        (value + direction + result.candidateOrder) % result.candidateOrder,
    );
  }

  const activePower = result.cycle[activeExponent];
  return (
    <section
      id={id}
      className="group-lab content-section"
      aria-labelledby={`${id}-order-heading`}
    >
      <LabHeader
        label={
          isGeneratorLesson
            ? 'U02 · PRIMITIVE ROOTS'
            : 'U01 · MULTIPLICATIVE ORDER'
        }
        title={
          isGeneratorLesson
            ? 'Test a candidate generator'
            : 'Follow a unit’s exact period'
        }
        badge="UNIT-POWER CYCLE"
        headingId={`${id}-order-heading`}
      />
      <p>
        Choose an odd prime and a nonzero class. Step around its power cycle,
        then compare the order of <MathText text={'\\(a^k\\)'} /> with{' '}
        <MathText text={'\\(h/\\gcd(h,k)\\)'} />. A candidate generates every
        nonzero class exactly when its order is <MathText text={'\\(p-1\\)'} />.
      </p>
      <form className="group-lab__controls" onSubmit={run}>
        <label>
          Odd prime <MathText text={'\\(p\\)'} />, 3–31
          <input
            inputMode="numeric"
            value={prime}
            onChange={(event) => setPrime(event.target.value)}
          />
        </label>
        <label>
          Candidate <MathText text={'\\(a\\)'} />, 1–
          <MathText text={'\\(p-1\\)'} />
          <input
            inputMode="numeric"
            value={candidate}
            onChange={(event) => setCandidate(event.target.value)}
          />
        </label>
        <button type="submit">Build power cycle</button>
      </form>
      <fieldset className="group-lab__presets">
        <legend>Example cycles</legend>
        {orderExamples.map((example) => (
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

      <div className="group-lab__order-layout">
        <CycleDiagram id={id} result={result} activeExponent={activeExponent} />
        <div className="group-lab__readout" aria-live="polite">
          <h3>Current power</h3>
          <p className="group-lab__equation">
            <MathText
              text={`\\(${result.candidate}^{${activePower.exponent}}\\equiv${activePower.residue}\\pmod{${result.prime}}\\)`}
            />
          </p>
          <p>
            The cycle returns to <MathText text={'\\(1\\)'} /> at exponent{' '}
            <strong>{result.returnExponent}</strong>, so{' '}
            <MathText
              text={`\\(\\operatorname{ord}_{${result.prime}}(${result.candidate})=${result.candidateOrder}\\)`}
            />
            .
          </p>
          <p
            className={
              result.isPrimitiveRoot
                ? 'group-lab__status group-lab__status--yes'
                : 'group-lab__status group-lab__status--no'
            }
          >
            {result.isPrimitiveRoot
              ? `Generator: yes. The cycle visits all ${result.groupOrder} nonzero classes.`
              : `Generator: no. The cycle misses ${result.missedUnits.join(', ')}.`}
          </p>
          <div className="group-lab__cycle-controls">
            <button
              type="button"
              onClick={() => stepCycle(-1)}
              aria-label="Previous exponent"
            >
              Previous power
            </button>
            <button type="button" onClick={() => setActiveExponent(0)}>
              Reset to exponent zero
            </button>
            <button
              type="button"
              onClick={() => stepCycle(1)}
              aria-label="Next exponent"
            >
              Next power
            </button>
          </div>
        </div>
      </div>

      <div className="group-lab__prompt">
        <strong>Predict:</strong>{' '}
        {isGeneratorLesson
          ? 'Does the candidate visit every nonzero class? Which prime-divisor test first rejects it?'
          : 'Which powers return to one? What should the order of each power be?'}
      </div>
      <button
        type="button"
        className="group-lab__reveal"
        aria-expanded={revealed}
        aria-controls={`${id}-order-details`}
        onClick={() => setRevealed((value) => !value)}
      >
        {revealed
          ? 'Hide order tables and proof readout'
          : 'Open order tables and proof readout'}
      </button>
      {revealed && (
        <div id={`${id}-order-details`} className="group-lab__detail">
          <PowerOrderTable result={result} />
          <OrderSpectrumTables result={result} />
          <div className="group-lab__proof">
            <h3>
              {isGeneratorLesson
                ? 'Generator tests'
                : 'Order divisibility check'}
            </h3>
            {isGeneratorLesson ? (
              <>
                <p>
                  The order is{' '}
                  <MathText text={`\\(${result.candidateOrder}\\)`} />, and the
                  group has <MathText text={`\\(${result.groupOrder}\\)`} />{' '}
                  units. Prime-divisor tests reject a candidate if{' '}
                  <MathText text={'\\(a^{(p-1)/r}\\equiv1\\)'} /> for any prime
                  <MathText text={'\\(r\\mid p-1\\)'} />.
                </p>
                <GeneratorTestTable result={result} />
                <p>
                  Direct enumeration is evidence for this bounded prime, not a
                  proof that every odd prime has a primitive root. That
                  existence theorem needs the polynomial root-count argument.
                </p>
                {result.isPrimitiveRoot && (
                  <p>
                    Since this candidate is a generator, its powers are
                    generators exactly at exponents coprime to{' '}
                    <MathText text={`\\(${result.groupOrder}\\)`} />:{' '}
                    <strong>{result.primitivePowerExponents.join(', ')}</strong>
                    .
                  </p>
                )}
              </>
            ) : (
              <p>
                Every computed order <MathText text={'\\(h\\)'} /> divides{' '}
                <MathText text={`\\(p-1=${result.groupOrder}\\)`} />. For each
                exponent <MathText text={'\\(k\\)'} />, the table compares the
                directly found order of <MathText text={'\\(a^k\\)'} /> with{' '}
                <MathText text={'\\(h/\\gcd(h,k)\\)'} />. These finite checks
                illustrate the order theorem; the divisibility proof uses
                division with remainder and minimality of h.
              </p>
            )}
          </div>
        </div>
      )}
      <p className="group-lab__limit">
        Prime inputs are capped at 31 so every unit and power order can be
        listed.
      </p>
    </section>
  );
}

function CycleDiagram({
  id,
  result,
  activeExponent,
}: {
  id: string;
  result: UnitOrderSpectrum;
  activeExponent: number;
}) {
  const center = 180;
  const radius = 132;
  const nodes = result.cycle.map((entry, index) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * index) / result.cycle.length;
    return {
      ...entry,
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  });
  const arrowId = `${id}-group-lab-cycle-arrow-${useId().replaceAll(':', '')}`;
  return (
    <div className="group-lab__visual group-lab__cycle-visual">
      <p className="group-lab__visual-title">
        Powers of {result.candidate} modulo {result.prime}
      </p>
      <svg
        className="group-lab__cycle"
        viewBox="0 0 360 360"
        role="img"
        aria-label={`Power cycle for ${result.candidate} modulo ${result.prime}; order ${result.candidateOrder}; the highlighted node is exponent ${activeExponent}.`}
      >
        <defs>
          <marker
            id={arrowId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L7,3 z" />
          </marker>
        </defs>
        {nodes.map((node, index) => {
          if (nodes.length === 1) return null;
          const next = nodes[(index + 1) % nodes.length];
          const dx = next.x - node.x;
          const dy = next.y - node.y;
          const edgeLength = Math.hypot(dx, dy);
          const inset = 19;
          const unitX = dx / edgeLength;
          const unitY = dy / edgeLength;
          return (
            <line
              key={`edge-${node.exponent}`}
              x1={node.x + unitX * inset}
              y1={node.y + unitY * inset}
              x2={next.x - unitX * inset}
              y2={next.y - unitY * inset}
              markerEnd={`url(#${arrowId})`}
            />
          );
        })}
        {nodes.map((node) => (
          <g
            key={node.exponent}
            className={
              node.exponent === activeExponent
                ? 'group-lab__cycle-node group-lab__cycle-node--active'
                : 'group-lab__cycle-node'
            }
          >
            <circle cx={node.x} cy={node.y} r="16" />
            <text x={node.x} y={node.y + 4} textAnchor="middle">
              {node.residue}
            </text>
            <text
              className="group-lab__cycle-exponent"
              x={node.x}
              y={node.y + 27}
              textAnchor="middle"
            >
              e={node.exponent}
            </text>
          </g>
        ))}
        <text
          className="group-lab__cycle-center"
          x={center}
          y={center - 4}
          textAnchor="middle"
        >
          ORDER
        </text>
        <text
          className="group-lab__cycle-center-number"
          x={center}
          y={center + 28}
          textAnchor="middle"
        >
          {result.candidateOrder}
        </text>
      </svg>
      <p className="group-lab__visual-legend">
        Arrow direction follows successive powers; node labels show the residue
        and exponent.
      </p>
    </div>
  );
}

function PowerOrderTable({ result }: { result: UnitOrderSpectrum }) {
  return (
    <div className="group-lab__table-wrap">
      <table>
        <caption>
          Order of each power of {result.candidate} modulo {result.prime}
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <MathText text={'\\(k\\)'} />
            </th>
            <th scope="col">
              <MathText text={'\\(a^k\\)'} />
            </th>
            <th scope="col">
              <MathText text={'\\(\\gcd(h,k)\\)'} />
            </th>
            <th scope="col">
              <MathText text={'\\(h/\\gcd(h,k)\\)'} />
            </th>
            <th scope="col">Computed order</th>
          </tr>
        </thead>
        <tbody>
          {result.powerOrders.map((row) => (
            <tr key={row.exponent}>
              <th scope="row">{row.exponent}</th>
              <td>{row.residue}</td>
              <td>{row.gcd}</td>
              <td>{row.predictedOrder}</td>
              <td>{row.computedOrder}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderSpectrumTables({ result }: { result: UnitOrderSpectrum }) {
  return (
    <div className="group-lab__spectrum-grid">
      <div className="group-lab__table-wrap">
        <table>
          <caption>Order spectrum in the units modulo {result.prime}</caption>
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Number of units</th>
            </tr>
          </thead>
          <tbody>
            {result.orderCounts.map((row) => (
              <tr key={row.order}>
                <th scope="row">{row.order}</th>
                <td>{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="group-lab__table-wrap">
        <table>
          <caption>All nonzero residue classes and their orders</caption>
          <thead>
            <tr>
              <th scope="col">Class</th>
              <th scope="col">Order</th>
              <th scope="col">Primitive root?</th>
            </tr>
          </thead>
          <tbody>
            {result.units.map((unit) => (
              <tr key={unit.unit}>
                <th scope="row">{unit.unit}</th>
                <td>{unit.order}</td>
                <td>{unit.isPrimitiveRoot ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GeneratorTestTable({ result }: { result: UnitOrderSpectrum }) {
  return (
    <div className="group-lab__table-wrap">
      <table>
        <caption>Prime-divisor tests for candidate {result.candidate}</caption>
        <thead>
          <tr>
            <th scope="col">
              <MathText text={'\\(r\\mid p-1\\)'} />
            </th>
            <th scope="col">
              <MathText text={'\\((p-1)/r\\)'} />
            </th>
            <th scope="col">
              <MathText text={'\\(a^{(p-1)/r}\\)'} />
            </th>
            <th scope="col">Test</th>
          </tr>
        </thead>
        <tbody>
          {result.generatorTests.map((row) => (
            <tr key={row.primeDivisor}>
              <th scope="row">{row.primeDivisor}</th>
              <td>{row.exponent}</td>
              <td>{row.residue}</td>
              <td>
                {row.residue === 1 ? 'Reject as generator' : 'Pass this test'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
