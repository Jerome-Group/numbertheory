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
| Network boundary | Every GET/PATCH header status 200, 401, 409, 400, 403, 413, 415, 500; actual JSON calls expose document, conflict, account_changed, invalid conflict, or body rejection; fetch rejection at either method |
| Tool | TLC 1.7.4, SHA-256 pinned in `scripts/formal-progress/tlc.mjs`; one worker, fixed fingerprint polynomial and seed; no simulation or truncated queue accepted |

Response documents are valid and writes acknowledge their requested owner with a newer revision. The model abstracts their contents into provenance. Failed network or JSON continuations can retain the last current document or expose no private document. Malformed success documents, other HTTP statuses, monotone revisions, bulk PUT payloads, legacy import, server ownership, D1 atomicity, cookies, real authentication, DOM events, and React rendering remain outside this property. No fairness or eventual recovery is proved.

The replay executes transpiled `src/progress.ts` in a fresh Node VM for each schedule. Its dependencies are the actual lesson catalogue and `parseProgressExport`. Only fetch, promise settlement, and browser storage boundaries are controlled. This verifies bounded store behavior, not host JavaScript semantics or a native browser journey.

## Failure controls

The command retains the original four source controls outside the checkout. Removing the empty loading publication catches retained private state after queued reload. Removing reload's generation increment catches a stale write acknowledgement, including its temporary publication before `finally`. Removing the read's post-JSON guard catches a late body after session clear. Removing session clearing's generation increment catches a late write body after clear.

A separate model regression restores the historical early return while writing. It must fail `PrivateStateCurrent` with the sequence ready, begin write, reload. Type checking (`TypeOK`) detects malformed model states; it is not an additional product guarantee.

## HTTP continuations and oracle retirement

The reviewed product files have no diff between `9e68db0def0ac4b7d1ceaa6ce9fde5357411e18d` and `f93e7cd7d97e607b8e45a226c1a95d3c9b4d0a53`. This maintenance repairs incomplete verification coverage; the product promise and bytes did not change. The old pass covered only HTTP 200 and missed a mutant deleting the 409 post-body generation guard.

| Concrete response | TLC class and current continuation | Actual replay |
| --- | --- | --- |
| 200 | success headers, guarded Body | Actual json() supplies a valid document |
| 401 | unauthorized, SessionInvalidation | Retire permission before current headers settle; source clears session |
| GET 409 | conflict headers, unavailable | No JSON event exists |
| PATCH 409 conflict | conflict-json, guarded ConflictBody publishes captured owner/epoch | Separate headers and conflict body awaits |
| PATCH 409 account_changed | guarded AccountInvalidation | Retire before current body settles; source clears account |
| PATCH 409 invalid | guarded uncertain failure | `{code:'invalid'}` exercises unknown conflict |
| 400/403/413/415 | rejected, write error or read unavailable | Enumerate each exact status |
| 500, fetch/body rejection | failure, write uncertain or read unavailable | Enumerate transport/body rejections separately |

All header, document, conflict and catch continuations honor currentness. Conflict, error and uncertain retain captured private provenance. Session invalidation cancels the reload queue; account invalidation retains it. Internal invalidations do not consume the two external inputs. Generation types expand administratively to `MaxInvalidations + MaxRequests + MaxWrites` (6); event, owner, request and write bounds remain unchanged.

The executable oracle retires all permitted documents before external reload/clear, every actual GET start (including finally's queued reload), current 401 headers, and current account_changed bodies. It grants only delivered current 200 documents. Request birth tokens are oracle tokens, not store generations; only current/stale provenance corresponds. It neither reads store internals nor recreates queue decisions. Retained subscriber violations catch temporary stale publications that finally hides.

The real source controls whether json() is called. After promise continuations drain, headers with no json() call become terminal. No invented GET409 or stale-response body can be scheduled. The old generation mutation's passing original witness therefore ends at its stale headers; the mutant alone reaches its extra body. Evidence retains both exact action lists.

`replay.outcomes` counts deliveries and actual json() calls accumulated across checked prefixes, including repeated prefix events; these are reachability counts, not unique paths or probabilities. Eighteen deterministic smoke schedules separately compare the actual final public status against every exact GET/PATCH header outcome and both additional 409 body codes. Privacy and branch-fidelity claims remain separate.

Every old source control remains. Both clear and reload between 409 headers/body remove only that body's generation fence and must fail PrivateStateCurrent on the captured account publication. A seventh control removes write's 200 post-body fence. Every source control first runs its passing original witness and retains the actual private violation. Both model controls similarly pair a complete passing original with an intended PrivateStateCurrent failure: historical queued reload and ConflictBody's currentness predicate. TypeOK failure, exception, timeout and changed anchors are never detections.
