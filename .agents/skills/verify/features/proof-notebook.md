# Construct and revise a whole proof

The notebook accepts an argument for every source-derived lesson. Its tab session retains writing through in-app navigation. Comparison and revision retain exact captures without grading a learner's route.

## Sub-features

- Learn and each lesson before the complete proof open the Practice notebook.
- The picker supports every lesson. `?proof=ID` selects a known lesson; an unknown ID shows recovery.
- Optional conditions, definitions, strategy, paragraph cues, and the complete source proof remain available while writing.
- Comparison captures exact text, including an empty page. Repeated comparison cannot overwrite a capture.
- Reflection is learner self-assessment. Revision edits a copy; a new blank attempt retains capture history.
- In-app lesson and overview navigation preserve each lesson's notebook. Reload clears every notebook.
- Reset supports Cancel, Escape, confirmation, focus return, and isolation from other lesson notebooks.
- Selectable Markdown and downloaded bytes include exact attempts, reflections, authored source, and canonical lesson provenance.
- No notebook action writes account progress or evaluates correctness or mastery.

## How to get to it (user POV)

Choose **Open proof notebook** on Learn, **Write your own proof** before a lesson's complete proof, or **Practice**. Read the tab lifetime, choose **Lesson to prove**, and write **Your whole argument**. Use **Read the source proof now** whenever useful. Choose **Compare with source**, write **What will you keep or change?**, then choose **Revise this argument** or **New blank attempt**. Use **Show Markdown export** or **Download Markdown** before reloading or closing. **Read this lesson** returns through in-app navigation.

## Driving it with Playwright

Preconditions:

- Use the verification skill's fresh locked Worker build and anonymous browser context. No account fixture is needed for notebook cases.
- Run `node .agents/skills/verify/scripts/drive.mjs --feature practice --output /absolute/external/new-practice`. Optional `--profile phone|tablet|desktop` scopes the run.

`scripts/proof-notebook.mjs` runs under the existing practice domain and shared `runCase` helpers. Its detailed journey runs on every selected profile. Desktop's source inventory derives all lesson IDs from the shared map and checks every exact authored proof, label, explanation, boundary, source note, and claim through visible MathText. Phone and tablet cover source-derived shortest and longest proofs, the first lesson, and the mathematical Q04 proof. Unselected source obligations remain not evaluated.

Require lesson selection to keep focus in the picker. Native popup keyboard behavior needs a separate headed browser check. Open the picker, move with an arrow key, confirm the selection, and verify that the claim changes while focus remains in the picker. Headless selection does not establish that check. Require an empty comparison, long text and an unbroken word without document overflow, literal HTML-like writing, unchanged original text after reflection and revision, lesson and overview retention, separate lesson drafts, and new-blank history. Require exact downloadable UTF-8 equality with the selectable Markdown, selection of every character, reset Cancel and Escape focus return, explicit confirmation, and preservation of another lesson. Reload must clear writing while retaining a valid URL selection. An invalid URL must show recovery, update to the first known lesson, and focus the picker. Observe network requests throughout and require no account progress writes.

After direct loading and repeated lesson changes, require exactly one cue panel, workspace, and claim, one of each source cue control, and closed disclosure, export, and reset controls while each lesson retains its writing, captures, and reflections.

## Gotchas

`go()` reloads the document and clears tab memory. Use visible in-app controls for retention checks. Selectable export is the fallback when a host browser does not save a download. Passing Chromium download checks does not prove a native in-app browser saves files. Source checks establish authored equality; they do not establish that the learner's proof is correct or that the authored proof has received independent mathematical review. Hosted, native accessibility, and production observations remain separate.
