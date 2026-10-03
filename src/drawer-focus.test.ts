import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from '@typescript/typescript6';

type RenderNode = { type: unknown; props: Record<string, unknown> };
type FocusElement = {
  name: string;
  parent?: FocusElement;
  inert: boolean;
  tabIndex: number;
  style: { overflow: string };
  focus: () => void;
  getClientRects: () => object[];
  scrollIntoView: () => void;
  querySelector: (selector: string) => FocusElement | null;
  querySelectorAll: () => FocusElement[];
};
type Effect = () => undefined | (() => void);
type Hook = {
  value?: unknown;
  dependencies?: unknown[];
  cleanup?: () => void;
};
type KeyEvent = {
  key: string;
  shiftKey: boolean;
  preventDefault: () => void;
};

const appSource = readFileSync(
  process.env.APP_FOCUS_TEST_SOURCE ?? new URL('./App.tsx', import.meta.url),
  'utf8',
);
const compiledApp = ts.transpileModule(appSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

// The bounded DOM model enforces inert ancestors; native browser QA remains separate.
function mountApp() {
  const hooks: Hook[] = [];
  const effects: { index: number; callback: Effect }[] = [];
  const frames: (() => void)[] = [];
  const listeners = new Set<(event: KeyEvent) => void>();
  const focusAttempts: { target: string; blocked: boolean }[] = [];
  let hookIndex = 0;
  let dirty = true;
  let state = { view: 'learn', lessonId: null as string | null };
  let revision = 0;
  let rendered: RenderNode;
  let active: FocusElement | null = null;
  const location = new URL('http://localhost/');
  const body = element('body');
  const main = element('main', body);
  const menu = element('menu', main);
  const sidebar = element('sidebar', body);
  const search = element('search', sidebar);
  const close = element('close', sidebar);
  const lastLink = element('last-lesson', sidebar);
  let heading = element('learn-heading', main);
  const readingRoot = element('reading-root', main);
  const section = element('proof', readingRoot);
  const sectionHeading = element('proof-heading', section);
  body.style = { overflow: '' };

  function element(name: string, parent?: FocusElement): FocusElement {
    return {
      name,
      parent,
      inert: false,
      tabIndex: 0,
      style: { overflow: '' },
      focus() {
        let ancestor: FocusElement | undefined = this;
        let blocked = false;
        while (ancestor) {
          blocked ||= ancestor.inert;
          ancestor = ancestor.parent;
        }
        focusAttempts.push({ target: name, blocked });
        if (!blocked) active = this;
      },
      getClientRects: () => [{}],
      scrollIntoView: () => {},
      querySelector(selector: string): FocusElement | null {
        if (name === 'sidebar' && selector === '#lesson-search') return search;
        if (name === 'reading-root' && selector === '#proof') return section;
        if (name === 'proof' && selector === 'h2') return sectionHeading;
        return null;
      },
      querySelectorAll: () => [close, search, lastLink],
    };
  }
  function changed(previous: unknown[] | undefined, next: unknown[]) {
    return !previous || next.some((value, i) => !Object.is(value, previous[i]));
  }
  const react = {
    useState(initial: unknown) {
      const index = hookIndex++;
      hooks[index] ??= { value: initial };
      return [
        hooks[index].value,
        (value: unknown) => {
          if (!Object.is(hooks[index].value, value)) {
            hooks[index].value = value;
            dirty = true;
          }
        },
      ];
    },
    useRef(initial: unknown) {
      const index = hookIndex++;
      hooks[index] ??= { value: { current: initial } };
      return hooks[index].value;
    },
    useCallback(callback: unknown, dependencies: unknown[]) {
      const index = hookIndex++;
      hooks[index] ??= {};
      const hook = hooks[index];
      if (changed(hook.dependencies, dependencies)) {
        hook.value = callback;
        hook.dependencies = dependencies;
      }
      return hook.value;
    },
    useEffect(callback: Effect, dependencies: unknown[]) {
      const index = hookIndex++;
      hooks[index] ??= {};
      const hook = hooks[index];
      if (changed(hook.dependencies, dependencies)) {
        hook.dependencies = dependencies;
        effects.push({ index, callback });
      }
    },
    useSyncExternalStore(_subscribe: unknown, snapshot: () => unknown) {
      hookIndex++;
      return snapshot();
    },
  };
  const store = {
    subscribe: () => {},
    getSnapshot: () => state,
    getNavigationRevision: () => revision,
    openLesson(id: string) {
      state = { view: 'lesson', lessonId: id };
      revision++;
      dirty = true;
    },
  };
  const node = (type: unknown, props: Record<string, unknown>): RenderNode => ({
    type,
    props,
  });
  const modules: Record<string, unknown> = {
    react,
    'react/jsx-runtime': { jsx: node, jsxs: node },
    './AtlasViews': { AtlasViews: 'AtlasViews' },
    './LessonPage': { LessonPage: 'LessonPage' },
    './Sidebar': { Sidebar: 'Sidebar' },
    './content/lessons': {
      lessons: [
        { id: 'P00', title: 'First lesson' },
        { id: 'P01', title: 'Next lesson' },
      ],
    },
    './state': { studyStore: store },
    './webmcp/register': { registerStudyTools: () => () => {} },
  };
  const exports: { App?: () => RenderNode } = {};
  runInNewContext(compiledApp, {
    exports,
    require(name: string) {
      assert.ok(
        Object.hasOwn(modules, name),
        `Unexpected App dependency ${name}`,
      );
      return modules[name];
    },
    URL,
    requestAnimationFrame: (callback: () => void) => frames.push(callback),
    document: {
      body,
      get activeElement() {
        return active;
      },
      getElementById: (id: string) =>
        (
          ({ 'main-content': main, 'lesson-sidebar': sidebar }) as Record<
            string,
            FocusElement
          >
        )[id],
      querySelector: (selector: string) =>
        selector.startsWith('[data-lesson-id=') ? readingRoot : heading,
      addEventListener: (_name: string, listener: (event: KeyEvent) => void) =>
        listeners.add(listener),
      removeEventListener: (
        _name: string,
        listener: (event: KeyEvent) => void,
      ) => listeners.delete(listener),
    },
    window: {
      location,
      scrollTo: () => {},
      history: {
        replaceState: (_state: unknown, _title: string, url: URL) => {
          location.href = url.href;
        },
      },
    },
  });
  const App = exports.App as () => RenderNode;
  assert.ok(App);

  function find(predicate: (item: RenderNode) => boolean): RenderNode {
    function walk(value: unknown): RenderNode | undefined {
      if (Array.isArray(value)) {
        for (const child of value) {
          const result = walk(child);
          if (result) return result;
        }
      } else if (value && typeof value === 'object' && 'props' in value) {
        const item = value as RenderNode;
        if (predicate(item)) return item;
        return walk(item.props.children);
      }
      return undefined;
    }
    const result = walk(rendered);
    assert.ok(result, 'Actual App rendered control missing');
    return result;
  }
  function act(action?: () => void) {
    action?.();
    let commits = 0;
    while (dirty) {
      assert.ok(++commits <= 10, 'App update did not settle');
      dirty = false;
      hookIndex = 0;
      rendered = App();
      heading = element(
        state.view === 'lesson' ? `lesson-${state.lessonId}` : 'learn-heading',
        main,
      );
      const menuRef = find(
        (item) => item.props['aria-label'] === 'Open lessons',
      ).props.ref as { current: unknown };
      menuRef.current = menu;
      // React completes old passive cleanups before running the new passive setups.
      const pending = effects.splice(0);
      for (const effect of pending) hooks[effect.index].cleanup?.();
      for (const effect of pending) {
        hooks[effect.index].cleanup = effect.callback() ?? undefined;
      }
    }
    for (const frame of frames.splice(0)) frame();
  }
  function click(label: string) {
    const button = find((item) => item.props['aria-label'] === label);
    act(button.props.onClick as () => void);
  }
  function sidebarAction(name: 'onClose' | 'onSelect', id?: string) {
    const props = find((item) => item.type === 'Sidebar').props;
    act(() => (props[name] as (id?: string) => void)(id));
  }
  function key(key: string, shiftKey = false) {
    let prevented = false;
    act(() => {
      for (const listener of listeners) {
        listener({
          key,
          shiftKey,
          preventDefault: () => {
            prevented = true;
          },
        });
      }
    });
    return prevented;
  }
  act();
  return {
    act,
    click,
    sidebarAction,
    key,
    main,
    body,
    search,
    close,
    lastLink,
    focusAttempts,
    get active() {
      return active?.name;
    },
    get heading() {
      return heading;
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}

for (const method of ['Escape', 'Sidebar close', 'Backdrop'] as const) {
  test(`drawer ${method} restores menu focus after removing main inert`, () => {
    const app = mountApp();
    app.click('Open lessons');
    assert.equal(app.main.inert, true);
    assert.equal(app.active, 'search');
    app.heading.focus();
    assert.equal(
      app.active,
      'search',
      'Inert main must reject descendant focus',
    );
    if (method === 'Escape') app.key('Escape');
    else if (method === 'Sidebar close') app.sidebarAction('onClose');
    else app.click('Close lesson navigation');
    assert.equal(app.main.inert, false);
    assert.equal(app.body.style.overflow, '');
    assert.equal(app.listenerCount, 0);
    assert.equal(app.active, 'menu');
    assert.equal(
      app.focusAttempts.some(
        (attempt) => attempt.target === 'menu' && attempt.blocked,
      ),
      false,
    );
  });
}

for (const sameLesson of [false, true]) {
  test(`drawer selection focuses lesson heading, including same lesson: ${sameLesson}`, () => {
    const app = mountApp();
    app.sidebarAction('onSelect', 'P00');
    app.click('Open lessons');
    const start = app.focusAttempts.length;
    app.sidebarAction('onSelect', sameLesson ? 'P00' : 'P01');
    assert.equal(app.main.inert, false);
    assert.equal(app.active, sameLesson ? 'lesson-P00' : 'lesson-P01');
    assert.equal(app.listenerCount, 0);
    assert.equal(
      app.focusAttempts
        .slice(start)
        .some((attempt) => attempt.target === 'menu'),
      false,
    );
  });
}

test('drawer Tab wraps visible controls and stops trapping after close', () => {
  const app = mountApp();
  app.click('Open lessons');
  app.close.focus();
  assert.equal(app.key('Tab', true), true);
  assert.equal(app.active, 'last-lesson');
  assert.equal(app.key('Tab'), true);
  assert.equal(app.active, 'close');
  app.sidebarAction('onClose');
  assert.equal(app.key('Tab'), false);
});
