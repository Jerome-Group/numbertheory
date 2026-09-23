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
| Application | React reading interface, labs, and shared study state | `src/App.tsx` |
| Teaching content | Stable concept records and type contract | `src/content/` |
| Exact mathematics | Bounded BigInt algorithms and tests | `src/math/` |
| Agent interface | Feature-detected WebMCP tools over study commands | `src/webmcp/` |
| Build validation | Strict LaTeX/content and public-surface checks | `scripts/` |
| Site binding | ChatGPT Sites project identity and static directory | `.openai/hosting.json` |

Update this file in the same pull request whenever a top-level area is added, moved, or removed.
