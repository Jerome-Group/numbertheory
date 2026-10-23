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
  /\ s' = [Invalidate(s) EXCEPT !.queued = FALSE, !.kind = "anonymous",
                               !.invalidations = @ + 1]

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

Complete(state, id, publish, owner, failed) ==
  LET request == state.requests[id]
      current == request.generation = state.generation
      published == IF publish
                   THEN [state EXCEPT !.visibleEpoch = request.epoch,
                                      !.visibleOwner = owner, !.kind = "ready",
                                      !.badPublish = @ \/ request.epoch # state.requiredEpoch]
                   ELSE IF failed /\ current
                        THEN [state EXCEPT !.kind = IF request.kind = "write"
                                                   THEN "uncertain" ELSE "unavailable"]
                        ELSE state
      finished == [published EXCEPT !.requests[id].phase = "done",
                                    !.writing = IF request.kind = "write" THEN 0 ELSE @]
  IN IF request.kind = "write" /\ state.queued THEN BeginRead(finished) ELSE finished

Headers(id) ==
  /\ s.requests[id].phase = "fetch"
  /\ s' = IF s.requests[id].generation # s.generation
          THEN Complete(s, id, FALSE, "none", FALSE)
          ELSE [s EXCEPT !.requests[id].phase = "json"]

Body(id, owner) ==
  /\ s.requests[id].phase = "json"
  /\ s.requests[id].kind = "read" \/ owner = s.requests[id].owner
  /\ s' = Complete(s, id, s.requests[id].generation = s.generation, owner, FALSE)

Reject(id) ==
  /\ s.requests[id].phase \in {"fetch", "json"}
  /\ s' = Complete(s, id, FALSE, "none", TRUE)

Next ==
  Reload \/ ClearSession \/ BeginWrite \/
  (\E id \in 1..Len(s.requests):
    Headers(id) \/ Reject(id) \/ (\E owner \in Accounts: Body(id, owner)))

TypeOK ==
  /\ s.generation \in 0..(MaxInvalidations + MaxWrites)
  /\ s.requiredEpoch \in 0..(MaxInvalidations + MaxWrites)
  /\ s.visibleEpoch \in {-1} \cup 0..(MaxInvalidations + MaxWrites)
  /\ s.visibleOwner \in Accounts \cup {"none"}
  /\ s.kind \in {"ready", "saving", "loading", "anonymous", "error", "uncertain", "unavailable"}
  /\ s.writing \in 0..MaxRequests
  /\ s.queued \in BOOLEAN
  /\ Len(s.requests) <= MaxRequests
  /\ s.invalidations \in 0..MaxInvalidations
  /\ s.writes \in 0..MaxWrites
  /\ s.badPublish \in BOOLEAN

PrivateStateCurrent ==
  /\ s.visibleEpoch = -1 \/ s.visibleEpoch = s.requiredEpoch
  /\ ~s.badPublish

Spec == Init /\ [][Next]_vars
=============================================================================
