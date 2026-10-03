import { useEffect, useState, useSyncExternalStore } from 'react';
import { MathText } from './MathText';
import type { HenselBranch } from './math/hensel';
import { buildHenselTree } from './math/hensel';
import { studyStore } from './state';
import './HenselLab.css';

const examples = [
  { label: 'Unique lifts', prime: '7', c: '2', levels: '3' },
  { label: 'Singular branches', prime: '3', c: '0', levels: '3' },
  { label: 'No first root', prime: '7', c: '3', levels: '3' },
];

export function HenselRootTreeLab({ id = 'lab' }: { id?: string }) {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [prime, setPrime] = useState(state.hp);
  const [c, setC] = useState(state.hc);
  const [levels, setLevels] = useState(state.hl);
  const tree = state.hensel ?? buildHenselTree('7', '2', '3');
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setPrime(state.hp);
    setC(state.hc);
    setLevels(state.hl);
    setRevealed(false);
  }, [state.hp, state.hc, state.hl]);
  function run(event: React.FormEvent) {
    event.preventDefault();
    try {
      studyStore.setHenselInputs(prime, c, levels);
      setRevealed(false);
      setError('');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Invalid input.');
    }
  }
  function choose(example: (typeof examples)[number]) {
    setPrime(example.prime);
    setC(example.c);
    setLevels(example.levels);
    studyStore.setHenselInputs(example.prime, example.c, example.levels);
    setRevealed(false);
    setError('');
  }
  return (
    <section
      id={id}
      className="hensel-lab content-section"
      aria-labelledby={`${id}-hensel-heading`}
    >
      <div className="hensel-lab__head">
        <div>
          <span className="callout-label">HENSEL ROOT TREE</span>
          <h2 id={`${id}-hensel-heading`}>Follow every next digit</h2>
        </div>
        <span className="hensel-lab__badge">EXACT LIFT CHECK</span>
      </div>
      <p>
        For <MathText text={'\\(f(x)=x^2-c\\)'} />, each root modulo{' '}
        <MathText text={'\\(p^k\\)'} /> has candidate lifts{' '}
        <MathText text={'\\(a+tp^k\\)'} /> with{' '}
        <MathText text={'\\(0\\le t<p\\)'} />. Predict the branches before
        revealing them.
      </p>
      <form className="hensel-lab__controls" onSubmit={run}>
        <label>
          Odd prime, 3–13
          <input
            inputMode="numeric"
            value={prime}
            onChange={(event) => setPrime(event.target.value)}
          />
        </label>
        <label>
          Constant c
          <input
            inputMode="numeric"
            value={c}
            onChange={(event) => setC(event.target.value)}
          />
        </label>
        <label>
          Levels, 1–4
          <input
            inputMode="numeric"
            value={levels}
            onChange={(event) => setLevels(event.target.value)}
          />
        </label>
        <button type="submit">Build tree</button>
      </form>
      <fieldset className="hensel-lab__presets">
        <legend>Example trees</legend>
        {examples.map((example) => (
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
        <p className="hensel-lab__error" role="alert">
          {error}
        </p>
      )}
      <div className="hensel-lab__prompt">
        <strong>Before revealing:</strong> At a parent root{' '}
        <MathText text={'\\(a\\)'} />, is{' '}
        <MathText text={'\\(f\\prime(a)=2a\\)'} /> a unit modulo{' '}
        <MathText text={`\\(${tree.prime}\\)`} />? If not, does{' '}
        <MathText text={'\\(f(a)/p^k\\)'} /> vanish modulo{' '}
        <MathText text={`\\(${tree.prime}\\)`} />? Predict one, zero, or all{' '}
        <MathText text={`\\(${tree.prime}\\)`} /> children.
      </div>
      <button
        type="button"
        className="hensel-lab__reveal"
        aria-expanded={revealed}
        onClick={() => setRevealed((value) => !value)}
      >
        {revealed ? 'Hide branches' : 'Reveal lift tree'}
      </button>
      {revealed && (
        <div aria-live="polite">
          <p className="hensel-lab__equation">
            <MathText
              text={`\\(f(x)=x^2-(${tree.c}),\\quad p=${tree.prime}\\)`}
            />
            . At each parent, the digit test is{' '}
            <MathText text={'\\(f(a)/p^k+t f\\prime(a)\\equiv0\\pmod p\\)'} />.
          </p>
          <fieldset className="hensel-lab__levels">
            <legend>Root sets by modulus</legend>
            {tree.levels.map((level) => (
              <div className="hensel-lab__level" key={level.level}>
                <span>LEVEL {level.level}</span>
                <strong>
                  <MathText text={`\\(\\bmod ${level.modulus}\\)`} />
                </strong>
                <p>
                  {level.roots.length}{' '}
                  {level.roots.length === 1 ? 'root' : 'roots'}
                </p>
                <div className="hensel-lab__roots">
                  {level.roots.length ? (
                    level.roots.map((root) => <span key={root}>{root}</span>)
                  ) : (
                    <em>none</em>
                  )}
                </div>
              </div>
            ))}
          </fieldset>
          {tree.branches.length ? (
            <div className="hensel-lab__branches">
              <h3>Branch decisions</h3>
              {tree.branches.map((branch) => (
                <BranchCard
                  key={`${branch.level}-${branch.parent}`}
                  branch={branch}
                  prime={tree.prime}
                />
              ))}
            </div>
          ) : (
            <p className="hensel-lab__empty">
              {tree.levels[0].roots.length === 0
                ? 'There is no root modulo the first prime, so no branch can start.'
                : 'Only the first level was requested; no lift step is needed.'}
            </p>
          )}
          <p className="hensel-lab__limit">
            The tables verify the bounded inputs. The digit congruence explains
            every branch; an all-lift step can split again or die at the next
            level.
          </p>
        </div>
      )}
    </section>
  );
}

function BranchCard({
  branch,
  prime,
}: {
  branch: HenselBranch;
  prime: number;
}) {
  const children = branch.candidates
    .filter((candidate) => candidate.isRoot)
    .map((candidate) => candidate.residue);
  return (
    <article
      className={`hensel-lab__branch hensel-lab__branch--${branch.kind}`}
    >
      <div className="hensel-lab__branch-head">
        <div>
          <span>
            FROM{' '}
            <MathText
              text={`\\(${branch.parent}\\pmod{${branch.modulus}}\\)`}
            />
          </span>
          <strong>
            {branch.kind === 'unique'
              ? 'One lift'
              : branch.kind === 'all'
                ? `All ${prime} lifts`
                : 'No lift'}
          </strong>
        </div>
        <span className="hensel-lab__branch-arrow" aria-hidden="true">
          →
        </span>
        <div className="hensel-lab__children">
          {children.length ? (
            children.map((child) => <b key={child}>{child}</b>)
          ) : (
            <em>none</em>
          )}
        </div>
      </div>
      <p>
        <MathText
          text={`\\(f(${branch.parent})/${branch.modulus}=${branch.quotient}\\equiv${branch.quotientClass}\\pmod{${prime}}\\)`}
        />
        ;{' '}
        <MathText
          text={`\\(f\\prime(${branch.parent})=${branch.derivative}\\equiv${branch.derivativeClass}\\pmod{${prime}}\\)`}
        />
        .
      </p>
      <p>
        {branch.kind === 'unique'
          ? 'The derivative is a unit, so the digit equation has exactly one solution.'
          : branch.kind === 'all'
            ? 'The derivative and quotient both vanish, so every next digit works.'
            : 'The derivative vanishes but the quotient does not, so no digit works.'}
      </p>
      <details>
        <summary>Inspect all {prime} candidate digits</summary>
        <div className="hensel-lab__table-wrap">
          <table>
            <caption>
              Candidate lifts from {branch.parent} modulo {branch.modulus}
            </caption>
            <thead>
              <tr>
                <th scope="col">Digit t</th>
                <th scope="col">Candidate</th>
                <th scope="col">Root at next level?</th>
              </tr>
            </thead>
            <tbody>
              {branch.candidates.map((candidate) => (
                <tr key={candidate.digit}>
                  <th scope="row">{candidate.digit}</th>
                  <td>{candidate.residue}</td>
                  <td>{candidate.isRoot ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}
