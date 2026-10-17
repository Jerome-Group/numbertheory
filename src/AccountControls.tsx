import { useEffect, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { type ProgressStatus, progressStore } from './progress';

function authPath(action: 'signin' | 'signout') {
  const path =
    window.location.pathname + window.location.search + window.location.hash;
  const returnTo = path.startsWith('//') ? '/' : path;
  return `/${action}-with-chatgpt?return_to=${encodeURIComponent(returnTo)}`;
}

export function ProgressNotice({ status }: { status: ProgressStatus }) {
  const needsReload =
    status.kind === 'unavailable' ||
    status.kind === 'error' ||
    status.kind === 'uncertain' ||
    status.kind === 'conflict';
  return (
    <div className="progress-notice">
      <p role="status">
        {'message' in status
          ? status.message
          : status.kind === 'saving'
            ? 'Saving progress… Your last confirmed marks remain visible.'
            : status.kind === 'ready'
              ? 'Marks are saved to your account after confirmation.'
              : status.kind === 'anonymous'
                ? 'Sign in with ChatGPT to save lesson marks.'
                : 'Loading account progress. Lessons remain available.'}
      </p>
      {status.kind === 'anonymous' && (
        <a href={authPath('signin')} target="_top">
          Sign in with ChatGPT
        </a>
      )}
      {needsReload && (
        <button type="button" onClick={() => void progressStore.reload()}>
          Reload progress
        </button>
      )}
    </div>
  );
}

export function AccountControls() {
  const status = useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getStatusSnapshot,
  );
  useEffect(() => {
    void progressStore.reload();
    const refresh = () => {
      if (document.visibilityState === 'visible') void progressStore.reload();
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) void progressStore.reload();
    };
    const clear = () => flushSync(progressStore.clearSession);
    window.addEventListener('pagehide', clear);
    window.addEventListener('pageshow', restore);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('pagehide', clear);
      window.removeEventListener('pageshow', restore);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return (
    <nav className="account-controls" aria-label="Progress account">
      {'accountId' in status ? (
        <>
          <span>{status.displayName ?? 'Signed in with ChatGPT'}</span>
          <a
            href={authPath('signout')}
            target="_top"
            onClick={() => flushSync(progressStore.clearSession)}
          >
            Sign out
          </a>
        </>
      ) : status.kind === 'unknown' || status.kind === 'loading' ? (
        <span role="status">Checking progress…</span>
      ) : (
        <a href={authPath('signin')} target="_top">
          Sign in with ChatGPT
        </a>
      )}
      {status.kind === 'saving' && <span role="status">Saving progress…</span>}
      {status.kind === 'uncertain' && (
        <span role="status">Save unconfirmed</span>
      )}
      {status.kind === 'conflict' && (
        <span role="status">Progress changed elsewhere</span>
      )}
      {(status.kind === 'unavailable' || status.kind === 'error') && (
        <span role="status">Progress unavailable</span>
      )}
      {(status.kind === 'unavailable' ||
        status.kind === 'uncertain' ||
        status.kind === 'conflict' ||
        status.kind === 'error') && (
        <button type="button" onClick={() => void progressStore.reload()}>
          Reload progress
        </button>
      )}
    </nav>
  );
}
