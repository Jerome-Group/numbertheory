import { useEffect, useState, useSyncExternalStore } from 'react';
import { CrtClocks } from './CrtClocks';
import { MathText } from './MathText';
import { studyStore } from './state';

export function CrtLab() {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const [ca, setCa] = useState(state.ca),
    [cm, setCm] = useState(state.cm);
  const [cb, setCb] = useState(state.cb),
    [cn, setCn] = useState(state.cn);
  const [error, setError] = useState('');
  useEffect(() => {
    setCa(state.ca);
    setCm(state.cm);
    setCb(state.cb);
    setCn(state.cn);
  }, [state.ca, state.cm, state.cb, state.cn]);
  function run(e: React.FormEvent) {
    e.preventDefault();
    try {
      studyStore.setCrtInputs(ca.trim(), cm.trim(), cb.trim(), cn.trim());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid input.');
    }
  }
  return (
    <section id="lab" className="content-section lab">
      <div className="lab-head">
        <div>
          <span className="callout-label">EXPERIMENT 02</span>
          <h2>Synchronise residues</h2>
        </div>
        <span className="lab-badge">EXACT CRT SOLVER</span>
      </div>
      <p>
        Predict whether the two classes meet. They must agree modulo the gcd of
        the moduli.
      </p>
      <form className="lab-controls" onSubmit={run}>
        <label>
          First residue
          <input
            inputMode="numeric"
            value={ca}
            onChange={(e) => setCa(e.target.value)}
          />
        </label>
        <label>
          First modulus
          <input
            inputMode="numeric"
            value={cm}
            onChange={(e) => setCm(e.target.value)}
          />
        </label>
        <label>
          Second residue
          <input
            inputMode="numeric"
            value={cb}
            onChange={(e) => setCb(e.target.value)}
          />
        </label>
        <label>
          Second modulus
          <input
            inputMode="numeric"
            value={cn}
            onChange={(e) => setCn(e.target.value)}
          />
        </label>
        <button type="submit">Solve system</button>
      </form>
      {error && (
        <p className="input-error" role="alert">
          {error}
        </p>
      )}
      {state.crt && (
        <>
          <div className="answer-strip" aria-live="polite">
            <span>
              {state.crt.compatible
                ? 'COMPATIBLE CLASSES'
                : 'INCOMPATIBLE CLASSES'}
            </span>
            <strong>
              <MathText
                text={
                  state.crt.compatible
                    ? `\\(x\\equiv ${state.crt.residue}\\pmod{${state.crt.modulus}}\\)`
                    : 'No common solution'
                }
              />
            </strong>
            <small>
              <MathText
                text={`\\(\\gcd(${state.crt.m},${state.crt.n})=${state.crt.gcd}\\). ${state.crt.reason}`}
              />
            </small>
          </div>
          <CrtClocks crt={state.crt} />
          <ResidueGrid crt={state.crt} />
        </>
      )}
    </section>
  );
}
function ResidueGrid({
  crt,
}: {
  crt: NonNullable<ReturnType<typeof studyStore.getSnapshot>['crt']>;
}) {
  const span = Number(
    crt.modulus ??
      ((BigInt(crt.m) / BigInt(crt.gcd)) * BigInt(crt.n)).toString(),
  );
  if (span > 36) return null;
  return (
    <div className="residue-visual">
      <span className="visual-heading">RESIDUES IN ONE PERIOD</span>
      <div className="residue-cells">
        {Array.from({ length: span }, (_, i) => {
          const first = i % Number(crt.m) === Number(crt.a),
            second = i % Number(crt.n) === Number(crt.b);
          return (
            <span
              key={i}
              className={
                first && second
                  ? 'both'
                  : first
                    ? 'first'
                    : second
                      ? 'second'
                      : ''
              }
              title={`${i}: ${first ? 'first ' : ''}${second ? 'second ' : ''}congruence`}
            >
              <MathText text={`\\(${i}\\)`} />
            </span>
          );
        })}
      </div>
      <div className="residue-legend">
        <span>● First class</span>
        <span>● Second class</span>
        <span>● Both</span>
      </div>
      <p>
        The highlighted overlap is a candidate; the theorem proves the complete
        solution class.
      </p>
    </div>
  );
}
