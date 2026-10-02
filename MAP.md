# Map

The public Number Theory learning website, built as a static React atlas and published through ChatGPT Sites.

Start here: `README.md`, then `AGENTS.md`.

| Area | What lives there | Entry point |
|------|------------------|-------------|
| Working here | Agent + contributor conventions, commit/attribution rules | `AGENTS.md` (= `CLAUDE.md`) |
| Contributing | How work flows here — issue first, then a pull request | `CONTRIBUTING.md` |
| Code standards | How code is written and reviewed | `CODING_STANDARDS.md` |
| Domain language | The glossary — this repository's ubiquitous language | `CONTEXT.md` |
| Decisions | Architecture decision records | `docs/adr/` |
| Agent skills | The routines an agent follows here, one file per skill | `docs/agents/` |
| Automation | The workflows that run on a pull request or on a new issue, and dependency updates | `.github/` |
| Application | React reading interface, diagnostic, Studio, labs, and shared study state | `src/App.tsx`, `src/AtlasViews.tsx` |
| Local progress | Validated export/import/reset of lesson marks | `src/progress.ts`, `src/progress-schema.ts` |
| Routes and paths | Canonical lesson URLs, legacy URL adapter, selectable routes | `src/routes.ts`, `src/content/paths.ts` |
| Teaching content | Stable lessons, proof annotations, reasoning checks, original figures, handout topic map | `src/content/` |
| Reading design | Annotated proofs, complementary representations and visual system | `src/AnnotatedProof.tsx`, `src/ConceptFigure.tsx`, `src/learning.css` |
| Exact mathematics | Bounded BigInt algorithms and tests | `src/math/` |
| Agent interface | Feature-detected WebMCP tools over study commands | `src/webmcp/` |
| Public assets | Original logo and favicon | `public/` |
| Verification | Shared local/CI CLI, exact coverage map, evidence integrity and negative checks | `scripts/verification/verify.mjs`, `docs/verification.md` |
| Site binding | ChatGPT Sites project identity and static directory | `.openai/hosting.json` |
| Redesign evidence | Migration inventory, source status, verification and release results | `docs/lesson-migration-ledger.md`, `docs/source-status.md`, `docs/redesign-verification.md`, `docs/research/learning-design.md` |

Update this file in the same pull request whenever a top-level area is added, moved, or removed.
