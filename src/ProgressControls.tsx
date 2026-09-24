import { useState } from 'react';
import { progressStore } from './progress';

export function ProgressControls() {
  const [message, setMessage] = useState(
    'Only this browser stores your marks.',
  );
  function exportProgress() {
    const blob = new Blob([progressStore.exportJson()], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'number-theory-progress.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setMessage('Progress export started.');
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
        <button type="button" onClick={exportProgress}>
          Export marks
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
          onClick={() => {
            if (
              window.confirm('Clear all local lesson marks on this device?')
            ) {
              progressStore.reset();
              setMessage('All local marks cleared.');
            }
          }}
        >
          Clear marks
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
