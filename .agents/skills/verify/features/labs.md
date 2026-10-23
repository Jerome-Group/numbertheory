# Test exact arithmetic in every Studio entry

A learner can open each experiment, compute a bounded exact result, inspect its certificate, and recover from an invalid submission.

## Sub-features

- Studio opens all 20 source-derived entries across 14 lab types. The [Conjecture Clinic recipe](conjecture-clinic.md) covers its five investigations under the same driver domain.
- Euclid verifies a gcd and Bézout certificate. Residue clocks compute with a negative representative. Cancellation shows a nonunit fiber.
- Linear and CRT solvers distinguish solutions and incompatibility.
- Divisor convolution and Möbius inversion expose full term tables.
- Hensel shows unique, singular, and absent branches. Orders distinguish generators and shorter cycles.
- Quadratic residues and local square assembly distinguish roots and obstructions. Reciprocity exposes exact lattice counts.
- Gaussian division gives a smaller remainder norm. Continued fractions reveal finite and periodic exact expansions. Pell shows exact unit powers and the negative boundary.
- Every type rejects an invalid submission without changing the successful shareable state.

## How to get to it (user POV)

Choose **Studio** at `/studio`, find a lesson card, and choose **Open exact lab**. Each entry opens its full lesson at `#lab`. The same experiments are reachable through **Experiment** inside lessons and shared lesson URLs. Multiple entries of one type remain separate obligations.

## Driving it with Playwright

Preconditions:

- Complete the skill's locked build and browser setup.
- Use the complete source map. An unknown lab type fails until its driver exists.

Run `node .agents/skills/verify/scripts/drive.mjs --feature labs --output /absolute/external/new-labs`.

- For every Studio entry in each viewport, open its card and require the corresponding lesson ID and `#lab`.
- Run the lab's labeled fields and actual submit button. Check exact outputs only within visible KaTeX, plus tables, reveal controls, and the negative fixture where applicable. Closed disclosure content cannot satisfy a result assertion.
- Fixtures include Euclid `240,46` with gcd `2` and coefficients `-9,47`; CRT `2 mod 6` and `8 mod 9` with `8 mod 18`; Hensel `x²=2 mod 49` with roots `10,39`; Gaussian `(7+5i)/(3+2i)` with quotient `2` and remainder `1+i`; and Pell `D=2` with pairs `(3,2)`, `(17,12)`, `(99,70)`.
- In CRT, require the 18-cell grid and the explanation that grids appear only for periods at most 36. Submit `0 mod 11` and `0 mod 12`; require visible clocks, the exact result `0 mod 132`, no grid, and guidance to use the exact result for larger periods. Restore the positive fixture.
- In reciprocity, require the footer's maximum of 210 points at distinct primes 31 and 29. Submit that pair; require 15 columns, 14 rows, 210 displayed points, and `105+105=210`. Reject `31,31` while retaining the valid count, then restore `3,7`.
- Require both convolution and inversion entries, both order entries, both Hensel entries, finite and periodic continued fractions, and both Pell entries. Do not substitute one entry for its sibling.
- In both order entries, open the order tables and require the six power-order rows for candidate 3 modulo 7. In finite continued fractions, press End and require depth 4 of 4, four convergent rows, and terminal 43/19. Press Home and require depth 1 of 4 and one row; the hidden full expansion must not satisfy the visible prefix check.
- Submit invalid bounds, composite prime, equal primes, square radicand, or zero divisor as applicable. Require a visible explanation, unchanged URL, visible result formulas, and table rows. Resubmit valid inputs, require the error to disappear, and recheck the fixture.

## Gotchas

Rendered exact outputs prove browser integration. Existing exact-math tests supply broader arithmetic checks and remain required. Annotations inside visible formulas supplement screenshots and ARIA; they do not replace semantic review. Native number inputs may reject text before submission. Malformed URL recovery belongs to the URL domain. A baseline defect remains a failure, even when the arithmetic tests pass.
