---
name: verify
description: Drive the real Number Theory web app through lessons, discovery, progress, exact labs, and URLs, with owned instances and retained browser evidence. Use for local user-journey verification; native WebMCP and release review need separate evidence.
---

# Verify Number Theory

Read [features/README.md](features/README.md), then the relevant feature recipe. Run from the repository root. The driver uses the existing source map and fingerprints. It never installs packages, builds the app, drives an inherited instance, or changes product source.

## Launch

Prerequisites are Node 24 or newer, POSIX process groups, `ps`, `lsof`, Git, locked dependencies including `playwright@1.64.1`, Chromium, and a fresh static build. Install and build explicitly:

```sh
npm ci
npx --no-install playwright install chromium
npm run build
node .agents/skills/verify/scripts/drive.mjs --feature discovery --output /absolute/external/new-run
```

Replace the output path with a new directory whose parent exists, outside the public repository. Existing output is refused. The one command owns launch, doctor, serial browser journeys, evidence, and cleanup. Vite preview binds `127.0.0.1` on a fresh port with `--strictPort`. Each case uses a fresh browser context and device-local progress. No accounts or production services are involved.

For an interactive browser session, run the following foreground command. Its ready JSON gives the owned origin and exact identity. Keep the process alive while driving it, then send SIGINT or SIGTERM.

```sh
node .agents/skills/verify/scripts/drive.mjs --launch-only --output /absolute/external/new-session
```

An explicitly chosen system browser uses `--channel chrome`. Reports name the actual browser and version. Default Chromium is a local browser, separate from native Codex IAB proof. The current runtime is built Vite static output. A future Vinext Worker must replace the launch and doctor adapter and add its real prerequisites; do not claim backend proof from this adapter.

## Doctor

The driver runs a read-only doctor before the first browser action and after each failed case:

```sh
node .agents/skills/verify/scripts/drive.mjs --doctor --output /absolute/external/running-session
```

Require matching PID, process group, start time, command, source hash, lock hash, build hash, served index, and entry JavaScript. The build's source receipt must match current source and lock bytes. A stopped, changed, stale, or ambiguous instance fails. This establishes instance identity. It does not replace `npm run build` or mathematical review.

## Drive

Run one domain or all five. The allowed feature values are `all`, `discovery`, `teaching`, `practice`, `labs`, and `urls`:

```sh
node .agents/skills/verify/scripts/drive.mjs --feature all --output /absolute/external/full-run
```

Use actual buttons, labels, links, keyboard actions, and browser history. No React substitute, internal store setter, DOM substitute, or product test endpoint is allowed. Keep failures and unmet prerequisites visible. The driver checks phone `390x844`, tablet `768x1024`, and desktop `1440x900`. Read the matching recipe for each entry point and expected result. `teaching` enumerates all lessons and canonical and legacy entries. `labs` enumerates every Studio entry and refuses an unmapped lab type.

## Evidence

Each case retains a trace, screenshot, DOM, ARIA snapshot, and timestamped action/result log. `report.json` records `lane: playwright`, exact source, lock, build and scope identity, case outcomes, actual browser version, artifact paths and SHA-256 digests, and cleanup. `instance.json` records only disposable process ownership. `server.log` retains preview diagnostics. Artifacts stay outside the public repository and contain no account fixtures.

Every existing map obligation has an explicit passed, failed, or not-evaluated result. A case claims only the obligations it actually asserts. Missing browser, native WebMCP, semantic review, extra viewport profiles, storage-failure fixtures, print, or production observations stay unverified. A local pass does not establish release readiness. See [URLs and native tools](features/urls.md) for the separate IAB recipe.

Read `report.json` after the command exits. Exit `0` means the requested local cases and cleanup passed, `1` means a runtime or journey failure, and `2` means invalid arguments or unmet preflight prerequisites. Interruptions return `130` for SIGINT or `143` for SIGTERM. Diagnostics go to stderr. A failed case retains its evidence and the remaining cases continue when the instance is usable.

## Cleanup

Normal completion, failure, SIGINT, and SIGTERM close the browser and terminate only the run's verified process groups. Cleanup confirms they stopped and retains evidence. After abrupt parent termination, recover with:

```sh
node .agents/skills/verify/scripts/drive.mjs --cleanup --output /absolute/external/interrupted-session
```

Recovery refuses a live or reused owner PID and any changed process identity. Repeated cleanup returns `already-stopped`. Never kill by name, reuse an unknown listener, remove old evidence, or guess a stale process group. SIGKILL, power loss, and a crash before the ownership receipt is written cannot run normal handlers. Inspect the receipt and process diagnostics; ambiguity needs manual ownership resolution.

## Helpers

`scripts/drive.mjs --help` exposes the strict command contract and effects. `--feature`, `--launch-only`, `--doctor`, and `--cleanup` are mutually exclusive. The script and its imports live inside this skill. `runtime.mjs` owns process identity, doctor, and teardown; `browser.mjs` owns context evidence; the five domain modules implement the five feature recipes.

Maintain this directory with `pstack:maintain-verification-skill` when user paths change. Repair helpers here without adding test-only product controls. Reuse `scripts/verification/repo-loader.mjs` and `verify.mjs` for authored data and identity. Preserve exact math and evidence-contract checks.
