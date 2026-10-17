import { useRef, useState, useSyncExternalStore } from 'react';
import { ProgressNotice } from './AccountControls';
import {
  canSaveProgress,
  type LegacyProgress,
  type ProgressStatus,
  progressStore,
} from './progress';

export function ProgressControls() {
  const status = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getStatusSnapshot,
  );
  return (
    <section className="progress-management" aria-labelledby="progress-title">
      <h2 id="progress-title">Your account progress</h2>
      <p>Keep a backup, restore saved marks, or clear your account's marks.</p>
      <ProgressNotice status={status} />
      {'accountId' in status && (
        <AccountProgressControls key={status.accountId} status={status} />
      )}
    </section>
  );
}

function AccountProgressControls({
  status,
}: {
  status: Extract<ProgressStatus, { accountId: unknown }>;
}) {
  const progress = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
  );
  const [backup, setBackup] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [legacy, setLegacy] = useState<LegacyProgress | null>(null);
  const backupText = useRef<HTMLTextAreaElement>(null);
  const clearButton = useRef<HTMLButtonElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const [restore, setRestore] = useState('');
  const [message, setMessage] = useState('');
  const canSave = canSaveProgress(status);
  const accountId = status.accountId;

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
  async function restoreProgress(text: string) {
    setMessage('');
    try {
      if (await progressStore.importJson({ text, accountId }))
        setMessage('Progress restored to your account.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Invalid progress backup.',
      );
    }
  }
  async function importProgress(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setMessage('Progress file is too large.');
      return;
    }
    try {
      await restoreProgress(await file.text());
    } catch {
      setMessage('Progress file could not be read.');
    }
  }
  return (
    <>
      <div className="progress-management-actions">
        <button type="button" onClick={() => void copyProgress()}>
          Copy JSON backup
        </button>
        <label>
          Import marks
          <input
            type="file"
            accept="application/json,.json"
            disabled={!canSave}
            onChange={(event) => {
              void importProgress(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </label>
        <button
          type="button"
          ref={clearButton}
          disabled={!canSave}
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
            Clear every lesson mark saved to this account? Keep a JSON backup
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
            disabled={!canSave}
            aria-describedby="progress-reset-question"
            onClick={async () => {
              setMessage('');
              if (await progressStore.reset(accountId)) {
                closeReset();
                setMessage('All account marks cleared.');
              }
            }}
          >
            Clear all marks
          </button>
        </fieldset>
      )}
      <div className="legacy-progress">
        <button
          type="button"
          disabled={!canSave}
          onClick={() => setLegacy(progressStore.readLegacy())}
        >
          Check this device for older marks
        </button>
        {legacy?.kind === 'available' && (
          <>
            <p>
              Found {Object.keys(legacy.lessons).length} older device marks.
              Import keeps your account's existing marks. Device data stays
              unchanged.
              {legacy.ignored > 0 &&
                ` ${legacy.ignored} unreadable entries were skipped.`}
            </p>
            <button
              type="button"
              disabled={!canSave}
              onClick={async () => {
                setMessage('');
                if (
                  await progressStore.importLegacy({
                    accountId,
                    lessons: legacy.lessons,
                  })
                ) {
                  setLegacy(null);
                  setMessage('Older device marks imported to your account.');
                }
              }}
            >
              Import older device marks
            </button>
          </>
        )}
        {legacy?.kind === 'empty' && <p>No older device marks found.</p>}
        {legacy?.kind === 'unavailable' && (
          <p>Browser storage is unavailable. You can restore a JSON backup.</p>
        )}
        {legacy?.kind === 'invalid' && (
          <p>Older device data is unreadable. The original data was kept.</p>
        )}
      </div>
      <p role="status">{message}</p>
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
            disabled={!canSave}
            onClick={() => void restoreProgress(restore)}
          >
            Restore backup text
          </button>
        </div>
      )}
    </>
  );
}
