# Release candidate verification

Local candidate checked on 2026-09-23 before the pull request. Repeat the public smoke check after the final merged source is published.

| Check | Evidence |
|---|---|
| Content and math | `npm run check:content`: 60 lessons, 4,446 strict LaTeX expressions, unique IDs and resolved prerequisites. All required P0 lab tags present. |
| Build and arithmetic | `npm run format:check`, `npm run lint`, `npm run check`, `npm test`, and `npm run build` passed. The suite has 45 arithmetic tests plus a finite Bertrand certificate covering every integer from 2 through 999. |
| Public-surface scan | `npm run check:public` passed over 100 source files and 63 build files. It rejects private file types, credential filenames, known token patterns, private local paths, and private Drive links. Review of the staged diff and original SVG asset remains part of the PR review. |
| Responsive math | In the Codex in-app browser, all 60 lessons were opened through native WebMCP at 320, 390, 768, and 1440 CSS px: 240 route checks, no document overflow, raw TeX delimiter, or KaTeX error. The eight visually distinct lab families were also checked at 768×320. These checks do not claim a full assistive-technology audit. |
| Keyboard and history | The first Tab reached the skip link; Enter focused `#main-content`. Search for “Pell” returned three lessons. The mobile drawer opened, selected R06, closed, and Back restored P00. |
| Native WebMCP | The in-app browser discovered 28 public tools. A real host invocation of `set_reciprocity_lattice` with `p=7,q=11` returned sign `-1` and opened Q04 with rendered math. The other P0 set actions were exercised against visible state, invalid inputs were rejected without mutating the URL, and tool outputs were checked against the exact kernels. No repository or deployment actions are registered. |
| Without WebMCP | Chrome had `document.modelContext` absent. The D04 human lab computed the gcd of 391 and 299 as 23, encoded the inputs in the URL, and restored the result on reload. |

All site prose, worked examples, diagrams, logo, and favicon were authored for this release. KaTeX and its bundled fonts arrive through the declared npm dependency. No course PDF or authenticated source is included. Topic-level source mappings and the \(0\mid0\) convention difference are disclosed in [source-status.md](source-status.md) and the affected lessons. Exact theorem/page locators remain provisional.
