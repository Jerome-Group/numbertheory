# Discover a route through Number Theory

A learner can find a concept, choose a complete path, compare a chapter checkpoint, and open the right lesson from every atlas view.

## Sub-features

- Six views are Learn, Explore, Practice, Studio, Reference, and MH3210 course alignment.
- The three-question diagnostic suggests the first missed concept or N05 when all answers are correct.
- The home multiplication preview transfers its displayed modulo-12 factor into C02's exact lab.
- Home's **All lessons** opens the full atlas. Its named complete-route action keeps the selected path. Both clear collection restrictions.
- Sidebar and collection searches handle matches, no matches, clearing, and chapter filters.
- Sidebar chapter expansion and collapse persist across reload.
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
- On Explore with an empty sidebar search, expand every source-derived chapter and require its exact lesson IDs. Reload and require all chapters expanded. Collapse every chapter, reload, and require all panels hidden. Reopen the responsive drawer after reload when needed.
- In Practice, Studio, and Reference, search `D04`, require exactly one entry, test the empty state, clear, and change **Chapter**. Require exactly the source-derived visible IDs for that chapter. A Studio chapter without labs must show its empty state.
- Select each source-derived learning path, reload, require its pressed button, and choose **Continue**. Mark its first pending lesson complete with acknowledgement, return home, and require continuation to skip confirmed complete lessons. In Explore, require exactly that path's source-derived lesson IDs.
- Choose Core, search `D04`, and select its chapter in Reference. Traverse Learn, Explore, and Reference through top navigation. Require the path, search, chapter, and matching membership to persist.
- Return home through top navigation and choose the distinct **All lessons** arrow. Require the exact source lesson ID set, pressed **All lessons**, empty search, and **Every chapter** in Reference. Repeat with Core and restrictive search and chapter controls. Choose **See the complete Core route**. Require exactly the source-derived Core IDs, Core pressed, and cleared restrictions.
- Choose **All lessons** in Explore. For every checkpoint, choose **Compare your reasoning**, compare the exact authored prompt and answer, then follow every source-derived linked lesson.
- Before each home factor check, set C02 to factor 6 modulo 14. Return home through top navigation and select **Multiply by 4** or **Multiply by 5**. Require the exact preview gcd, input multiplicity, and three displayed fibers. Follow **Investigate every fiber**. Require C02 at `#lab`, focus on its heading, modulus 12, the selected factor, every exact fiber, and all twelve input/output rows. One Back must return home. Forward and reload must restore the same experiment and focus. Submit another valid C02 calculation and require form focus to remain.
- Complete the diagnostic with the first miss at each question and with all answers correct. Use later wrong answers to check first-missed priority. Require and open P00, C02, N04, and N05 with their exact titles and routes.
- Open a reference row into `#theorem`. Open a course row after inspecting current MH-H01 and historical MH-H08 labels.

## Gotchas

The collection and sidebar share visible words. Scope selectors to the corresponding region. The active lesson opens its sidebar chapter. A nonempty sidebar search opens matching chapters regardless of saved disclosure preferences. Check persistence from Explore with an empty search. Path selection filters Home and Explore and sets next-lesson order. Overview collection search and chapter controls survive ordinary top navigation. Explicit home complete-collection actions clear those controls. Sidebar search remains independent. Restore **All lessons** before checking all chapters. The default modulus 12 may be omitted from shared URLs. Assert restored inputs and exact results. The preview draft is local and restarts after lesson navigation. Diagnostic suggestions guide reading and do not grade understanding. Course labels do not establish current instructor approval.
