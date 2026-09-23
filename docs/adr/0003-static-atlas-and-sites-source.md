# ADR 0003: Static atlas with exact client mathematics

Status: accepted for the first implementation slice, 2026-09-23.

The public site is a Vite/React static build hosted by ChatGPT Sites. The GitHub repository is the reviewed source; a Sites version is saved from the merged commit and deployed separately. A merge never implies publication. The Sites project is bound by `.openai/hosting.json`. Private course files and the handoff archives remain outside the repository.

Each concept has a stable ID and a continuous lesson record. Proofs, examples, and practice are original, with course alignment labeled separately. KaTeX renders authored LaTeX with strict build validation and MathML output. Exact integer algorithms use `BigInt` and bounded decimal strings at URL, UI and WebMCP boundaries. The Euclidean lab, URL restore, and WebMCP adapter call the same state commands; unsupported WebMCP leaves reading and controls intact.

This avoids a database, sign-in, model API, or server runtime for an authored curriculum. Later features requiring durable personal state need a separate decision and privacy review. The static route uses a stable `lesson` query parameter so direct links work without server rewrite assumptions.
