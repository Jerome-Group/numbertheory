# Source status and rights

Refreshed 2026-09-24 against the canonical MH3210 course folder and both implementation handoffs. The current lecture-material folder still contains Lectures 01–07; no newer lecture issue was identified there. This is a metadata check, not a fresh theorem/page audit.
The 60 baseline lessons contain original explanations, proofs, examples, practice, and selected visuals. The 23 required additions are original drafts on the redesign branch; their full V2 learning and independent mathematical review remains pending.
No course PDF, textbook extract, assessment item, source download URL, or private file identifier is
part of this repository or the site build.

| MH3210 handouts | Status in the canonical course tree | Use here |
| --- | --- | --- |
| 01–07 | Current official handouts identified and topic maps checked | Optional topic alignment |
| 08–10 | Historical same-course handouts; current issues not identified | Provisional late-unit route, visibly labeled historical |

The lesson-to-handout map in `src/content/course-map.json` is a topic map. Its page and theorem
locators remain provisional; it does not certify that every site proof appears in a handout.
Course sources were used privately to check scope and conventions, not to copy text. D01 uses
the witness definition of divisibility at zero, while current Handout 01 restricts the divisor
to nonzero integers; the lesson flags that difference. D08's sieve and C05's generalized CRT
are original extensions to the handout route.

Independent mathematical review covered the baseline lesson batches, not the 23 new drafts. Strict KaTeX parsing,
prerequisite checks, exact arithmetic tests, and a finite certificate for the small Bertrand
cases run in CI. These checks support correctness, but do not turn course topic alignment into
an official endorsement. Refresh the handout status and page locators when new current issues
appear.
