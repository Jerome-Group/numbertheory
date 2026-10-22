import { useEffect, useRef, useState } from 'react';
import { lessons } from './content/lessons';
import { MathText } from './MathText';
import { useProofNotebook } from './ProofNotebookSession';
import {
  ProofNotebookCues,
  ProofNotebookReference,
} from './ProofNotebookSource';
import { exportNotebook, type ProofSource, sourceFor } from './proof-notebook';
import './ProofNotebook.css';

const chapters = [...new Set(lessons.map((lesson) => lesson.cluster))];

export function ProofNotebook({ open }: { open: (id: string) => void }) {
  const session = useProofNotebook();
  const picker = useRef<HTMLSelectElement>(null);
  const source = sourceFor(session.activeId);
  if (!source) throw new Error('Selected proof source is unavailable.');
  return (
    <section
      id="proof-notebook"
      className="proof-notebook"
      aria-labelledby="proof-notebook-heading"
    >
      <header className="notebook-heading">
        <span className="eyebrow">PROOF NOTEBOOK</span>
        <h2 id="proof-notebook-heading" tabIndex={-1}>
          Build the argument
        </h2>
        <p>
          Write a whole proof, compare it with the source, then decide what to
          revise. No automatic grading. Account marks remain your own choice.
        </p>
      </header>
      <p className="notebook-lifetime" id="notebook-lifetime">
        <strong>Private to this tab. No sign-in needed.</strong> Writing stays
        through in-app navigation. Reloading or closing this tab clears every
        attempt. Export before you leave to keep a copy.
      </p>
      {session.issue && (
        <div className="notebook-recovery" role="status">
          <p>{session.issue}</p>
          <button
            type="button"
            onClick={() => {
              session.open(lessons[0].id);
              requestAnimationFrame(() => picker.current?.focus());
            }}
          >
            Open first lesson notebook
          </button>
        </div>
      )}
      <div className="notebook-picker">
        <label htmlFor="notebook-lesson">Lesson to prove</label>
        <select
          id="notebook-lesson"
          ref={picker}
          value={source.id}
          onChange={(event) => session.open(event.target.value)}
        >
          {chapters.map((chapter) => (
            <optgroup label={chapter} key={chapter}>
              {lessons
                .filter((lesson) => lesson.cluster === chapter)
                .map((lesson) => (
                  <option value={lesson.id} key={lesson.id}>
                    {lesson.id} · {lesson.title}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <button type="button" onClick={() => open(source.id)}>
          Read this lesson
        </button>
      </div>
      <div className="notebook-claim">
        <span className="callout-label">{source.id} · THE CLAIM TO PROVE</span>
        <h3>{source.title}</h3>
        <p>
          <MathText text={source.claim} />
        </p>
      </div>
      <ProofNotebookCues key={`cues:${source.id}`} source={source} />
      <NotebookWorkspace key={`workspace:${source.id}`} source={source} />
    </section>
  );
}

function NotebookWorkspace({ source }: { source: ProofSource }) {
  const { notebook, act } = useProofNotebook();
  const [confirmReset, setConfirmReset] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [message, setMessage] = useState('');
  const editor = useRef<HTMLTextAreaElement>(null);
  const comparison = useRef<HTMLHeadingElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const exportText = useRef<HTMLTextAreaElement>(null);
  const previousKind = useRef(notebook.kind);
  useEffect(() => {
    if (previousKind.current === notebook.kind) return;
    previousKind.current = notebook.kind;
    if (notebook.kind === 'comparing') comparison.current?.focus();
    else editor.current?.focus();
  }, [notebook.kind]);
  const markdown = exportNotebook({ source, notebook });
  function closeReset() {
    setConfirmReset(false);
    requestAnimationFrame(() => resetButton.current?.focus());
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([markdown], { type: 'text/markdown;charset=utf-8' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `numbertheory-${source.id.toLowerCase()}-proof-notebook.md`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setShowExport(true);
    setMessage(
      'Markdown prepared for download. Selectable text below contains the same copy if your browser does not save the file.',
    );
  }
  return (
    <div className="notebook-workspace">
      {notebook.kind === 'writing' ? (
        <div className="notebook-writing">
          <div className="notebook-panel-heading">
            <h3>Attempt {notebook.history.length + 1}</h3>
            <span>YOUR REASONING</span>
          </div>
          <details className="notebook-writing-source">
            <summary>Read the source proof now</summary>
            <ProofNotebookReference source={source} />
          </details>
          <label htmlFor="notebook-draft">Your whole argument</label>
          <p id="notebook-writing-help">
            State the assumptions, justify each step, and reach the claim. Use
            plain text or LaTeX notation. Read the source whenever it helps. You
            can also compare an empty page.
          </p>
          <textarea
            id="notebook-draft"
            ref={editor}
            rows={12}
            value={notebook.text}
            aria-describedby="notebook-lifetime notebook-writing-help"
            placeholder="Start with what is given and what you need to show…"
            onChange={(event) =>
              act({ kind: 'write', text: event.target.value })
            }
          />
          <div className="notebook-actions">
            <button
              type="button"
              className="notebook-primary"
              onClick={() => act({ kind: 'compare' })}
            >
              Compare with source
            </button>
            <p>
              Comparison keeps an unchanged copy of this attempt, including an
              empty page.
            </p>
          </div>
        </div>
      ) : (
        <div className="notebook-review">
          <h3 ref={comparison} tabIndex={-1}>
            Compare attempt {notebook.history.length + 1}
          </h3>
          <p>Your captured argument stays unchanged while you reflect.</p>
          <div className="notebook-comparison">
            <div className="notebook-capture">
              <h4>Your captured argument</h4>
              <pre>{notebook.capture.text || '[No text captured]'}</pre>
            </div>
            <ProofNotebookReference source={source} />
          </div>
          <label htmlFor="notebook-reflection">
            What will you keep or change?
          </label>
          <p id="notebook-reflection-help">
            Check any missing assumptions, unjustified transitions, or gaps in
            the conclusion. Explain why your route works if it differs from the
            source. This reflection is your self-assessment.
          </p>
          <textarea
            id="notebook-reflection"
            rows={4}
            value={notebook.capture.reflection}
            aria-describedby="notebook-reflection-help"
            onChange={(event) =>
              act({ kind: 'reflect', text: event.target.value })
            }
          />
          <div className="notebook-actions">
            <button
              type="button"
              className="notebook-primary"
              onClick={() => act({ kind: 'revise' })}
            >
              Revise this argument
            </button>
            <button type="button" onClick={() => act({ kind: 'new' })}>
              New blank attempt
            </button>
          </div>
          <p>
            Both choices keep this capture and reflection in the history below.
          </p>
        </div>
      )}
      {notebook.history.length > 0 && (
        <details className="notebook-history">
          <summary>
            Earlier captured attempts ({notebook.history.length})
          </summary>
          {notebook.history.map((capture, index) => (
            <article key={index}>
              <h3>Captured attempt {index + 1}</h3>
              <pre>{capture.text || '[No text captured]'}</pre>
              <h4>Learner reflection</h4>
              <pre>{capture.reflection || 'No reflection recorded.'}</pre>
            </article>
          ))}
        </details>
      )}
      <div className="notebook-tools">
        <button
          type="button"
          aria-expanded={showExport}
          aria-controls="notebook-export"
          onClick={() => setShowExport(!showExport)}
        >
          {showExport ? 'Hide Markdown' : 'Show Markdown export'}
        </button>
        <button type="button" onClick={download}>
          Download Markdown
        </button>
        <button
          type="button"
          ref={resetButton}
          aria-expanded={confirmReset}
          aria-controls="notebook-reset"
          onClick={() => {
            setConfirmReset(true);
            requestAnimationFrame(() => cancelButton.current?.focus());
          }}
        >
          Reset this lesson notebook
        </button>
      </div>
      {confirmReset && (
        <fieldset
          id="notebook-reset"
          className="notebook-reset"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeReset();
            }
          }}
        >
          <legend>Confirm notebook reset</legend>
          <p id="notebook-reset-question">
            Clear every attempt and reflection for {source.id} in this tab?
            Export first to keep a copy. Other lesson notebooks stay intact.
          </p>
          <button type="button" ref={cancelButton} onClick={closeReset}>
            Cancel
          </button>
          <button
            type="button"
            aria-describedby="notebook-reset-question"
            onClick={() => {
              act({ kind: 'reset' });
              closeReset();
              setMessage(`Notebook for ${source.id} cleared in this tab.`);
            }}
          >
            Clear this lesson notebook
          </button>
        </fieldset>
      )}
      {message && <p role="status">{message}</p>}
      {showExport && (
        <div id="notebook-export" className="notebook-export">
          <label htmlFor="notebook-markdown">Notebook Markdown</label>
          <p>
            Includes every capture, the current draft or reflection, and the
            exact source proof with its lesson locator. Select and copy this
            text to keep it outside the tab.
          </p>
          <button
            type="button"
            onClick={() => {
              exportText.current?.focus();
              exportText.current?.select();
            }}
          >
            Select all Markdown
          </button>
          <textarea
            id="notebook-markdown"
            ref={exportText}
            readOnly
            rows={10}
            value={markdown}
          />
        </div>
      )}
    </div>
  );
}
