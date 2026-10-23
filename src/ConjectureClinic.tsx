import { useMemo, useRef, useSyncExternalStore } from 'react';
import {
  comparePreserved,
  defaultInvestigation,
  type EvidenceDisplay,
  inspectInvestigation,
  investigationCatalog,
  investigationFor,
  spokenMath,
} from './math/conjectures';
import { ProofNotebookOpen } from './ProofNotebookSession';
import { lessonPath } from './routes';
import { studyStore } from './state';
import './ConjectureClinic.css';

function Equation({ text }: { text: string }) {
  return (
    <p className="clinic-equation" role="math" aria-label={spokenMath(text)}>
      {text}
    </p>
  );
}
function WitnessFacts({ display }: { display: EvidenceDisplay }) {
  return (
    <>
      <div className="clinic-fact">
        <h4>The premise holds</h4>
        {display.premise.map((text) => (
          <Equation text={text} key={text} />
        ))}
      </div>
      <div className="clinic-fact">
        <h4>The conclusion fails</h4>
        {display.contradiction.map((text) => (
          <Equation text={text} key={text} />
        ))}
      </div>
    </>
  );
}
function ArithmeticDetails({
  display,
  kept = false,
}: {
  display: EvidenceDisplay;
  kept?: boolean;
}) {
  return (
    <details className="clinic-arithmetic">
      <summary>
        {kept ? 'Inspect the kept arithmetic' : 'Inspect the exact arithmetic'}
      </summary>
      {display.details.map((text) => (
        <Equation text={text} key={text} />
      ))}
      {display.tables.map((table) => (
        <table key={table.title}>
          <caption>{table.title}</caption>
          <thead>
            <tr>
              {table.headings.map((heading) => (
                <th scope="col" key={heading}>
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((value, index) =>
                  index === 0 ? (
                    <th scope="row" key={index}>
                      {value}
                    </th>
                  ) : (
                    <td key={index}>{value}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </details>
  );
}

export function ConjectureClinic({
  open,
}: {
  open: (id: string, section?: string) => void;
}) {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const picker = useRef<HTMLSelectElement>(null);
  const route = state.investigation;
  const report = useMemo(
    () => (route?.searched ? inspectInvestigation(route.selection) : null),
    [route],
  );
  const descriptor = route ? investigationFor(route.selection.id) : null;
  const kept = route ? state.keptWitnesses.get(route.selection.id) : undefined;
  const comparison =
    route && kept ? comparePreserved(route.selection, kept) : null;
  const sameKept =
    kept &&
    report?.kind === 'refuted' &&
    kept.display.summary === report.display.summary;
  const announcement = report
    ? report.kind === 'refuted'
      ? `${report.scope.counterexamples} counterexamples. The first exact witness is shown.`
      : 'No counterexample within these bounds. A finite search is not a proof.'
    : comparison
      ? comparison.reason
      : '';
  return (
    <section
      id="conjecture-clinic"
      className="conjecture-clinic"
      aria-labelledby="clinic-heading"
    >
      <header className="clinic-heading">
        <p className="eyebrow">CHANGE A CONDITION</p>
        <h2 id="clinic-heading" tabIndex={-1}>
          Conjecture Clinic
        </h2>
        <p>
          Find a case that breaks a claim. Repair the condition, then explain
          why it works.
        </p>
      </header>
      <div className="clinic-grid">
        <div className="clinic-controls">
          <label className="clinic-picker" htmlFor="clinic-case">
            Choose an investigation
          </label>
          <select
            id="clinic-case"
            ref={picker}
            value={route?.selection.id ?? ''}
            onChange={(event) => {
              const chosen = investigationCatalog().find(
                (item) => item.id === event.target.value,
              );
              if (chosen)
                studyStore.selectInvestigation(
                  defaultInvestigation(chosen.id).selection,
                );
            }}
          >
            <option value="" disabled>
              Choose a claim to investigate
            </option>
            {investigationCatalog().map((item) => (
              <option value={item.id} key={item.id}>
                {item.id} · {item.title}
              </option>
            ))}
          </select>
          {route && descriptor ? (
            <>
              <h3>{descriptor.title}</h3>
              <p className="clinic-label">Your conjecture</p>
              <p
                className="clinic-claim"
                role="math"
                aria-label={descriptor.accessibleStatement}
              >
                {descriptor.statement}
              </p>
              <p className="clinic-qualifier">{descriptor.qualifier}</p>
              <fieldset>
                <legend>Keep a condition</legend>
                {descriptor.choices.map((choice) => (
                  <label
                    className="clinic-choice"
                    key={choice.selection.condition}
                  >
                    <input
                      type="radio"
                      name="clinic-condition"
                      value={choice.selection.condition}
                      checked={
                        route.selection.condition === choice.selection.condition
                      }
                      onChange={() =>
                        studyStore.selectInvestigation(choice.selection)
                      }
                    />
                    <span>
                      {choice.label}
                      <small>{choice.detail}</small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <button
                type="button"
                className="clinic-search"
                onClick={studyStore.searchInvestigation}
              >
                {route.selection.condition === 'all'
                  ? 'Search exact cases'
                  : 'Test this repair'}
              </button>
              <p className="clinic-scope">
                <strong>Complete finite search.</strong> {descriptor.domain}
              </p>
              {kept && comparison && (
                <section
                  className="clinic-kept"
                  aria-labelledby="clinic-kept-heading"
                >
                  <p className="clinic-label">Kept witness</p>
                  <h3 id="clinic-kept-heading">
                    {comparison.kind === 'admitted'
                      ? 'Still admitted'
                      : 'Excluded by this condition'}
                  </h3>
                  <p className="clinic-witness-summary">
                    {kept.display.summary}
                  </p>
                  <p className="clinic-admission">{comparison.reason}</p>
                  <WitnessFacts display={kept.display} />
                  <p>
                    The arithmetic stays the same. The condition changes which
                    inputs the claim covers.
                  </p>
                  <ArithmeticDetails display={kept.display} kept />
                  <button
                    type="button"
                    onClick={() => {
                      studyStore.removeKeptWitness();
                      picker.current?.focus();
                    }}
                  >
                    Remove kept witness
                  </button>
                </section>
              )}
            </>
          ) : (
            <p className="clinic-start">
              Five claims. Each has a tempting incomplete repair. Choose one to
              compare exact evidence with a proof.
            </p>
          )}
        </div>
        <div className="clinic-reading">
          <section
            className="clinic-evidence"
            aria-labelledby="clinic-evidence-heading"
          >
            {report && descriptor ? (
              <>
                <p className="clinic-result-label">
                  {report.kind === 'refuted'
                    ? 'Counterexample found'
                    : 'Finite search completed'}
                </p>
                <h3 id="clinic-evidence-heading">
                  {report.kind === 'refuted'
                    ? 'The claim breaks here.'
                    : 'No counterexample within these bounds.'}
                </h3>
                {report.kind === 'refuted' ? (
                  <>
                    <p className="clinic-witness-summary">
                      {report.display.summary}
                    </p>
                    <WitnessFacts display={report.display} />
                    <p>{report.display.explanation}</p>
                    <ArithmeticDetails display={report.display} />
                    <button
                      type="button"
                      aria-pressed={Boolean(sameKept)}
                      onClick={studyStore.keepInvestigationWitness}
                    >
                      {sameKept
                        ? 'Witness kept in this tab'
                        : 'Keep this witness'}
                    </button>
                    <p className="clinic-lifetime">
                      Kept witnesses survive in-app navigation. Reload or close
                      clears them.
                    </p>
                  </>
                ) : (
                  <p className="clinic-finite-boundary">
                    No premise-true tested case violates the conclusion. This
                    finite evidence does not prove the general claim.
                  </p>
                )}
                <dl className="clinic-counts">
                  <div>
                    <dt>Admitted cases</dt>
                    <dd>{report.scope.admittedTuples.toLocaleString('en')}</dd>
                  </div>
                  <div>
                    <dt>Premise matches</dt>
                    <dd>{report.scope.premiseMatches.toLocaleString('en')}</dd>
                  </div>
                  <div>
                    <dt>Counterexamples</dt>
                    <dd>{report.scope.counterexamples.toLocaleString('en')}</dd>
                  </div>
                </dl>
                <p className="clinic-order">
                  All admitted cases checked. First witness order.{' '}
                  {descriptor.order}
                </p>
              </>
            ) : (
              <div className="clinic-empty">
                <span aria-hidden="true">∀</span>
                <h3 id="clinic-evidence-heading">
                  One case can change the claim.
                </h3>
                <p>
                  {route
                    ? 'Search the stated range, then inspect where the premise and conclusion part ways.'
                    : 'Choose an investigation to begin. You can read the proof at any time.'}
                </p>
              </div>
            )}
          </section>
          {descriptor && (
            <section
              className="clinic-proof"
              aria-labelledby="clinic-proof-heading"
            >
              <p className="clinic-label">FROM EVIDENCE TO PROOF</p>
              <h3 id="clinic-proof-heading">
                Why the repaired statement holds
              </h3>
              <p
                className="clinic-supported"
                role="math"
                aria-label={spokenMath(descriptor.choices[2].detail)}
              >
                {descriptor.choices[2].detail}
              </p>
              <p>{descriptor.bridge}</p>
              <p className="clinic-repair-boundary">
                This is a sufficient repair. Other valid conditions may exist.
              </p>
              <div className="clinic-proof-links">
                <a
                  href={`${lessonPath(descriptor.proofLessonId)}#proof`}
                  onClick={(event) => {
                    event.preventDefault();
                    open(descriptor.proofLessonId, 'proof');
                  }}
                >
                  Read the authored proof <span aria-hidden="true">→</span>
                </a>
                <ProofNotebookOpen lessonId={descriptor.notebookLessonId}>
                  Write why the repair works
                </ProofNotebookOpen>
              </div>
            </section>
          )}
        </div>
      </div>
      <p className="clinic-boundary">
        One counterexample refutes the displayed universal claim. A search
        without one is finite evidence. Searches receive no grade or mastery
        mark.
      </p>
      <p
        className="clinic-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </section>
  );
}
