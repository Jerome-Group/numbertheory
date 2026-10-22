# Read, explain, and practise every lesson

Every lesson retains its full argument, proof notes, examples, conditions, source status, and explicit self-report practice controls.

## Sub-features

- All 83 source-derived canonical and legacy lesson entries render the same durable ID, reading sections, and authored proof-step count.
- Authored questions, summaries, reading sections, proof steps, optional bridges, and source notes match the loaded source. Learning-objective text is not compared. Original figures have tabular alternatives.
- Exactly one proof annotation per source step opens and shows its authored label and explanation. Wrong and correct reasoning choices show their exact authored feedback.
- Every claim recall, hint sequence, and justified answer works. Signed-in complete and review marks require server acknowledgement.
- P00 proof repair, Q04 reciprocity check, R07 unit classification, and the C02 reasoning ladder preserve their distinct interactions.
- Prerequisites and next-lesson controls lead to the corresponding lessons.

## How to get to it (user POV)

Choose a card, sidebar lesson, search result, path continuation, checkpoint, reference, course row, prerequisite, or next lesson. Open a canonical `/lessons/<id>-<title>` URL or legacy `/?view=lesson&lesson=<ID>`. Use the lesson's **Argument** and **Your turn** section links.

## Driving it with Playwright

Preconditions:

- Complete the skill's build and browser setup.
- Every per-lesson case uses a fresh invented local account and real local D1 throughout reading, practice, marks, and the legacy visit. Special-experience cases are anonymous. Neither establishes hosted sign-in.

Run `node .agents/skills/verify/scripts/drive.mjs --feature teaching --output /absolute/external/new-teaching`.

- For every mapped lesson and viewport, open its canonical route. Require its exact title, unique reading anchors, authored proof-step count, visible mathematics with MathML, and **Sources and status**. Compare exact counts and ordered authored text for intuition, definitions, theorem, hypotheses, proof strategy, proof paragraphs, example, boundary, optional bridge, and source note. Repeat through its legacy entry.
- Require exactly one **Why this step works** disclosure and one reason paragraph per authored proof step. Open each and compare its visible reason with source. Hidden descendant prose cannot satisfy a comparison. TeX metadata counts only when its mathematical display is visible. Where an original figure exists, require its figure and tabular alternative.
- Select one source-derived wrong explanation and require retry feedback. Select the correct explanation and require affirmative feedback.
- Choose **Check the claim** and require revealed text equal to the visible theorem statement. Choose **Hide claim** and require the recalled paragraph to disappear. Reveal every authored hint in order, then **Show justified answer**. Compare each hint and answer with its authored source text, preserving visible mathematics as TeX without changing the page.
- Choose **Mark understood**, require PATCH acknowledgement and the pressed mark, reload, and require persisted account progress. Choose **Review later**, then **Clear mark**, and require each acknowledgement and GUI state.
- For P00, Q04, and R07, choose wrong and correct special answers and compare revealed reasoning with source. For every C02 stage, require a cleared draft and hidden hint and answer, enter a draft, and compare the revealed hint and answer with source. Continue through all challenges and require the terminal message without a next button.
- Follow a source-derived prerequisite and **Continue reading**. Require the exact source-derived next lesson and route. Select the Computational path and check previous/next targets, its first boundary, and its terminal message with no next button.

### Split a teaching profile

Run each partition with a fresh external output directory:

```sh
npm run --silent agent -- drive --feature teaching --profile tablet --shard 1/2 --output /absolute/external/tablet-1
npm run --silent agent -- drive --feature teaching --profile tablet --shard 2/2 --output /absolute/external/tablet-2
```

The source lesson order plus `teaching-special-experiences` determines the partition. Reports declare their shard and selected case IDs; unselected obligations remain not-evaluated. Omitting `--shard` keeps the full profile behavior and assertions.

Download both retained artifacts into two sibling directories under a fresh bundle directory, then validate that bundle:

```sh
npm run --silent agent -- teaching-profile --profile tablet --output /absolute/external/downloaded-tablet
```

Require a passed `complete-teaching-profile` result with all 84 cases. The read-only command needs Git and clean current source, with no installation or build. It rejects missing, duplicate, failed, interrupted, wrong-profile or wrong-source evidence and checks stopped instance ownership, artifact bytes and all case references after relocation. Scope hashes establish agreement between the pair, not independent scope recomputation. Separate build hashes remain distinct. The existing `evidence` command retains its exact current-build contract.

## Gotchas

This proves controls, rendered content presence, and local D1 integration. Injected local identities do not prove hosted sign-in. Mathematical validity, grading, mastery, and course approval need separate evidence. Preserve exact arithmetic and content checks, and obtain independent semantic review. Correct-choice positions rotate by lesson ID, so use source labels rather than a fixed button position.
