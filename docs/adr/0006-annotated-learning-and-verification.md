# ADR 0006: An annotated mathematical book with honest release evidence

Status: accepted, 2026-10-03.

The existing atlas already contained proofs, examples, boundaries, exact labs and practice. The redesign strengthens comprehension and navigation across its fixed 83 lessons rather than adding a mathematical syllabus. Research rationale and limitations live in [learning-design.md](../research/learning-design.md).

Use a continuous reading path: idea, definitions, conditions, complete argument, example, selected experiment, practice and boundary. Named proof stages and optional local explanations support both overview and logical detail. Complete arguments stay visible; interaction never unlocks required mathematics. Original figures appear where they complement a proof, with tables/captions carrying the same mathematical relationships. Finite examples illustrate universal statements; they do not certify them.

Learning paths include transitive prerequisites in publication order. A selected path governs Continue and next-lesson navigation. Understanding marks remain local self-reports, not measured mastery. Existing progress storage/schema, lesson IDs, routes, historical course alignment, exact arithmetic and public source boundaries remain compatible.

Progress export uses copyable schema1 JSON with visible, selectable text when clipboard access fails. Actual in-app-browser QA and the user's download check found file downloads stopped; that unsuccessful action is not release evidence. Retire the download control explicitly in the generated feature map, retain JSON-file import, and verify copied bytes through restoration. This keeps progress transferable without depending on a browser downloader.

The visual system uses warm paper, dark ink, cobalt structure and lime emphasis. System sans-serif establishes navigation/hierarchy; serif prose supports sustained argument reading. Reading widths and section anchors reduce page-search effort; compact chapter navigation and responsive single-column layouts preserve the same content on small screens. Color has textual/shape companions. Motion is optional and reduced-motion rules remove transitions. No external font, runtime AI, account, or content service is introduced.

One CLI executes the local and CI automated gates and generates the current content/feature/journey map. It separates automated success from release readiness. Release additionally requires current in-app-browser observations and independent semantic review, tied to source, dependency lock, built assets and coverage-map hashes. Evidence records identify actual observations, retained artifact digests, reviewers and authors of each reviewed partition. Missing, failed, duplicate, stale or tampered evidence fails. These integrity checks cannot determine whether a human's observation is true; review and actual browser work remain necessary.

Evidence stays outside this public source tree, where it may contain browser state or local paths. Public documentation records rationale and bounded outcomes; it does not publish private progress or authenticated browser material. A GitHub merge is still distinct from a Sites deployment; only reviewed merged source is published to the existing project/domain, with the preceding version retained for rollback.
