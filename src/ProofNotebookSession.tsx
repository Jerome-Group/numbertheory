import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { lessons } from './content/lessons';
import {
  type Notebook,
  type NotebookAction,
  reduceNotebook,
  sourceFor,
} from './proof-notebook';
import { type AtlasView, studyStore } from './state';

const blank = reduceNotebook(undefined, { kind: 'reset' });
const NotebookContext = createContext<{
  activeId: string;
  notebook: Notebook;
  issue: string | null;
  open: (id: string) => void;
  act: (action: NotebookAction) => void;
} | null>(null);

export function ProofNotebookSession({
  children,
  view,
}: {
  children: ReactNode;
  view: AtlasView;
}) {
  const [activeId, setActiveId] = useState(lessons[0].id);
  const [records, setRecords] = useState<ReadonlyMap<string, Notebook>>(
    () => new Map(),
  );
  const [issue, setIssue] = useState<string | null>(null);
  const requested = new URLSearchParams(window.location.search).get('proof');
  useEffect(() => {
    if (view !== 'practice') return;
    if (requested === null) {
      setIssue(null);
      return;
    }
    if (sourceFor(requested)) {
      setActiveId(requested);
      setIssue(null);
    } else {
      setIssue(
        `Unknown proof lesson "${requested}". Choose a lesson below or open the first notebook. Other drafts in this tab are unchanged.`,
      );
    }
  }, [view, requested]);
  function open(id: string) {
    if (!sourceFor(id)) return;
    setActiveId(id);
    setIssue(null);
    if (view !== 'practice') studyStore.openView('practice');
    const url = new URL(window.location.href);
    url.searchParams.set('proof', id);
    url.hash = 'proof-notebook';
    if (view === 'practice') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }
  function act(action: NotebookAction) {
    setRecords((current) => {
      const next = new Map(current);
      next.set(activeId, reduceNotebook(current.get(activeId), action));
      return next;
    });
  }
  return (
    <NotebookContext
      value={{
        activeId,
        notebook: records.get(activeId) ?? blank,
        issue,
        open,
        act,
      }}
    >
      {children}
    </NotebookContext>
  );
}

export function useProofNotebook() {
  const session = useContext(NotebookContext);
  if (!session) throw new Error('Proof notebook needs an App session.');
  return session;
}

export function ProofNotebookOpen({
  lessonId,
  children = 'Write your own proof',
}: {
  lessonId: string;
  children?: ReactNode;
}) {
  const { open } = useProofNotebook();
  return (
    <button
      type="button"
      className="notebook-open"
      onClick={() => open(lessonId)}
    >
      {children} <span aria-hidden="true">→</span>
    </button>
  );
}
