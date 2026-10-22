# Number Theory

An original, interactive atlas of elementary number theory. The 83 lessons pair precise statements and proofs with worked examples, practice and exact computational experiments. Five learning paths include a core route, an MH3210 topic map, a computational route, enrichment, and a bridge toward algebraic number theory. MH3210 alignment is supplementary; the concept IDs do not depend on a semester.

## Status

This repository holds the site source. Publication is a separate ChatGPT Sites version; the 2026-10-03 learning redesign is tracked in issue #19, building on issues #10 and #12. The original 60 lesson IDs and query-string URLs remain available. Historical handout alignments are marked as such.

## Develop

Requires Node.js 24 and npm. Run `npm ci`, then `npm run dev`. Run `npm run verify:help` for the command catalog, `npm run --silent verify:map` for the complete machine-readable lesson/feature/journey map, and `npm run --silent verify` for the same automated gates CI runs. Verification reinstalls locked dependencies and rebuilds `dist/`; it never claims browser or mathematical review. See [verification.md](docs/verification.md) for release evidence. `npm run build` produces a Vinext Worker and client assets in `dist/`; `npm test` checks exact arithmetic, progress protocol boundaries and actual local D1 operations. Run `npm run format:check`, `npm run lint`, and `npm run check:public` before a PR. The build validates authored LaTeX and lesson references. Public WebMCP tools are optional: the site works in browsers without them. The Learn diagnostic stays on the page; Studio indexes exact labs.

Lessons and experiments remain public. Sign in with ChatGPT to save private lesson marks across sessions. Practice offers account export, validated restore and reset, plus an explicit import of older device marks. Saves require a server acknowledgement; a lost acknowledgement requires reloading progress. See [progress operations](docs/progress-operations.md) for local D1, identity and deployment boundaries. Publish the merged source as a separate ChatGPT Sites version; a GitHub merge is not a deployment.

Practice also offers a [proof notebook](docs/proof-notebook.md) for every lesson. Write a whole argument, compare an unchanged capture with the authored proof, reflect, and revise. Writing stays in memory through in-app navigation; reload or close clears it. Export Markdown to keep exact attempts, reflections, and source provenance. The notebook needs no account and does not grade or change lesson marks.

Agents start with `npm run --silent agent -- help` and the [project verification skill](.agents/skills/verify/SKILL.md). Install Chromium explicitly with `npx --no-install playwright install chromium`, then run `npm run --silent agent -- drive --feature all --output /absolute/external/new-run`. This owns one built app and serial browser journeys, retaining failed traces and source/build identity. Browser reports remain separate from native WebMCP, mathematical review and production proof.

## Source boundary

Only original teaching prose, examples, practice and diagrams belong here. Raw course PDFs, textbook extracts, private source locators, student data and credentials must never be committed or published. Source notes in lessons describe alignment and verification status; they do not reproduce protected documents.
