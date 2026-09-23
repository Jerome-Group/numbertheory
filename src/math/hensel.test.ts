import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildHenselTree } from './hensel.ts';

test('simple roots lift uniquely at every step', () => {
  const tree = buildHenselTree('7', '2', '4');
  assert.deepEqual(tree.levels[0].roots, [3, 4]);
  assert.deepEqual(tree.levels[1].roots, [10, 39]);
  assert.ok(tree.branches.every((branch) => branch.kind === 'unique'));
  assert.equal(tree.finalRoots.length, 2);
  for (const root of tree.finalRoots)
    assert.equal((BigInt(root) ** 2n - 2n) % 2401n, 0n);
});
test('singular branches may all lift and later die', () => {
  const tree = buildHenselTree('3', '0', '3');
  assert.deepEqual(
    tree.levels.map((level) => level.roots),
    [[0], [0, 3, 6], [0, 9, 18]],
  );
  assert.deepEqual(
    tree.branches.map((branch) => branch.kind),
    ['all', 'all', 'none', 'none'],
  );
});
test('singular x²-9 branches select none or all independently', () => {
  const tree = buildHenselTree('3', '9', '3');
  assert.deepEqual(
    tree.levels.map((level) => level.roots),
    [[0], [0, 3, 6], [3, 12, 21, 6, 15, 24]],
  );
  assert.deepEqual(
    tree.branches.map((branch) => branch.kind),
    ['all', 'none', 'all', 'all'],
  );
});
test('no root and single-level cases are handled', () => {
  assert.deepEqual(
    buildHenselTree('7', '3', '3').levels.map((level) => level.roots),
    [[], [], []],
  );
  const tree = buildHenselTree('3', '0', '1');
  assert.deepEqual(tree.finalRoots, [0]);
  assert.deepEqual(tree.branches, []);
});
test('all bounded roots and branch digits agree with direct evaluation', () => {
  for (const p of [3, 5, 7, 11, 13])
    for (const c of [-9, -1, 0, 1, 2, 9]) {
      const k = p ** 4 <= 10_000 ? 4 : 3;
      const tree = buildHenselTree(String(p), String(c), String(k));
      for (const level of tree.levels) {
        const expected = Array.from(
          { length: level.modulus },
          (_, x) => x,
        ).filter(
          (x) => (BigInt(x) ** 2n - BigInt(c)) % BigInt(level.modulus) === 0n,
        );
        assert.deepEqual(
          [...level.roots].sort((a, b) => a - b),
          expected,
        );
      }
    }
});
test('bounds and composite primes are rejected', () => {
  assert.throws(() => buildHenselTree('9', '1', '3'));
  assert.throws(() => buildHenselTree('13', '1', '4'));
  assert.throws(() => buildHenselTree('7', '1000000000001', '2'));
});
