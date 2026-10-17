# Discover a route through Number Theory

A learner can find a concept, choose a complete path, compare a chapter checkpoint, and open the right lesson from every atlas view.

## Sub-features

- Six views are Learn, Explore, Practice, Studio, Reference, and MH3210 course alignment.
- The three-question diagnostic suggests the first missed concept or N05 when all answers are correct.
- The home multiplication preview changes fibers and opens C02.
- Sidebar and collection searches handle matches, no matches, clearing, and chapter filters.
- All five paths persist across reload and continue at the first pending lesson.
- Every chapter checkpoint reveals reasoning and opens a linked lesson.
- Reference opens a claim. Course distinguishes current and historical handout alignment.

## How to get to it (user POV)

Use the top navigation or `/`, `/explore`, `/practice`, `/studio`, `/reference`, and `/course`. Open lessons from cards, sidebar results, diagnostic results, path continuation, checkpoint links, reference rows, and course groups. On phone and tablet, choose **Open lessons** to search the sidebar.

## Driving it with Playwright

Preconditions:

- Locked build and browser prerequisites from the skill are complete.
- The output directory is fresh and external. Contexts begin without marks or path preferences. Path continuation uses an invented local account so completed lessons can be skipped.

Run `node .agents/skills/verify/scripts/drive.mjs --feature discovery --output /absolute/external/new-discovery`.

- Open all six routes and require the correct current navigation item, a usable heading, and no document overflow. Require visible home mathematics.
- Fill **Find a concept** with `Euclid`, then an absent phrase. Require the D04 card and the explicit empty result. Search sidebar `D04`, open it, and use **Clear search** after an absent phrase.
- In Practice, Studio, and Reference, search `D04`, require exactly one entry, test the empty state, clear, and change **Chapter**. Require exactly the source-derived visible IDs for that chapter. A Studio chapter without labs must show its empty state.
- Select each source-derived learning path, reload, require its pressed button, and choose **Continue**. Mark its first pending lesson complete with acknowledgement, return home, and require continuation to skip confirmed complete lessons. In Explore, require exactly that path's source-derived lesson IDs.
- Choose **All lessons** in Explore. For every checkpoint, choose **Compare your reasoning**, require the expanded comparison, then follow its source-derived linked ID.
- Switch the home preview to **Multiply by 5** and require changed fibers. Follow **Investigate every fiber**. Complete the diagnostic with all correct answers and then a missed first answer. Open the N05 and P00 suggestions.
- Open a reference row into `#theorem`. Open a course row after inspecting current MH-H01 and historical MH-H08 labels.

## Gotchas

The collection and sidebar share visible words. Scope selectors to the corresponding region. Path selection affects catalog membership and next lessons. Restore **All lessons** before checking all chapters. Diagnostic suggestions guide reading and do not grade understanding. Course labels do not establish current instructor approval.
