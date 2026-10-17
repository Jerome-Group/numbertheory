# Read, explain, and practise every lesson

Every lesson retains its full argument, proof notes, examples, conditions, source status, and explicit self-report practice controls.

## Sub-features

- All 83 source-derived canonical and legacy lesson entries render the same durable ID, reading sections, and authored proof-step count.
- Every reading section, proof step, original figure alternative, and source status is present.
- Every proof annotation opens. Wrong and correct reasoning choices give distinct feedback.
- Every claim recall, hint sequence, and justified answer works. Signed-in complete and review marks require server acknowledgement.
- P00 proof repair, Q04 reciprocity check, R07 unit classification, and the C02 reasoning ladder preserve their distinct interactions.
- Prerequisites and next-lesson controls lead to the corresponding lessons.

## How to get to it (user POV)

Choose a card, sidebar lesson, search result, path continuation, checkpoint, reference, course row, prerequisite, or next lesson. Open a canonical `/lessons/<id>-<title>` URL or legacy `/?view=lesson&lesson=<ID>`. Use the lesson's **Argument** and **Your turn** section links.

## Driving it with Playwright

Preconditions:

- Complete the skill's build and browser setup.
- Mark cases use fresh invented local accounts and real local D1. Other lesson interactions remain public.

Run `node .agents/skills/verify/scripts/drive.mjs --feature teaching --output /absolute/external/new-teaching`.

- For every mapped lesson and viewport, open its canonical route. Require its exact title, reading anchors, authored proof-step count, visible mathematics with MathML, and **Sources and status**. Require the same structural checks through its legacy entry.
- Open every **Why this step works** disclosure. Require visible annotation text. Where an original figure exists, require its figure and tabular alternative.
- Select one source-derived wrong explanation and require retry feedback. Select the correct explanation and require affirmative feedback.
- Choose **Check the claim** and require revealed text equal to the visible theorem statement. Choose **Hide claim** and require the recalled paragraph to disappear. Reveal every authored hint in order, then **Show justified answer**. Compare each hint and answer with its authored source text, preserving the TeX annotations when normalizing a detached DOM copy.
- Choose **Mark understood**, require PATCH acknowledgement and the pressed mark, reload, and require persisted account progress. Choose **Review later**, then **Clear mark**, and require each acknowledgement and GUI state.
- For P00, Q04, and R07, choose wrong and correct special answers and reveal reasoning. For C02, enter a draft, show a hint, compare reasoning, and continue through every challenge.
- Follow a source-derived prerequisite and **Continue reading**. Require the exact source-derived next lesson and route. Select the Computational path and check previous/next targets, its first boundary, and its terminal message with no next button.

## Gotchas

This proves controls, rendered content presence, and local D1 integration. Injected local identities do not prove hosted sign-in. Mathematical validity, grading, mastery, and course approval need separate evidence. Preserve exact arithmetic and content checks, and obtain independent semantic review. Correct-choice positions rotate by lesson ID, so use source labels rather than a fixed button position.
