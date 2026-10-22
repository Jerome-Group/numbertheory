# ADR 0009: Whole-proof notebook in the current tab

Status: accepted.

The atlas has 83 complete authored proofs and aligned paragraph annotations. Learners need room to construct an argument and compare it without treating one paragraph order as the only valid proof.

The notebook accepts a whole argument. Comparison captures the exact text, including an empty page. Reflection and revision preserve earlier captures. Optional source cues and the full source remain available while writing. There is no automatic correctness or mastery result.

An App session owns a lesson-indexed map in memory. In-app navigation retains writing; reload and close clear it. This makes the lifetime explicit without adding personal writing to account progress, browser storage, imports, or a server schema. Export keeps exact text and canonical source provenance outside the tab.

Choosing a lesson within Practice updates the notebook and URL without triggering view navigation. The lesson picker keeps keyboard focus. Entry from another view uses the existing navigation path and focuses the notebook heading.

The source adapter derives the statement, definitions, conditions, proof, labels, reasons, boundary, and source note from the existing lesson and teaching registries. It does not maintain another proof corpus.

The selected whole-proof design replaced a paragraph reconstruction design. Ordered paragraph cues remain optional so a learner can study the authored route while retaining a different argument.
