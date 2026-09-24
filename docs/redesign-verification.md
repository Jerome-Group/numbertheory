# Atlas redesign verification · 2026-09-24

Issue: [#10](https://github.com/Jerome-Group/numbertheory/issues/10). Baseline: `4aaa44699fffdcb42f74026e7674c99429bdae4b`. This record describes the redesign branch before merge and publication; append the final PR, Site version, and production checks after they occur.

## Curriculum and mathematical review

- The baseline has 60 stable lesson IDs; the candidate has 83: the same 60 plus all 23 required P/X/N additions. The eight elective Y modules remain outside this release.
- Every lesson route has a real heading, definitions, a theorem, a continuous proof, a worked example, a practice answer, a boundary case, and source status. All 83 canonical routes rendered in the in-app browser without a KaTeX error or missing heading. The V1-to-V2 adapter preserves the original content; the migration inventory is [lesson-migration-ledger.md](lesson-migration-ledger.md).
- Deliberate baseline corrections: U05 distinguishes general equal-size fibers from the cyclic `gcd` count; R07 names the positive-real norm-one subgroup; Q01/Q02 malformed TeX, C06 notation, D03 zero-input summary, R05 zero numerator, R06 even-index wording, and C10/A01/R02/R03/R05 prerequisites were corrected. C02 adds an exact multiplication-fiber experiment and reasoning ladder.
- An independent Sol medium reviewer inspected designated high-risk B/F/U/Q/S/R/N proofs and the new P/X/N theorem/proof fields. It found an omitted positive-degree hypothesis in N07 Eisenstein; that statement was corrected. No other concrete defect was reported. The review was static, not formal verification or learner testing.
- `npm run check:content`: 83 unique lessons, 5,911 strictly parsed LaTeX expressions across lessons, checkpoints, and structured interactive prompts; 83 learner objectives, resolved prerequisite graph, valid order and current/historical handout IDs. `scripts/check-math-surface.mjs` rejects dropped math delimiters and raw mathematical symbols in TSX.
- `npm test`: 56 exact arithmetic tests plus the Bertrand finite certificate covering all integers 2–999. The X05 local-square solver was compared with direct enumeration for every modulus 2–128 and every target. The handoff's independent example oracle ran 19 tests successfully; it is not an application-level test.

## Routes, interaction, accessibility

- Old `?lesson=` links and meaningful lab parameters resolve to canonical lesson routes. Back/Forward, local progress persistence, chapter disclosures, shared search, and mobile drawer behavior were exercised in the in-app browser.
- Five paths are available: Core, MH3210, Computational, Enrichment, and ANT Runway. The course view marks Handouts 01–07 current and 08–10 historical same-course. The source notes make no exact theorem/page claim; [source-status.md](source-status.md) records the provenance boundary.
- P00 proof repair, D04 exact Euclid, C02 fiber map and three-stage practice, Q04 lattice proof check, and R07 Pell-unit classification provide distinct representative experiences. All core proofs remain continuously readable. Print media hides navigation and interactive controls while preserving the proof and rendered mathematics; this was checked on C02 in browser print emulation.
- Responsive checks at 1440×900, 1280×800, 768×1024, 390×844, and 720×900 CSS pixels found no document overflow in representative early, middle, and late lessons. The 720-pixel check covers the 200% desktop reflow width. Forced-colors and reduced-motion emulation kept visible controls, math, and zero overflow. The accessibility tree exposed landmarks, labeled inputs, button states, and MathML; manual keyboard checks covered skip link and drawer close. These checks are not a full assistive-technology certification. Browser screenshots were inspected in the task session but were not saved as repository artifacts.
- The preview console reported no errors after route and interaction checks.

## WebMCP and software gates

- The browser discovered 36 public WebMCP tools: 15 pure exact-computation tools, their 15 visible-state setters, and six context/navigation/claim/checkpoint/search tools. Each compute tool returned without changing the route. Each setter opened its intended lesson and incremented the context revision. Stale revisions, extra properties, and unknown lesson IDs were rejected without mutation. The chapter checkpoint returns its prompt and links, not its comparison answer. Tools are optional to the human UI.
- `npm run format:check`, `npm run lint`, `npm run check`, `npm run build`, and `npm run check:public` passed. The static build's main JavaScript chunk was about 948 kB before compression, 275 kB gzip; this remains a performance follow-up for route-level splitting. Public-surface scanning found no blocked private files, token patterns, or private source locators.
- The existing Site project and public address are preserved. Publication is a separate step after the expected PR and dependency merges.

## Release handoff

| Gate | Result |
| --- | --- |
| Redesign PR and CI | Pending |
| Dependabot merge reconciliation | No open PR at branch review; recheck before publish |
| Saved Site version and deployment | Pending |
| Production route, math, WebMCP, and console smoke | Pending |
| Rollback | Git tag `rollback/pre-atlas-redesign-2026-09-24`; prior Sites version remains available |
