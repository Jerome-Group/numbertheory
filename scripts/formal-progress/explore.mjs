import { bounds, compileStore, replay } from './boundary.mjs';

export { bounds } from './boundary.mjs';

const expectedKinds = {
  200: { GET: 'ready', PATCH: 'ready' },
  401: { GET: 'anonymous', PATCH: 'anonymous' },
  409: { GET: 'unavailable', PATCH: 'conflict' },
  400: { GET: 'unavailable', PATCH: 'error' },
  403: { GET: 'unavailable', PATCH: 'error' },
  413: { GET: 'unavailable', PATCH: 'error' },
  415: { GET: 'unavailable', PATCH: 'error' },
  500: { GET: 'unavailable', PATCH: 'uncertain' },
};

export async function explore(root, sourceFile) {
  const createBoundary = await compileStore(root, sourceFile);
  const smoke = [];
  for (const method of ['GET', 'PATCH']) {
    for (const status of bounds.outcomes.filter(Number.isInteger)) {
      const actions = [
        { kind: method === 'GET' ? 'reload' : 'write' },
        { kind: 'headers', request: 0, status },
      ];
      if (status === 200)
        actions.push({
          kind: 'body',
          request: 0,
          body: { kind: 'document', owner: 0 },
        });
      if (status === 409 && method === 'PATCH')
        actions.push({ kind: 'body', request: 0, body: { kind: 'conflict' } });
      const expected = expectedKinds[status][method];
      const result = await replay(createBoundary, actions);
      smoke.push({
        method,
        status,
        expected,
        actual: result.final?.status.kind,
        passed: result.passed && result.final?.status.kind === expected,
        outcomes: result.outcomes,
        actions,
      });
    }
  }
  for (const kind of ['account_changed', 'invalid']) {
    const actions = [
      { kind: 'write' },
      { kind: 'headers', request: 0, status: 409 },
      { kind: 'body', request: 0, body: { kind } },
    ];
    const result = await replay(createBoundary, actions);
    const expected = kind === 'account_changed' ? 'unavailable' : 'uncertain';
    smoke.push({
      method: 'PATCH',
      status: 409,
      body: kind,
      expected,
      actual: result.final?.status.kind,
      passed: result.passed && result.final?.status.kind === expected,
      outcomes: result.outcomes,
      actions,
    });
  }
  let frontier = [[]];
  let checked = 0;
  const outcomes = {};
  for (let depth = 0; depth <= bounds.eventsAfterReady; depth++) {
    const next = [];
    for (const actions of frontier) {
      const result = await replay(createBoundary, actions);
      checked++;
      for (const [key, count] of Object.entries(result.outcomes ?? {}))
        outcomes[key] = (outcomes[key] ?? 0) + count;
      if (!result.passed) return { ...result, checked, bounds };
      if (depth < bounds.eventsAfterReady) {
        for (const action of result.choices) next.push([...actions, action]);
      }
    }
    frontier = next;
  }
  const requiredOutcomes = ['GET', 'PATCH']
    .flatMap((method) => [
      ...bounds.outcomes
        .filter(Number.isInteger)
        .map((status) => `${method}:headers:${status}`),
      `${method}:json:200`,
      `${method}:body:200:document`,
      `${method}:fetch-rejection`,
      `${method}:body-rejection:200`,
    ])
    .concat(
      'PATCH:json:409',
      'PATCH:body-rejection:409',
      ...['conflict', 'account_changed', 'invalid'].map(
        (kind) => `PATCH:body:409:${kind}`,
      ),
    );
  const missingOutcomes = requiredOutcomes.filter((key) => !outcomes[key]);
  return {
    passed: smoke.every(({ passed }) => passed) && !missingOutcomes.length,
    missingOutcomes,
    property: 'PrivateStateCurrent',
    checked,
    bounds,
    outcomes,
    smoke,
  };
}
