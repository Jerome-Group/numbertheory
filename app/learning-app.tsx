'use client';
import { useEffect, useState, type ComponentType } from 'react';
export function LearningApp() {
  const [App, setApp] = useState<ComponentType | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    import('../src/App')
      .then(({ App: LoadedApp }) => {
        if (active) setApp(() => LoadedApp);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);
  return App ? (
    <App />
  ) : (
    <main>
      <h1>Number Theory</h1>
      <p role="status">
        {failed
          ? 'Could not load the learning atlas. Reload to try again.'
          : 'Loading the learning atlas…'}
      </p>
    </main>
  );
}
