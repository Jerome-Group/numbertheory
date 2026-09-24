# ADR 0004: Stable lesson routes and versioned content

Status: accepted, 2026-09-24.

The public concept ID remains the durable identity. Canonical URLs use `/lessons/<id>-<slug>`; the old `?lesson=<id>` links and meaningful lab parameters resolve through the route and state adapters. Back and Forward restore the visible lesson. The static Sites host serves the single-page application for these routes.

The V2 registry separates a lesson's ordered experience blocks, claims, worked examples, and exercises. The original V1 records remain the authored source during migration; an explicit adapter carries their full theorem, proof, example, practice, caution, bridge, and provenance text into V2 records. `legacy-adapted` is a truthful status, not a claim of independent pedagogical review. The migration ledger records every original ID and every required addition.

This preserves the substantial existing proofs while permitting distinct discovery, proof-workshop, algorithm-lab, structure-bridge, and case-study sequences. Later content revisions can replace a lesson's V1 source with native V2 records without changing its ID or URL.
