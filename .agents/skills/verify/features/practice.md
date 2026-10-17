# Save and transfer account progress

A signed-in learner can mark lessons, use the review queue, restore a backup, clear account marks, and explicitly import older device marks. Public reading works anonymously.

## Sub-features

- Lesson and worksheet controls save complete, review, or no mark after server acknowledgement.
- Fresh contexts recover the same account's D1 marks. Separate accounts retain separate maps.
- Review queue opens the marked lesson's real practice worksheet.
- Copyable schema1 JSON records exactly the displayed marks.
- Text restore and JSON-file import replace the mark map and survive reload.
- Reset supports cancellation, Escape, confirmation, and focus return.
- Invalid syntax, version, lesson IDs, and marks leave the prior map unchanged.
- Stale restore and reset revisions reject atomically and require explicit reload.
- Older device import is explicit, preserves existing account conflicts, and keeps original device bytes.
- A lost acknowledgement after a real database commit disables writes until explicit reload.
- Anonymous access disables marks. The server rejects foreign origins and mismatched account preconditions.
- The real sign-out click clears private client marks before its reserved top-level navigation.
- Synthetic lifecycle events clear and reload private UI state. A newer real account read fences a delayed older response.

## How to get to it (user POV)

Read any lesson anonymously. Use **Sign in with ChatGPT** to save marks. In **Your turn**, choose **Mark understood** or **Review later**. Choose **Practice**, then **Review later** and **Work this problem**. At **Your account progress**, use **Copy JSON backup**, **Show backup text**, **Import marks**, **Restore backup text**, or **Clear marks**. Use **Check this device for older marks** before choosing **Import older device marks**. After an uncertain save or conflict, choose **Reload progress**.

## Driving it with Playwright

Preconditions:

- Follow the skill's locked build and browser prerequisites.
- Use the driver's fresh local D1 and invented per-case Sites header identities. Never import real student data.
- Clipboard checks require Chromium permission controls. An unavailable denial prerequisite is a failure, not fallback proof.

Run `node .agents/skills/verify/scripts/drive.mjs --feature practice --output /absolute/external/new-practice`.

- Mark the first source-derived lesson for review. Require a successful real PATCH acknowledgement and the pressed GUI state. Open **Practice**, select **Review later (1)**, and require one worksheet. Open it and reveal its claim and justified answer.
- In that embedded worksheet, mark understood and require acknowledgement plus removal from the review queue. Choose **All problems**, reopen it, clear its mark, then mark for review and require its return to the queue.
- Grant clipboard permissions, choose **Copy JSON backup**, and read actual clipboard bytes. Require exact equality with **Progress backup**, schema version 1, and the review mark. Separately deny clipboard permission and require fallback guidance, focused textarea, and selection of every backup byte.
- Open **Clear marks**, cancel with Escape, and require focus on **Clear marks** with marks intact. Repeat with **Cancel**. Confirm **Clear all marks**, reload, and require an empty map.
- Restore the saved text and require acknowledged PUT plus exact GUI equality. Import a generated JSON file marking the second lesson complete. Require replacement, removal of the previous mark, and persistence after reload.
- Attempt malformed JSON, unsupported version, mixed valid and unknown IDs, and an invalid mark. Repeat malformed import through the file input. Require the prior displayed map after each rejection and its persisted equality after a final reload.
- Open distinct A and B browser contexts. Save different marks through each GUI, then open a fresh A context. Require A's original mark and B's different map from actual D1. Reject foreign Origin, missing account precondition, and B's account precondition on A's request. Require both documents unchanged.
- Keep one account context stale while another saves. Attempt both text restore and reset through the stale GUI. Require 409 `conflict`, disabled writes, unchanged D1 data, and explicit reload recovery.
- Seed clearly invented older localStorage bytes. Require no automatic merge. Save an account conflict, check older marks without writing, then explicitly import. Require the account mark to win, non-conflicting older marks to appear, and exact original local bytes after reload.
- Intercept a real PATCH with Playwright `route.fetch()`, require successful backend commit, then abort only the browser acknowledgement. Require last confirmed GUI marks, **Save unconfirmed**, and disabled write controls. Explicitly reload, recover the committed mark, and require the next fresh intent to increment the revision once.
- In an anonymous context, require public reading, disabled marks, and progress API 401. Inspect reserved sign-in and sign-out anchor paths and `_top` targets. Actual hosted roundtrips remain unverified locally.
- Click the real sign-out anchor. Read cleared and disabled client marks in a bubbling click observer after React's handler. Allow the reserved top-level request, then abort it locally. Require durable D1 marks unchanged. This proves client clearing before navigation. It does not prove hosted logout.
- Dispatch explicit `pagehide`, persisted `pageshow`, and visible `visibilitychange` events. Require synchronous private-mark clearing and real API reload. Hold one actual A read, switch to invented B dispatcher headers, complete a newer B read, then release A's response. Require B's GUI map and both unchanged D1 documents. These are event/response fence probes; native BFcache and hosted account switching remain unverified.

## Gotchas

The built Worker uses real local D1. Injected identity headers simulate only the trusted local dispatcher; they do not establish hosted authentication or two real accounts. Local Wrangler cannot complete Sites reserved sign-in or sign-out roundtrips. Use separate hosted evidence for those prerequisites. Writes are pessimistic; wait for acknowledgement and the visible result before asserting marks. A mark is a self-report. Browser-storage denial and corrupt older-data recovery require additional fixtures and remain unverified.
