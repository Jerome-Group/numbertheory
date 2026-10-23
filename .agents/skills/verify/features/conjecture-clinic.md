# Investigate conditions with exact evidence

Learners weaken a claim, inspect a counterexample, and test a sufficient repair in Studio. The proof and existing whole-proof notebook remain available throughout.

## Sub-features

- Five source-derived investigations cover cancellation, Euler, totient products, the fixed polynomial x²−1, and the Jacobi converse.
- Each has unrestricted, tempting incomplete, and sufficient conditions. Full deterministic searches distinguish admitted inputs, true premises, and counterexamples.
- First witnesses expose a true premise and false conclusion. Root and square certificates enumerate every residue. Jacobi certificates retain local signs and local square sets.
- One kept witness per case retains its exact arithmetic while the engine explains admission under a changed condition. In-app navigation retains it; reload clears it.
- Shared configuration restores the selection and recomputes searched evidence. Proof and notebook handoffs use existing sources, including Q01 proof with Q06 notebook.

## How to get to it (user POV)

Choose **Studio**, then **Choose an investigation** in **Conjecture Clinic**. Relevant lesson boundary sections also offer **Investigate in Conjecture Clinic**. Change a native radio condition and choose **Search exact cases** or **Test this repair**. **Keep this witness** permits comparison after a condition change. The proof and writing links stay available before search.

## Driving it with Playwright

Preconditions:

- Use the skill’s locked build, owned Worker, fresh D1, and browser setup.
- Derive the five case and condition inventories from the verification map. Drive real controls and history.

Run `--feature labs` for each case’s complete three-condition journey. Run `--feature urls` for kept-witness, history, reload, malformed-link, and notebook-retention journeys. Both run phone, tablet, and desktop profiles unless narrowed explicitly.

- Require the unrestricted and incomplete first witnesses. C02 uses `(n,c,a,b)=(2,0,0,1)` and `(4,2,0,2)`. C06 uses `(n,a)=(2,0)` and `(4,2)`. C07 uses `(m,n)=(2,2)` and `(2,4)`. F01 finds roots `{1,3,5,7}` at 8 and `{1,4,11,14}` at 15. Q06 uses `(n,a)=(9,2)` and `(15,2)`.
- Compare all visible counts with independent arithmetic. Require nonzero premise counts. Require full F01 root-check and Q06 square-check rows. Inspect both negative local signs for `J(2,15)`.
- Require **No counterexample within these bounds** for each sufficient repair and the finite-evidence sentence. No retained witness may masquerade as a new searched result.
- Keep C02’s zero-factor witness, exclude it through the nonzero condition, search for the new nonzero witness, use Back and Forward, then readmit the kept witness under the original condition. Require unchanged premise and conclusion arithmetic. Check per-case isolation and in-app retention.
- Require entry and history to focus the Clinic heading. Case selection, radio changes, and search retain control focus. Removing a kept witness returns focus to the investigation selector. Search replaces its entry. Case and condition changes push an entry.
- Reload and directly open a searched URL. Require the recomputed report and cleared kept witnesses. Unknown cases, cross-case conditions, repeated case fields, orphan conditions, and malformed searched flags must show recovery with no report. A valid selection restores canonical fields and hash.
- Open every authored proof and notebook. Preserve an invented draft across Clinic navigation, then require reload to clear writing. Q06 must open Q01’s proof and Q06’s notebook. Require no document overflow or browser errors in each profile.

## Gotchas

No counterexample means that no tested premise-true input violates the conclusion. It does not say that every admitted input satisfies the conclusion. The Q06 prime domain includes Jacobi-negative nonresidues. The F01 search covers one polynomial family. A sufficient repair need not be necessary. Browser checks prove interaction and displayed arithmetic, while independent mathematical tests establish the bounded counts and certificates. Neither proves learning or hosted identity.
