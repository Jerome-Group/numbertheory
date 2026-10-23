---
name: progress-lifecycle
description: Model-check private progress invalidation and replay bounded schedules through the real store. Use when changing progress reload, write, clearSession, or AccountControls lifecycle callbacks, and when maintaining their formal coverage after a merge.
---

# Check private progress invalidation

Promise: every reload or session clear hides the previous account name and marks synchronously; responses from an earlier invalidation epoch cannot expose them again.

Run from the repository root after `npm ci`, with Node 24 or newer and Java 11 or newer:

```sh
npm run formal:progress
```

The command downloads checksum-pinned TLC 1.7.4 on first use, checks the model, explores the actual TypeScript store, and tests seven paired scratch product controls and two model controls. It prints the evidence path and exits nonzero for a failure or source drift. `-- --output /absolute/new-path` retains evidence at a fresh location outside this public repository. Existing evidence is refused and preserved.

TLC checks every reachable state of the finite model. The executable replay is bounded generated-input checking of the real store, not a proof of all JavaScript. Read [the coverage record](references/coverage.md) before interpreting a result. The exact sync commit and reviewed source hashes live in [coverage.json](coverage.json).

1. Run the command before editing the verification. Keep the result, including failures.
2. If a covered source hash changed, diff every covered file from `syncCommit`, read the intervening commit messages, and inspect new paths that write the same state. Review the atomic steps against the coverage record. A moved guard or new await changes the model even when existing checks pass.
3. Update the model and replay from the code. Keep the promise and bounds unless intended product behavior changed; cite that evidence for any changed promise. A lower bound must be reported.
4. Replay each failure against `src/progress.ts`: `write` calls `set`, `reload` calls `reload`, `clear` calls `clearSession`, and request events release the named fetch or JSON promise. A reachable trace is a product finding. An impossible trace is a verification defect. Keep product fixes separate from verification maintenance.
5. Confirm every mutation reports `caught: true` because `PrivateStateCurrent` failed. Exceptions, changed mutation anchors, and source drift do not count as detection. Scratch TypeScript and the model regression stay in the evidence directory; the product files must retain identical hashes.
6. After confirming the mapping, update `coverage.json` with the checked commit and reviewed file hashes. Rerun once; require `passed: true`, an empty drift list, a complete TLC queue, and all controls caught. Require every HTTP smoke case to pass and nonzero reachability for every listed response outcome. Header-only responses become terminal only after real continuations drain; never schedule a JSON body unless the source called `json()`.

Report the outcome as **in sync**, **updated**, **bug**, or **blocked**. Include the checked commit, result path, counterexample or mutation evidence, and any uncovered transitions. A changed hash with an unreviewed mapping remains drift even if replay passes. The installed `maintain-formal-verification-skill` workflow provides the broader upkeep pass.
