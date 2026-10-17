# Read, explain, and practise every lesson

Every lesson retains its full argument, proof notes, examples, conditions, source status, and explicit self-report practice controls.

## Sub-features

- All 83 source-derived canonical and legacy lesson entries render the same durable lesson ID.
- Every reading section, proof step, original figure alternative, and source status is present.
- Every proof annotation opens. Wrong and correct reasoning choices give distinct feedback.
- Every claim recall, hint sequence, justified answer, and complete or review mark works.
- P00 proof repair, Q04 reciprocity check, R07 unit classification, and the C02 reasoning ladder preserve their distinct interactions.
- Prerequisites and next-lesson controls lead to the corresponding lessons.

## How to get to it (user POV)

Choose a card, sidebar lesson, search result, path continuation, checkpoint, reference, course row, prerequisite, or next lesson. Open a canonical `/lessons/<id>-<title>` URL or legacy `/?view=lesson&lesson=<ID>`. Use the lesson's **Argument** and **Your turn** section links.

## Driving it with Playwright

Preconditions:

- Complete the skill's build and browser setup.
- Start with fresh contexts and no saved marks.

Run `node .agents/skills/verify/scripts/drive.mjs --feature teaching --output /absolute/external/new-teaching`.

- For every mapped lesson and viewport, open its canonical route. Require its exact title, reading anchors, full authored proof-step count, and **Sources and status**.
- Open every **Why this step works** disclosure. Require visible annotation text. Where an original figure exists, require its figure and tabular alternative.
- Select one source-derived wrong explanation and require retry feedback. Select the correct explanation and require affirmative feedback.
- Choose **Check the claim**, reveal every authored hint in order, then **Show justified answer**. Require the corresponding claim, hints, and answer.
- Choose **Mark understood**, reload, and require the pressed mark. Choose **Review later**, then **Clear mark**, and require the state changes. Open the legacy URL and require the same complete lesson.
- For P00, Q04, and R07, choose wrong and correct special answers and reveal reasoning. For C02, enter a draft, show a hint, compare reasoning, and continue through every challenge.
- Follow a source-derived prerequisite and **Continue reading**. Require a changed lesson route.

## Gotchas

This proves controls and rendered content presence. It does not establish mathematical validity, grading, mastery, or course approval. Preserve exact arithmetic and content checks, and obtain independent semantic review. Correct-choice positions rotate by lesson ID, so use source labels rather than a fixed button position.
