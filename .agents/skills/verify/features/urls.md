# Resume URLs, use the keyboard, and inspect optional tools

A learner can reopen a shared result, traverse browser history, recover from bad routes, and use the responsive lesson navigation. An agent can use native WebMCP when its host provides it.

## Sub-features

- Search opens Euclid, a prerequisite leads back to its experiment, and the resulting shared inputs survive reload.
- Legacy input links normalize after a real submission and survive reload, Back, and Forward.
- Section hashes restore argument focus, including same-lesson reload.
- Every lab entry receives malformed query input and must leave reading and navigation usable.
- Continued-fraction ArrowLeft presses retain slider focus and update one entry each time.
- Phone and tablet drawers close through Escape, close button, and scrim in Learn and Lesson views.
- Main content is inert while the drawer is open. Tab and Shift+Tab wrap visible controls, and closing releases focus.
- Same and different lesson selection focus the proper heading. Back to a section while the drawer is open closes it and focuses that section.
- Unknown canonical, legacy, and arbitrary routes recover through **Return to the atlas**.
- Native WebMCP discovery, read-only parity, visible setter parity, revision checks, and registration lifetime require a separate IAB lane.

## How to get to it (user POV)

Open a lesson link with input query parameters or a reading-section hash. Submit an experiment, share its URL, reload, and use browser Back and Forward. On phone or tablet, choose **Open lessons**. Native tools appear through the supported IAB host after the actual public page registers them.

## Driving it with Playwright

Preconditions:

- Complete the skill's browser and locked build setup.
- Local Chromium has no native `document.modelContext`. If it does, report this prerequisite mismatch and use a separate native lane.

Run `node .agents/skills/verify/scripts/drive.mjs --feature urls --output /absolute/external/new-urls`.

- Search Explore for `D04`, open its lesson card, follow prerequisite `D03`, and use Back. Choose **Experiment**, submit `391,299`, reload the exact shared URL, and require gcd `23`.
- Restore D04 through its legacy URL with inputs `240,46`, submit `252,105`, reload, and traverse Explore, Back, and Forward. Require the corresponding visible inputs and routes.
- Reload the lesson's `#proof` URL and require focus on its argument heading. Reveal a practice answer with native WebMCP absent.
- Open each unknown route form and choose **Return to the atlas**. Require the Learn hero.
- Open every lab entry with a source-related malformed query parameter. Require a usable lesson and a working **Learn** button. Empty body or script errors fail.
- At R01 with `cfterms=4`, focus **Reveal convergents through entry**. Press ArrowLeft twice and require `4`, `3`, `2`, persistent focus, matching URL, reload, and Back restoration.
- In Learn and Lesson, open the drawer and close it by each method. Require removed inert state, restored **Open lessons** focus, unlocked scrolling, and untrapped subsequent Tab.
- Select the current lesson and a different lesson from the drawer. Require the right heading focus. Wrap Tab and Shift+Tab across visible controls. Open the drawer in Explore and use Back to a lesson argument; require focus on that argument.

For native IAB proof, use the same owned `--launch-only` origin in an actual in-app browser. After selecting its tab through CUA, run `const tools = await (await tab.capabilities.get("webmcp")).fetchTools()` and `tools.description()`. Use the returned schemas and documented `tools.call(name, input)` method. If discovery is unavailable, retain that failed prerequisite; do not install a shim. Compare the discovered names and schemas with the source-derived map. Call `tools.call("get_number_theory_context", {})` and read its revision. Call `tools.call("compute_euclid", { a: "240", b: "46" })` and require the gcd and Bézout certificate without URL or revision mutation. Call `set_euclid_example` through `tools.call` with the current `expectedRevision`, require the D04 route and visible fields, and compare its result with the human **Run Euclid** output. Repeat a setter using the old revision and require rejection with unchanged URL, fields, and revision. Attempt extra and malformed parameters and require the same atomicity. Reload and rediscover to check registration lifetime. Capture native calls, results, page snapshots, actual host identity, and source/build identity as separate native evidence.

## Gotchas

Playwright cannot establish native WebMCP, IAB compatibility, independent mathematical review, or production identity. Native tool schemas and method names must come from actual discovery. Browser Back is the real user path for a section change while the drawer is open. Do not call internal navigation setters to force it. Keep baseline malformed-URL and slider-focus failures visible until the product is fixed and the journeys pass again. Drawer-test deletion additionally needs negative controls that remove inert handling and focus restoration and cause these browser checks to fail.
