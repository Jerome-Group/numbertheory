# Verification contract

Start with `npm run --silent agent -- help`. JSON output lists strict command syntax, prerequisites, reads, writes and boundaries. The project [verification skill](../.agents/skills/verify/SKILL.md) owns the source-derived feature map and real-browser recipes. Requires Node24 or later, npm and Git; installation needs registry access. Commands never deploy.

| Command | Purpose | Effects |
| --- | --- | --- |
| `npm run --silent verify:help` | Discover commands and stages | stdout only; no dependencies needed |
| `npm run --silent verify:map` | Current83 lessons, routes, dependencies, paths, figures, tools, features and journeys | Reads source/locked installed compiler; JSON stdout |
| `npm run --silent verify:identity` | Source, lock, build and scope digests | Reads source and existing dist; fails if build missing |
| `npm run --silent agent -- doctor` | Read-only prerequisite report | Reads tools, source, installed browser and build; presence is not browser-launch proof |
| `npm run --silent agent -- launch --output /absolute/fresh-dir` | Foreground built app | Starts an owned loopback server; stop with Ctrl-C; retains its ownership receipt |
| `npm run --silent agent -- drive --feature all --output /absolute/fresh-dir` | Serial real-browser regression journeys | Starts and stops its server/browser; writes traces, screenshots and scoped report |
| `npm run --silent agent -- evidence --output /absolute/existing-dir` | Validate a scoped browser report | Reads current identity and actual artifact digests; creates no observation |
| `npm run --silent agent -- cleanup --output /absolute/existing-dir` | Recover an interrupted owned run | Stops only processes whose recorded ownership still matches; retains evidence |
| `npm run --silent verify` | Same executable loop as CI | npmci replaces node_modules, uses npmcache/network; checks source; tests temporary fixtures; rebuilds dist; structured JSON stdout |
| `npm run --silent verify:release -- /absolute/browser.json /absolute/semantic.json` | Automated gates plus current external manual evidence | Same build/check effects; reads evidence/artifacts; never publishes |

Redirect JSON output outside the repository. Plain `npm run` adds npm's banner; `--silent` makes stdout parseable JSON. Nonzero exit means failure. Unknown, duplicate, missing or irrelevant arguments fail before effects. Run `help COMMAND` for exact syntax. `drive` accepts a single feature domain or `all`, with optional `--profile phone|tablet|desktop`; `--channel chrome` selects an installed Chrome instead of the locked Playwright Chromium. `doctor --output DIR` checks a running receipt and HTTP readiness without changing it. Fresh output directories prevent overwriting failed evidence. Builds record source and lock identity only after a successful build with unchanged inputs; stale or missing receipts fail the doctor and evidence commands.

The automated report retains stage commands, timestamps, stdout/stderr and exit status. CI runs the shared gates and splits scoped browser checks by domain and teaching viewport within the ten-minute bound; the required `checks` result requires every job. It retains browser artifacts even after failure. Automated success reports browser/semantic release gates as not evaluated. A scoped Playwright report has its own lane and source/lock/build/scope identity; it cannot satisfy the exhaustive in-app-browser or independent mathematical review contracts below. No finite check guarantees all future behavior.

Keep exact mathematics, protocol and integrity tests. Prefer visible browser journeys over simulated React/DOM harnesses. Delete a redundant harness only after its replacement catches a known bad implementation and passes the repair. Test-first development is optional; fixing a failure still requires a retained failing observation and a verified repair.

## What the generated map requires

The baseline inventory rejects deleted, added or replaced lesson IDs, even at the same count. Prerequisites must exist; selectable paths must be closed and ordered. Teaching metadata must align exactly with preserved proof paragraphs, have valid math, and contain one justified correct choice among three. The map describes every canonical/legacy route, reading anchor, claim/exercise identity, proof length, optional figure, lab, objective and prerequisite. Tool effects distinguish public read-only computation from visible route/URL mutation; native WebMCP discovery exposes the exact schemas. Progress is not a tool-readable resource.

`requiredCoverage` is the exact browser-observation checklist. It includes every lesson at phone390×844, tablet768×1024 and desktop1440×900; all six views/layouts; each lab, figure, checkpoint and route; each lesson's recall, hints/answer, marks, diagnostic retry/correct feedback and proof-note controls; shared features, complete journeys, extra narrow layouts and rendering/error assertions. A screenshot count is not coverage. Record an entry only after performing its action and inspecting the result.

Inspect the actual browser accessibility tree for control and table-header names, including expanded lab tables and both continued-fraction modes. Names must preserve mathematical variables, ranges and operations; a merely nonempty fragment is insufficient. Retain equations and MathML for reading. An empty computed name or omitted mathematical header fails `assertion:accessible-control-header-names`. Source labels alone do not establish that the browser exposes them.

The six complete journeys cover a new learner's diagnostic→proof→practice→mark, a returning review queue, search→prerequisite→lab→share/reload, progress transfer/reset, agent computation versus visible state, and mobile keyboard reading. Test positive and negative paths: invalid/composite/zero/bounded lab inputs as applicable, incompatible solvable-system contrasts, empty search/filter states, unknown routes, stale revisions, extra fields, aborted/remounted registrations, corrupt/denied storage, invalid progress without partial mutation, backup recovery and history/reload.

Progress transfer checks the actual clipboard JSON, selectable-text fallback, text restoration and compatible file import. The map records the retired download feature and its replacement: file download stopped in actual in-app-browser QA, confirmed by the user. A download request is not successful export evidence.

The Node contract harness uses a mocked host and exact arithmetic oracles. It does not render DOM or establish native-browser compatibility. Native WebMCP and human UI journeys require in-app-browser observations. Content parsing and independent review complement one another: a valid formula can still express the wrong mathematics.

## External evidence schema1

Both envelopes require `schemaVersion:1`, `kind`, exact `sourceHash`, `lockHash`, `buildHash`, `scopeHash`, `status:"passed"`, named `observer`, current ISO-UTC `observedAt` and nonempty `artifacts`. Optional `summary` must be nonempty if present. Artifact entries have unique `id`, absolute `path`, and lowercase SHA256 digest; each must reference an actual nonempty regular file ≤20MiB. Every artifact must be cited by a record. Files, not assertions alone, are retained. Symlinks, missing/tampered files, impossible/future timestamps and evidence older than seven days fail.

Browser envelope: `surface:"codex-in-app-browser"`; `coverage` has exactly the generated `requiredCoverage` IDs once each. Each entry requires `id`, `status:"passed"`, `observedAt`, concrete `summary` and nonempty `artifactRefs`. Failed/skipped observations, unknown/duplicate IDs, unknown fields and unused artifacts fail.

Semantic envelope: `independent:true`, `unresolvedFindings:0`, complete `lessonIds`, integration `authors`, and `reviews`. Each review declares a named `reviewer`, partition `authors`, `independent:true`, `status:"passed"`, exact partition `lessonIds`, `observedAt`, substantive `summary` and retained `artifactRefs`. Partitions cover83 lessons exactly once. Reviewer must differ from integration authors and the authors of their own partition. Cross-review is permitted only when an author reviews the other author's partition. Declare substantive repair authorship too; a self-authored correction needs another review. These declared identities are not cryptographic proof of independence.

Freeze source and build before final observation/review. Generate identity and coverage map. Retain screenshots/DOM observations and review reports with exact reviewed scope. Create envelopes from those actual records. Run release verification; a source, lock, asset or scope change invalidates prior evidence. Repeat affected checks and refresh the complete bundle; do not edit hashes to reuse an obsolete review. Production validation is a separate observation bundle for the deployed assets/origin; local release evidence does not establish production operation.

## Release and rollback

Issue first, attributed branch/commits, independent Standards and Spec review, open/attach PR. Required checks must pass on its exact current head; respect protections and dependency policy. A reviewed merge is not a deployment. Publish that merged source through the existing Sites binding, then verify production assets, routes, interactions and journeys. Preserve audience/domain/access.

Before each deployment retain its actual preceding Sites version, source commit and progress schema outside this public tree. The verified predecessor on Oct18 is version5, source `85afcb0a7376976cb8ddbca1e0093febe11fae0b`. Roll back by redeploying that retained version on the same project/domain, then check production. Source rollback uses a reviewed revert PR; never reset main or bypass protections. Local progress remains schema1/key `numbertheory.progress.v1`; copy a JSON backup before clearing/importing a browser's marks.
