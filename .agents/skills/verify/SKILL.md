---
name: verify
description: Drive the built Number Theory Worker and local D1 through public lessons, account progress, discovery, exact labs, and URLs. Retain owned-process browser evidence. Hosted authentication, native WebMCP, and release review need separate evidence.
---

# Verify Number Theory

Read [features/README.md](features/README.md), then the relevant feature recipe. Run from the repository root. The driver uses the existing source map and fingerprints. It never installs packages, builds the app, drives an inherited instance, or changes product source.

## Launch

Prerequisites are Node 24 or newer, POSIX process groups, `ps`, `lsof`, Git, locked dependencies including Wrangler and `playwright@1.64.1`, and a fresh Worker build. Browser drives also require Chromium. Install and build explicitly:

```sh
npm ci
npx --no-install playwright install chromium
npm run build
node .agents/skills/verify/scripts/drive.mjs --feature discovery --output /absolute/external/new-run
```

Replace the output path with a new directory whose parent exists, outside the public repository. Existing output is refused. The command owns launch, doctor, serial browser journeys, evidence, and cleanup. It applies every immutable `drizzle/*.sql` file once, in journal order, through local Wrangler into the fresh `<output>/d1` directory. It then runs Wrangler with `--config dist/server/wrangler.json --local --ip 127.0.0.1 --inspector-port 0`, a fresh `--port`, and the same explicit `--persist-to` path. The build must declare `index.js` and `../client`; static `dist/index.html` is not the runtime.

Read-only cases use fresh anonymous browser contexts. Every per-lesson teaching case uses an invented local account throughout reading, practice, marking, and its legacy visit. Path-marking and account cases also attach invented Sites identity headers. Each case has unique fixture accounts; sibling contexts share an account only when the case requests it. These simulate a trusted local dispatcher. They do not establish hosted identity. No production account, database, or service is used.

Supplemental account fences dispatch explicitly synthetic lifecycle events and hold actual backend responses. They establish event handling and response ordering. Native BFcache and hosted account changes require separate browser evidence.

For an interactive browser session, run the following foreground command. Its ready JSON gives the owned origin and exact identity. Keep the process alive while driving it, then send SIGINT or SIGTERM.

```sh
node .agents/skills/verify/scripts/drive.mjs --launch-only --output /absolute/external/new-session
```

`--launch-only` starts the server and local D1 without starting a browser. `--channel chrome` applies only to `--feature` browser drives. Reports name the actual browser and version. Local Chromium and system Chrome remain separate from native Codex IAB proof.

## Doctor

The driver runs a read-only doctor before the first browser action and after each failed case:

```sh
node .agents/skills/verify/scripts/drive.mjs --doctor --output /absolute/external/running-session
```

Require matching PID, process group, start time, command, source hash, lock hash, build hash, migration hashes, and served entry JavaScript bytes. Every listener must belong to the owned Worker group. The source receipt must match current source and lock bytes. Doctor also requires anonymous progress access to return 401 and a read-only invented local identity to read an empty account from migrated D1. A stopped, changed, stale, or ambiguous instance fails. This establishes local instance identity and schema readiness. It does not establish hosted sign-in or mathematical validity.

## Drive

Run one domain or all five. The allowed feature values are `all`, `discovery`, `teaching`, `practice`, `labs`, and `urls`:

```sh
node .agents/skills/verify/scripts/drive.mjs --feature all --output /absolute/external/full-run
```

Use actual buttons, labels, links, keyboard actions, and browser history. No React substitute, internal store setter, DOM substitute, or product test endpoint is allowed. Keep failures and unmet prerequisites visible. The driver checks phone `390x844`, tablet `768x1024`, and desktop `1440x900`. Add `--profile phone`, `--profile tablet`, or `--profile desktop` to narrow a feature drive. Omitted profiles remain not-evaluated. `--profile` and `--channel` apply only to feature drives. Read the matching recipe for each entry point and expected result. `teaching` enumerates all lessons and canonical and legacy entries. `labs` enumerates every Studio entry and refuses an unmapped lab type.

Teaching drives also accept `--shard I/N` with one explicit profile. Each shard owns a fresh Worker, D1 and browser. The current two partitions each run 42 cases, including the special-experiences case exactly once. Omitting `--shard` retains the full drive. Partial success leaves unselected obligations not-evaluated. Use the [teaching recipe](features/teaching.md) to validate a downloaded pair through `agent teaching-profile`; one partial report never proves the whole profile.

## Evidence

Each browser context retains a trace, screenshot, DOM, and ARIA snapshot. Each case retains timestamped actions, API observations, and asserted results. `report.json` records `lane: playwright`, exact source, lock, build and scope identity, invented fixture identities, outcomes, browser version, artifact paths, SHA-256 digests, and cleanup. `instance.json` records Worker, browser, and migration process ownership, SQL hashes, and the local D1 path. Migration logs and `server.log` retain diagnostics. All artifacts and disposable D1 data remain outside the public repository. Use invented learner data only.

Every existing map obligation has an explicit passed, failed, or not-evaluated result. A case claims only obligations it asserts. Account cases also retain their own action evidence without inventing a second coverage inventory. Native WebMCP, semantic review, extra viewport profiles, print, and production stay unverified. Built local Wrangler does not implement the Sites dispatcher, so actual top-level sign-in and sign-out roundtrips and two real hosted accounts remain explicitly unverified. A local pass does not establish release readiness. See [URLs and native tools](features/urls.md) for the separate IAB recipe.

Read `report.json` after the command exits. Exit `0` means the requested local cases and cleanup passed, `1` means a runtime or journey failure, and `2` means invalid arguments or unmet preflight prerequisites. Interruptions return `130` for SIGINT or `143` for SIGTERM. Diagnostics go to stderr. A failed case retains its evidence and the remaining cases continue when the instance is usable.

## Cleanup

Normal completion, failure, SIGINT, and SIGTERM close the browser and terminate only the run's verified process groups. Cleanup confirms they stopped and retains evidence. After abrupt parent termination, recover with:

```sh
node .agents/skills/verify/scripts/drive.mjs --cleanup --output /absolute/external/interrupted-session
```

Recovery refuses a live or reused owner PID and any changed process identity. Repeated cleanup returns `already-stopped`. Never kill by name, reuse an unknown listener, remove old evidence, or guess a stale process group. SIGKILL, power loss, and a crash before the ownership receipt is written cannot run normal handlers. Inspect the receipt and process diagnostics; ambiguity needs manual ownership resolution.

## Helpers

`scripts/drive.mjs --help` exposes the strict command contract and effects. `--feature`, `--launch-only`, `--doctor`, and `--cleanup` are mutually exclusive. Browser and domain helpers live inside this skill. Shared CLI and teaching partition policy live in `scripts/verification/`. `runtime.mjs` owns migrations, process identity, doctor, and teardown. `browser.mjs` owns context evidence, acknowledged marks, and visible/authored content assertions. Five domain modules implement the five recipes; `practice.mjs` includes `account-journeys.mjs` and `account-lifecycle.mjs`.

Maintain this directory with `pstack:maintain-verification-skill` when user paths change. Repair helpers here without adding test-only product controls. Reuse `scripts/verification/repo-loader.mjs` and `verify.mjs` for authored data and identity. Preserve exact math and evidence-contract checks.
