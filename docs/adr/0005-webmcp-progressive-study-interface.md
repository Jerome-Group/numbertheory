# ADR 0005: WebMCP as a progressive study interface

Status: accepted, 2026-09-24.

The public page feature-detects `document.modelContext`. All reading, navigation, experiments, and practice remain usable when it is absent. WebMCP exposes public lesson lookup, theorem and proof reading, exact bounded computations, and visible state-setting commands. It has no publishing, credential, filesystem, or private-source tool.

The UI and tools call the same exact arithmetic and validated study-state functions. Read-only calls leave the route unchanged. State-changing tools retain their older required inputs and accept an optional `expectedRevision`; stale revisions are rejected before mutation. Tool schemas reject extra properties and bound inputs. Registration uses an abort signal so remounts cannot leave duplicate active tools.

The context and checkpoint tools omit hidden practice and synthesis answers. Tool outputs include canonical URLs and public source status only. Progress stays in browser storage and is not exposed by the agent interface.
