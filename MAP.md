# Map

The public Number Theory learning website, built as a React atlas with a Sites Worker for private account progress.

Start here: `README.md`, then `AGENTS.md`.

| Area | What lives there | Entry point |
|------|------------------|-------------|
| Working here | Agent + contributor conventions, commit/attribution rules | `AGENTS.md` (= `CLAUDE.md`) |
| Contributing | How work flows here — issue first, then a pull request | `CONTRIBUTING.md` |
| Code standards | How code is written and reviewed | `CODING_STANDARDS.md` |
| Domain language | The glossary — this repository's ubiquitous language | `CONTEXT.md` |
| Decisions | Architecture decision records | `docs/adr/` |
| Agent skills | The routines an agent follows here, one file per skill | `docs/agents/` |
| App verification | Launch, doctor, real browser journeys, feature map, retained proof, and owned cleanup | `.agents/skills/verify/SKILL.md` |
| Progress model checking | Bounded account lifecycle model, actual-store schedule replay, and mutation controls | `.agents/skills/progress-lifecycle/SKILL.md` |
| Automation | The workflows that run on a pull request or on a new issue, and dependency updates | `.github/` |
| Application | React reading interface, diagnostic, Studio, labs, and shared study state | `src/App.tsx`, `src/AtlasViews.tsx` |
| Conjecture Clinic | Curated claims, exact bounded counterexamples, kept-witness admission and Studio controls | `src/math/conjectures.ts`, `src/ConjectureClinic.tsx` |
| Proof notebook | Tab session, whole arguments, immutable comparison captures, source adapter and Markdown export | `src/proof-notebook.ts`, `src/ProofNotebookSession.tsx`, `src/ProofNotebook.tsx` |
| Account progress | Acknowledged marks, account fencing, validated transfer and explicit device import | `src/progress.ts`, `src/progress-schema.ts`, `src/AccountControls.tsx`, `src/ProgressControls.tsx` |
| Private API | Trusted Sites identity, bounded requests and atomic D1 operations | `app/api/progress/route.ts`, `src/server/` |
| Server shell | Public catch-all page and client atlas hydration | `app/layout.tsx`, `app/[[...path]]/page.tsx`, `app/learning-app.tsx` |
| Durable storage | Schema, generated migrations and local D1 checks | `db/`, `drizzle/`, `drizzle.config.ts`, `scripts/progress-d1.test.mjs` |
| Worker build | Supported Sites/Vinext integration and portable local environment | `vite.config.ts`, `build/`, `scripts/sites-env.mjs` |
| Routes and paths | Canonical lesson URLs, legacy URL adapter, selectable routes | `src/routes.ts`, `src/content/paths.ts` |
| Teaching content | Stable lessons, proof annotations, reasoning checks, original figures, handout topic map | `src/content/` |
| Reading design | Annotated proofs, complementary representations and visual system | `src/AnnotatedProof.tsx`, `src/ConceptFigure.tsx`, `src/learning.css` |
| Exact mathematics | Bounded BigInt algorithms and tests | `src/math/` |
| Agent interface | Feature-detected WebMCP tools over study commands | `src/webmcp/` |
| Public assets | Original logo and favicon | `public/` |
| Verification | Shared local/CI CLI, exact coverage map, evidence integrity and negative checks | `scripts/verification/verify.mjs`, `docs/verification.md` |
| Browser partitions | Source-derived teaching and Practice plans, complete actor unions and retained artifact checks | `scripts/verification/teaching-shards.mjs`, `scripts/verification/practice-partitions.mjs` |
| Math source guards | Escaped notation and spoken labels for mathematical headings, legends, captions and reasoning prompts; native accessibility remains a browser check | `scripts/verification/math-surface.mjs`, `scripts/verification/learning-content.mjs` |
| Site binding | Existing ChatGPT Sites project identity and D1 binding | `.openai/hosting.json`, `docs/progress-operations.md` |
| Redesign evidence | Migration inventory, source status, verification and release results | `docs/lesson-migration-ledger.md`, `docs/source-status.md`, `docs/redesign-verification.md`, `docs/research/learning-design.md` |

Update this file in the same pull request whenever a top-level area is added, moved, or removed.
