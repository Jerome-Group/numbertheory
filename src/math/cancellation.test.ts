import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCancellationMap } from './cancellation.ts';

test('multiplication fibers preserve exact cancellation classes', () => {
  for (let n = 2; n <= 30; n++) {
    for (let c = -n; c <= n; c++) {
      const map = buildCancellationMap(String(n), String(c));
      assert.equal(map.fibers.length, map.reducedModulus);
      for (const fiber of map.fibers) {
        assert.equal(fiber.inputs.length, map.gcd);
        for (const x of fiber.inputs) {
          assert.equal(map.rows[x].output, fiber.output);
          assert.equal((x - fiber.inputs[0]) % map.reducedModulus, 0);
        }
      }
    }
  }
});

test('unit and zero maps expose the two boundary cases', () => {
  assert.equal(buildCancellationMap('12', '5').fibers.length, 12);
  assert.deepEqual(
    buildCancellationMap('12', '0').fibers[0].inputs,
    Array.from({ length: 12 }, (_, i) => i),
  );
});

test('invalid and oversized inputs are rejected', () => {
  for (const [n, c] of [
    ['1', '2'],
    ['61', '2'],
    ['12', '1.5'],
    ['12', '1000000000001'],
  ])
    assert.throws(() => buildCancellationMap(n, c));
});
