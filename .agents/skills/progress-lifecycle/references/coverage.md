# Progress lifecycle coverage

The property `PrivateStateCurrent` prevents a previous account's name or marks from remaining visible after refresh or session clear. Its harm is private progress displayed while the application checks a different account.

## Source-to-model mapping

| Product code | Model action or state | Executable replay |
| --- | --- | --- |
| `src/progress.ts`: module state, `publish` | `generation`, `kind`, `visibleOwner`, `visibleEpoch`; a name and lesson map form one private document | Reads both public snapshots after each action and at every synchronous subscription callback |
| `reload`: generation increment and empty loading publication before the writing guard | `Invalidate`; `Reload` queues when a write is active, otherwise starts a read | Invalidates the independent oracle before invoking the real `reload` |
| `reload`: `await fetch`, generation guard, `await response.json`, second generation guard | `Headers`, `Body`; each promise continuation is a separate action | Releases fetch headers and JSON bodies separately, including rejection at either await |
| `write`: admission, captured generation and account, saving publication | `BeginWrite`; one outstanding write | Calls the real `set` and keeps the confirmed document visible until acknowledgement |
| `write`: fetch and JSON guards; `finally` clears writing and starts a queued reload | `Headers`, `Body`, `Reject`, `Complete`, `BeginRead` | Observes intermediate publications, including any stale acknowledgement immediately before `finally` clears it |
| `clearSession`: generation increment, queue cancellation, empty anonymous publication | `ClearSession` | Calls the real function while either promise can be pending |
| `src/AccountControls.tsx`: mount, visible `visibilitychange`, persisted `pageshow`, `pagehide`, sign-out | Supplies `Reload` and `ClearSession` inputs | Calls the same store methods; DOM event registration and React rendering are outside this check |

`requiredEpoch` is an independent specification clock. `visibleEpoch` records the provenance of the acknowledged document, representing both name and marks. `badPublish` retains a stale publication that a queued reload could hide before a continuation returns. The executable oracle separately records the actual delivered documents permitted in the current epoch; it reads no store internals and copies no lifecycle implementation.

The model groups synchronous code between await boundaries into one transition. `Complete` includes `finally` and the synchronous start of its queued reload. `badPublish` preserves a subscriber-visible intermediate publication inside that transition. Subscribers are assumed not to reenter the store. The replay observes these publications directly and drains promise continuations at the next event-loop boundary.

## Bounds and assumptions

Both checks start after an acknowledged document for `account-alpha`. The replay obtains it through the real `reload`, using the real lesson catalogue and progress parser.

| Check | Scope |
| --- | --- |
| TLC | Two owners, two external reload or clear inputs, one write, at most three subsequent requests; all reachable event orders within these limits |
| Actual TypeScript | Every generated schedule prefix of at most nine events after ready, two invalidations, one PATCH intent, two response owners, two actual lesson IDs (`P00`, `C02`), revisions 1 and 2 |
| Network boundary | Each fetch and each successful response body has an independently controlled promise; success, fetch rejection, and body rejection are enumerated |
| Tool | TLC 1.7.4, SHA-256 pinned in `scripts/formal-progress/tlc.mjs`; one worker, fixed fingerprint polynomial and seed; no simulation or truncated queue accepted |

Response documents are valid and writes acknowledge their requested owner with a newer revision. The model abstracts their contents into provenance. Failed network or JSON continuations can retain the last current document or expose no private document. Explicit HTTP status handling, malformed documents, monotone revisions, bulk PUT payloads, legacy import, server ownership, D1 atomicity, cookies, real authentication, DOM events, and React rendering remain outside this property. No fairness or eventual recovery is proved.

The replay executes transpiled `src/progress.ts` in a fresh Node VM for each schedule. Its dependencies are the actual lesson catalogue and `parseProgressExport`. Only fetch, promise settlement, and browser storage boundaries are controlled. This verifies bounded store behavior, not host JavaScript semantics or a native browser journey.

## Failure controls

The command writes four modified copies of the actual product source outside the checkout. Removing the empty loading publication catches retained private state after queued reload. Removing reload's generation increment catches a stale write acknowledgement, including its temporary publication before `finally`. Removing the read's post-JSON guard catches a late body after session clear. Removing session clearing's generation increment catches a late write body after clear.

A separate model regression restores the historical early return while writing. It must fail `PrivateStateCurrent` with the sequence ready, begin write, reload. Type checking (`TypeOK`) detects malformed model states; it is not an additional product guarantee.
