import { bounds, compileStore, replay } from './boundary.mjs';

export { bounds } from './boundary.mjs';

export async function explore(root, sourceFile) {
  const createBoundary = await compileStore(root, sourceFile);
  let frontier = [[]];
  let checked = 0;
  for (let depth = 0; depth <= bounds.eventsAfterReady; depth++) {
    const next = [];
    for (const actions of frontier) {
      const result = await replay(createBoundary, actions);
      checked++;
      if (!result.passed) return { ...result, checked, bounds };
      if (depth < bounds.eventsAfterReady) {
        for (const action of result.choices) next.push([...actions, action]);
      }
    }
    frontier = next;
  }
  return { passed: true, property: 'PrivateStateCurrent', checked, bounds };
}
