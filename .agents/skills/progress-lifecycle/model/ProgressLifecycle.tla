-------------------------- MODULE ProgressLifecycle --------------------------
EXTENDS Integers, Sequences, FiniteSets

CONSTANTS Accounts, InitialAccount, MaxInvalidations, MaxWrites, MaxRequests
VARIABLE s
vars == <<s>>

Request(kind, generation, epoch, owner) ==
  [kind |-> kind, phase |-> "fetch", generation |-> generation,
   epoch |-> epoch, owner |-> owner]

Init ==
  s = [generation |-> 0, requiredEpoch |-> 0, visibleEpoch |-> 0,
       visibleOwner |-> InitialAccount, kind |-> "ready", writing |-> 0,
       queued |-> FALSE, requests |-> <<>>, invalidations |-> 0,
       writes |-> 0, badPublish |-> FALSE]

Invalidate(state) ==
  [state EXCEPT !.generation = @ + 1, !.requiredEpoch = @ + 1,
                !.visibleEpoch = -1, !.visibleOwner = "none", !.kind = "loading"]

SessionInvalidation(state) ==
  [Invalidate(state) EXCEPT !.queued = FALSE, !.kind = "anonymous"]

AccountInvalidation(state) ==
  [Invalidate(state) EXCEPT !.kind = "unavailable"]

BeginRead(state) ==
  LET next == Invalidate(state)
  IN [next EXCEPT !.queued = FALSE,
                 !.requests = Append(@, Request("read", next.generation,
                                                next.requiredEpoch, "none"))]

Reload ==
  /\ s.invalidations < MaxInvalidations
  /\ s.writing # 0 \/ Len(s.requests) < MaxRequests
  /\ s' = IF s.writing # 0
          THEN [Invalidate(s) EXCEPT !.queued = TRUE, !.invalidations = @ + 1]
          ELSE [BeginRead(s) EXCEPT !.invalidations = @ + 1]

ClearSession ==
  /\ s.invalidations < MaxInvalidations
  /\ s' = [SessionInvalidation(s) EXCEPT !.invalidations = @ + 1]

BeginWrite ==
  /\ s.writes < MaxWrites
  /\ s.writing = 0
  /\ s.kind \in {"ready", "error"}
  /\ s.visibleOwner \in Accounts
  /\ Len(s.requests) < MaxRequests
  /\ s' = [s EXCEPT !.writing = Len(s.requests) + 1, !.writes = @ + 1,
                    !.kind = "saving",
                    !.requests = Append(@, Request("write", s.generation,
                                                   s.requiredEpoch, s.visibleOwner))]

Complete(state, id, outcome, owner) ==
  LET request == state.requests[id]
      private == outcome \in {"ready", "conflict", "error", "uncertain"}
      published == IF private
                   THEN [state EXCEPT !.visibleEpoch = request.epoch,
                                      !.visibleOwner = owner, !.kind = outcome,
                                      !.badPublish = @ \/ request.epoch # state.requiredEpoch]
                   ELSE IF outcome = "unavailable"
                        THEN [state EXCEPT !.kind = "unavailable"]
                        ELSE state
      finished == [published EXCEPT !.requests[id].phase = "done",
                                    !.writing = IF request.kind = "write" THEN 0 ELSE @]
  IN IF request.kind = "write" /\ state.queued THEN BeginRead(finished) ELSE finished

Failure(state, id, outcome) ==
  Complete(state, id, IF state.requests[id].kind = "write" THEN outcome ELSE "unavailable",
           state.requests[id].owner)

Headers(id, outcome) ==
  /\ s.requests[id].phase = "fetch"
  /\ s' = IF s.requests[id].generation # s.generation
          THEN Complete(s, id, "ignored", "none")
          ELSE CASE outcome = "success" -> [s EXCEPT !.requests[id].phase = "json"]
                 [] outcome = "unauthorized" -> Complete(SessionInvalidation(s), id, "ignored", "none")
                 [] outcome = "conflict" /\ s.requests[id].kind = "write" ->
                      [s EXCEPT !.requests[id].phase = "conflict-json"]
                 [] outcome = "rejected" -> Failure(s, id, "error")
                 [] OTHER -> Failure(s, id, "uncertain")

Body(id, owner) ==
  /\ s.requests[id].phase = "json"
  /\ s.requests[id].kind = "read" \/ owner = s.requests[id].owner
  /\ s' = Complete(s, id, IF s.requests[id].generation = s.generation
                           THEN "ready" ELSE "ignored", owner)

ConflictBody(id, code) ==
  LET current == s.requests[id].generation = s.generation
  IN /\ s.requests[id].phase = "conflict-json"
     /\ s' = IF ~current THEN Complete(s, id, "ignored", "none")
             ELSE CASE code = "conflict" -> Complete(s, id, "conflict", s.requests[id].owner)
                    [] code = "account_changed" -> Complete(AccountInvalidation(s), id, "ignored", "none")
                    [] OTHER -> Failure(s, id, "uncertain")

Reject(id) ==
  /\ s.requests[id].phase \in {"fetch", "json", "conflict-json"}
  /\ s' = IF s.requests[id].generation = s.generation
          THEN Failure(s, id, "uncertain") ELSE Complete(s, id, "ignored", "none")

Next ==
  Reload \/ ClearSession \/ BeginWrite \/
  (\E id \in 1..Len(s.requests):
    (\E outcome \in {"success", "unauthorized", "conflict", "rejected", "failure"}: Headers(id, outcome)) \/
    Reject(id) \/ (\E owner \in Accounts: Body(id, owner)) \/
    (\E code \in {"conflict", "account_changed", "invalid"}: ConflictBody(id, code)))

EpochBound == MaxInvalidations + MaxRequests + MaxWrites

TypeOK ==
  /\ s.generation \in 0..EpochBound
  /\ s.requiredEpoch \in 0..EpochBound
  /\ s.visibleEpoch \in {-1} \cup 0..EpochBound
  /\ s.visibleOwner \in Accounts \cup {"none"}
  /\ s.kind \in {"ready", "saving", "loading", "anonymous", "error", "uncertain", "unavailable", "conflict"}
  /\ s.writing \in 0..MaxRequests
  /\ s.queued \in BOOLEAN
  /\ Len(s.requests) <= MaxRequests
  /\ \A id \in 1..Len(s.requests):
       /\ s.requests[id].kind \in {"read", "write"}
       /\ s.requests[id].phase \in {"fetch", "json", "conflict-json", "done"}
       /\ s.requests[id].generation \in 0..EpochBound
       /\ s.requests[id].epoch \in 0..EpochBound
       /\ s.requests[id].owner \in Accounts \cup {"none"}
  /\ s.invalidations \in 0..MaxInvalidations
  /\ s.writes \in 0..MaxWrites
  /\ s.badPublish \in BOOLEAN

PrivateStateCurrent ==
  /\ s.visibleEpoch = -1 \/ s.visibleEpoch = s.requiredEpoch
  /\ ~s.badPublish

Spec == Init /\ [][Next]_vars
=============================================================================
