# Redesign baseline — 2026-09-24

- Repository: `Jerome-Group/numbertheory`; audited and current HEAD: `4aaa44699fffdcb42f74026e7674c99429bdae4b` on `main`.
- Rollback tag: `numbertheory-redesign-pre-2026-09-24` at that commit. Work branch: `codex/atlas-redesign`.
- Runtime: Node `v24.11.0`, npm `11.10.0`. Existing `node_modules` was present; this baseline did not run a fresh `npm ci`.
- `npm run check:content`, `check`, `format:check`, `lint`, `test`, `build`, and `check:public` all exited 0 before edits. Content validator found 60 lessons and 4,446 strict LaTeX expressions. The build warned that a chunk exceeds 500 kB. Logs are in `/tmp/numbertheory-baseline-*.log` on this machine.
- Local app inspected at `http://localhost:59123/`: the Learn view shows all 60 lesson links expanded; the first viewport has no working mathematical object. Browser discovery found 28 public WebMCP tools. The app still works without WebMCP by feature detection in `src/webmcp/register.ts`.
- Production URL `https://numbertheory.jeromegroup.org/` returned HTTP 200 and opened in the Codex browser. It renders the old all-expanded Learn layout and exposes the same 28 WebMCP tools as local baseline. The deployed build identifier remains unverified; recheck after release.
- No open repository PRs at baseline, including Dependabot PRs.
- Handoff packages inspected outside the public repository at `/tmp/numbertheory-handoffs/`. Neither archive is part of the public source tree. The 2026-09-24 GPT 6 handoff audited the same commit. The GPT 5.6 handoff's proposed vertical slice and 83-module scope are release targets, not baseline facts.
- Current handout status remains the 2026-09-23 report in `docs/source-status.md` until the private MH3210 source can be refreshed. No private source IDs or text belong in this repository.

## Learning redesign baseline — 2026-10-03

This section supplements the historical 2026-09-24 record above. It does not replace that release's commit, deployment or software-gate evidence. The October browser artifacts do not identify an immutable build commit, so they establish an observed baseline, not deployment provenance for a final candidate.

### Evidence available

The task saved browser/automation evidence outside this public repository in `/private/tmp/numbertheory-baseline-2026-10-03/`. This reviewer read the structured records and text snapshots and visually inspected the saved home, phone drawer and prime-spirals check images. This reviewer did not perform those baseline browser runs. Temporary machine-local files are an audit trail, not durable published assets; this document preserves their bounded findings without incorporating screenshots or third-party material.

| Record | Observed scope | What it does not prove |
| --- | --- | --- |
| `lessons.json`, lesson images and contact sheets | 83 distinct lesson records, headings, controls, rendered text; 5,369 detected math nodes and zero recorded math-render errors | Correctness of every proof, all states, assistive-technology usability, or learning |
| `views.json` and `view-*.txt` | Learn, Explore, Practice, Studio, Reference and Course accessibility snapshots | End-to-end completion of every journey |
| `tools.json` | 15 named exact-lab families, supplied inputs, computed result, visible-state setter result, stale-revision response and visible output; zero recorded visible math errors | Exhaustive arithmetic validation, every error branch or state consistency after arbitrary sequences |
| `local-practice.txt` | A foundation lesson's claim retrieval, justified answer and local “Review later” status | An actual learner attempt or measured understanding |
| `search-empty.txt` | Sidebar search for an impossible term, zero-match status and a clear-search action | Empty-state behavior in each separate catalog |
| `phone-drawer.txt` and image | Open phone navigation with close control, focused search and a visible backdrop | Complete focus-trap or screen-reader testing |

The 15 saved tool families are Euclid, cancellation map, CRT, linear congruence, Gaussian division, local square roots, Hensel tree, divisor convolution, primitive-root cycle, quadratic residues, reciprocity lattice, residue operations, rational continued fractions, square-root continued fractions and Pell orbit. Each has a stale response recorded; those responses alone do not establish that no underlying state changed.

### Observed baseline strengths

The home screenshot already contains a working mathematical preview: multiplication modulo 12, factor choices, fibers and a link to the cancellation lesson. It also shows path selection, a local diagnostic and featured lessons. The lesson snapshots already include definitions, claims, continuous proofs, worked examples, boundaries, progressive hints, justified practice answers and local marks. Thus “add proofs,” “add interaction” or “make a landing page” would misdiagnose this baseline. The redesign should connect and improve existing resources.

The saved phone image shows a compact navigation drawer with a visible focus outline and close button. The practice snapshot shows an explicit on-device review mark. These are concrete interface observations, not accessibility certification or evidence that a learner understands the content.

### Source-review diagnosis before the teaching changes

A separate read-only review of AtlasViews, LessonCore, LessonPage, StudyPanels, Sidebar, paths and styles identified these journey weaknesses:

- Route previews exposed only an initial subset; continuation followed the global lesson order rather than the selected route. Prerequisite preparation was not consistently included or explained.
- Narrow-width styles hid the context rail that held prerequisite navigation.
- Collection Practice revealed answers without the full lesson's staged hints and local marks.
- Explore offered a chapter catalog under a map metaphor without enough direct chapter wayfinding.
- Studio's instrument promise opened the lesson top; view changes needed deliberate scroll and focus orientation.
- Catalog searches and chapter filtering needed explicit zero-result recovery.

These are baseline diagnoses from source inspection. They are not assertions that a learner failed these tasks. Current remedies and verification must be evaluated against the implementation separately; the baseline remains historical.

### Product inspection boundary

Primary research and design rationale are in [learning-design.md](research/learning-design.md). Mathigon's primes lesson, Seeing Theory's basic-probability page and 3Blue1Brown's prime-spirals page were directly inspected as public page content. Desmos accessibility and Polypad API material were inspected as documentation. This researcher's browser-control setup failed, so those readings were not live manipulation tests.

A separate saved `research-prime-spirals-check.jpg` shows a selected multiple-choice polar-coordinate answer, correctness feedback, a reset control and an explanatory response. Reviewing that image establishes the visible feedback state only; it does not establish this reviewer's live interaction with the page or the effectiveness of that question. No third-party screenshots are copied into the public repository.

### Design consequence and limits

Keep the existing mathematical scope and a continuously readable complete proof. Add concept-specific intuition, a global strategy, paragraph-level explanations of transitions and hypothesis use, and diagnostic reasoning checks. Use exact experiments selectively to expose a mechanism; never require an interaction solely to fill a template. Give Learn, Explore, Practice, Reference and Studio distinct purposes while keeping conditions and prerequisites accessible on narrow screens.

No undergraduate learner testing, learning-gain study or assistive-technology certification occurred in this baseline. Automated rendering, screenshot inspection, mathematical review and future learner evaluation remain separate evidence categories. Final build, CLI gates, browser regression and publication evidence belong in the release verification record.
