# Keep and transfer explicit progress

A learner can mark lessons, work from the review queue, transfer device marks, reset them deliberately, and retain unchanged progress after a rejected import.

## Sub-features

- Lesson and worksheet controls set complete, review, or no mark.
- Review queue opens the marked lesson's real practice worksheet.
- Copyable schema1 JSON records exactly the displayed marks.
- Text restore and JSON-file import replace the mark map and survive reload.
- Reset supports cancellation, Escape, confirmation, and focus return.
- Invalid syntax, version, lesson IDs, and marks leave the prior map unchanged.

## How to get to it (user POV)

Use **Your turn** in any lesson. Choose **Practice**, then **Review later** and **Work this problem**. At **Your local progress**, use **Copy JSON backup**, **Show backup text**, **Import marks**, **Restore backup text**, and **Clear marks**.

## Driving it with Playwright

Preconditions:

- Follow the skill's locked build and browser prerequisites.
- Use a fresh disposable context. Never import real student data.

Run `node .agents/skills/verify/scripts/drive.mjs --feature practice --output /absolute/external/new-practice`.

- Mark the first source-derived lesson for review. Open **Practice**, select **Review later (1)**, and require one worksheet. Open it and reveal its claim and justified answer.
- Choose **Copy JSON backup** and parse **Progress backup**. Require schema version 1 and exactly the review mark.
- Open **Clear marks**, cancel with Escape, and require focus on **Clear marks** with marks intact. Repeat with **Cancel**. Confirm **Clear all marks**, reload, and require an empty map.
- Restore the saved text and require exact equality. Import a generated JSON file marking the second lesson complete. Require replacement, removal of the previous mark, and persistence after reload.
- Attempt malformed JSON, unsupported version, mixed valid and unknown IDs, and an invalid mark. Repeat malformed import through the file input. Require the entire prior map after each rejection and reload.

## Gotchas

Clipboard permissions can fall back to selectable text. The backup textarea is the portable transfer proof. The site has explicit local marks and no account backend at this baseline. File import is asynchronous; wait for its result message. A mark is a self-report. Storage-denial and corrupt-storage recovery need additional browser fixtures and remain unverified in this driver.
