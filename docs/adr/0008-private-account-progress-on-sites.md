# ADR 0008: Private account progress on a Sites Worker

Status: accepted, 2026-10-18. Supersedes ADR 0003's static-only runtime and device-only state, and ADR 0004's static host description.

Keep the authored atlas and exact experiments public. Use the supported Sites Vinext Worker for private progress, Sites-owned Sign in with ChatGPT for identity, and one D1 document per trusted account ID. Public WebMCP tools continue to expose only public study state. The existing Sites project, audience and lesson routes remain stable.

Single-lesson changes patch the current JSON document atomically and increment its revision. Whole-document import and reset compare the last acknowledged revision. Each write also carries the account ID captured by the interface; the server checks it against trusted identity before accessing D1. This prevents an old account's intent from changing a newly signed-in account.

Display acknowledged marks. A lost write acknowledgement blocks further changes until an explicit reload; replay could overwrite a newer decision. Account changes and sign-out clear in-memory marks. Keep no persistent private cache or offline queue. These boundaries avoid the extra state and conflict rules of an outbox or event log.

Older local schema1 marks are offered only through an explicit import. Existing account marks win, and the original device data remains intact. Schema1 JSON remains the portable backup format.

Generated migrations are immutable. Sites applies hosted migrations before Worker upload, so rollback must retain the database even when the prior static version is restored. Local identity fixtures and D1 tests verify application behavior; genuine hosted dispatch and authentication require separate production checks.

Revisit when users need offline editing, account deletion, or progress beyond bounded lesson marks. Those require an explicit retention and conflict design rather than extending this document implicitly.
