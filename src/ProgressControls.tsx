import { useRef, useState, useSyncExternalStore } from 'react';
import { progressStore } from './progress';

export function ProgressControls() {
  const progress = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
  );
  const [backup, setBackup] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const backupText = useRef<HTMLTextAreaElement>(null);
  const clearButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const [restore, setRestore] = useState('');
  const [message, setMessage] = useState(
    'Only this browser stores your marks.',
  );
  function closeReset() {
    setConfirmReset(false);
    requestAnimationFrame(() => clearButton.current?.focus());
  }
  async function copyProgress() {
    setBackup(true);
    try {
      await navigator.clipboard.writeText(progressStore.exportJson());
      setMessage('JSON backup copied. Save it somewhere you can find again.');
    } catch {
      setMessage('Select and copy the backup text below to save your marks.');
      requestAnimationFrame(() => {
        backupText.current?.focus();
        backupText.current?.select();
      });
    }
  }
  async function importProgress(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setMessage('Progress file is too large.');
      return;
    }
    try {
      progressStore.importJson(await file.text());
      setMessage('Progress restored from this file.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Invalid progress file.',
      );
    }
  }
  return (
    <section className="progress-management" aria-labelledby="progress-title">
      <h2 id="progress-title">Your local progress</h2>
      <p>Save a copy, restore it on this device, or clear every local mark.</p>
      <div className="progress-management-actions">
        <button type="button" onClick={() => void copyProgress()}>
          Copy JSON backup
        </button>
        <label>
          Import marks
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              void importProgress(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        <button
          type="button"
          ref={clearButton}
          aria-expanded={confirmReset}
          aria-controls="progress-reset-confirmation"
          onClick={() => {
            setConfirmReset(true);
            requestAnimationFrame(() => cancelButton.current?.focus());
          }}
        >
          Clear marks
        </button>
        <button
          type="button"
          aria-expanded={backup}
          onClick={() => setBackup(!backup)}
        >
          {backup ? 'Hide backup text' : 'Show backup text'}
        </button>
      </div>
      {confirmReset && (
        <fieldset
          id="progress-reset-confirmation"
          className="progress-reset-confirmation"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              closeReset();
            }
          }}
        >
          <legend>Confirm clearing marks</legend>
          <p id="progress-reset-question">
            Clear every local lesson mark on this device? Keep a JSON backup
            first.
          </p>
          <button
            type="button"
            ref={cancelButton}
            aria-describedby="progress-reset-question"
            onClick={closeReset}
          >
            Cancel
          </button>
          <button
            type="button"
            aria-describedby="progress-reset-question"
            onClick={() => {
              progressStore.reset();
              closeReset();
              setMessage('All local marks cleared.');
            }}
          >
            Clear all marks
          </button>
        </fieldset>
      )}
      <p role="status">{message}</p>
      {progressStore.getStorageStatus() === 'recovered' && (
        <p role="alert">
          Some saved marks were unreadable. Valid marks were kept; restore a
          backup if needed.
        </p>
      )}
      {progressStore.getStorageStatus() === 'session' && (
        <p role="alert">
          Storage unavailable: marks last for this session. Keep a backup before
          closing.
        </p>
      )}
      {backup && (
        <div className="progress-text-backup">
          <label>
            Progress backup
            <textarea
              ref={backupText}
              readOnly
              value={JSON.stringify(
                { schemaVersion: 1, lessons: progress },
                null,
                2,
              )}
            />
          </label>
          <label>
            Restore from backup text
            <textarea
              value={restore}
              onChange={(event) => setRestore(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              try {
                progressStore.importJson(restore);
                setMessage('Progress restored from backup text.');
              } catch (error) {
                setMessage(
                  error instanceof Error
                    ? error.message
                    : 'Invalid progress backup.',
                );
              }
            }}
          >
            Restore backup text
          </button>
        </div>
      )}
    </section>
  );
}
