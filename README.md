# Number Theory

An original, interactive atlas of elementary number theory. The 83 lessons pair precise statements and proofs with worked examples, practice and exact computational experiments. Five learning paths include a core route, an MH3210 topic map, a computational route, enrichment, and a bridge toward algebraic number theory. MH3210 alignment is supplementary; the concept IDs do not depend on a semester.

## Status

This repository holds the site source. Publication is a separate ChatGPT Sites version; the 2026-09-24 redesign is tracked in issue #10. The original 60 lesson IDs and query-string URLs remain available. Historical handout alignments are marked as such.

## Develop

Requires Node.js 24 and npm. Run `npm ci`, then `npm run dev`. Run `npm run build` for a static build in `dist/`; `npm test` checks exact arithmetic. Run `npm run format:check`, `npm run lint`, and `npm run check:public` before a PR. The build validates authored LaTeX and lesson references. Public WebMCP tools are optional: the site works in browsers without them. Lesson progress is stored locally in the browser. Publish the merged source as a separate ChatGPT Sites version; a GitHub merge is not a deployment.

## Source boundary

Only original teaching prose, examples, practice and diagrams belong here. Raw course PDFs, textbook extracts, private source locators, student data and credentials must never be committed or published. Source notes in lessons describe alignment and verification status; they do not reproduce protected documents.
