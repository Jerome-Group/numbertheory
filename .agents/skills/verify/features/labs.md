# Test exact arithmetic in every Studio entry

A learner can open each experiment, compute a bounded exact result, inspect its certificate, and recover from an invalid submission.

## Sub-features

- Studio opens all 20 source-derived entries across 14 lab types.
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
- Run the lab's labeled fields and actual submit button. Check exact rendered outputs, tables, reveal controls, and the negative fixture where applicable.
- Fixtures include Euclid `240,46` with gcd `2` and coefficients `-9,47`; CRT `2 mod 6` and `8 mod 9` with `8 mod 18`; Hensel `x²=2 mod 49` with roots `10,39`; Gaussian `(7+5i)/(3+2i)` with quotient `2` and remainder `1+i`; and Pell `D=2` with pairs `(3,2)`, `(17,12)`, `(99,70)`.
- Require both convolution and inversion entries, both order entries, both Hensel entries, finite and periodic continued fractions, and both Pell entries. Do not substitute one entry for its sibling.
- Submit invalid bounds, composite prime, equal primes, square radicand, or zero divisor as applicable. Require a visible explanation and unchanged URL state.

## Gotchas

Rendered exact outputs prove browser integration. Existing exact-math tests supply broader arithmetic checks and remain required. Formula annotations supplement visible screenshots and ARIA; they do not replace semantic review. Native number inputs may reject text before submission. Malformed URL recovery belongs to the URL domain. A baseline defect remains a failure, even when the arithmetic tests pass.
