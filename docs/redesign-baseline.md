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
