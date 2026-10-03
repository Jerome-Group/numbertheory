# Number Theory learning-design research

Research and repository inspection, 2026-10-03. This document records the evidence and rationale for the existing-scope redesign. Research, product-page observations, implementation choices, and learner validation are separate evidence categories. No learner validation occurred.

## Design decision and scope

Evidence supports an integrated mathematical reading experience: question → concrete instance → invariant → rigorous argument → application → conditions/counterexample → retrieval. Keep the existing undergraduate scope. Visuals expose structure; interaction elicits prediction, explanation, or a decision.

Read-only inspection of CONTEXT.md, LessonCore.tsx, StudyPanels.tsx, and examples from all 13 content files found substantial existing pedagogy: definitions, complete proofs, worked examples, practice, boundaries, algebra bridges, retrieval before claim reveal, progressive hints, justified answers, local self-reported progress, and exact labs with textual traces. Opportunity: connect these pieces and strengthen proof comprehension/feedback. Adding absent proofs or labs is not an accurate diagnosis.

Scope includes foundations, divisibility, modular arithmetic, arithmetic functions, prime bounds, polynomial congruences/Hensel lifting, primitive roots, quadratic reciprocity, sums of squares, continued fractions, further elementary arithmetic, and introductory algebraic number theory. No mathematical expansion is proposed.

## Primary research

- Fischbein, *Intuition and Proof*: intuitive conviction and deductive justification are distinct. Explain why a model suggests a result and where its persuasive force stops; let misleading intuitions be revised. Theoretical discussion/historical studies, not a website trial. A convincing finite picture is not a universal proof. Original article: https://flm-journal.org/Articles/3C2FDFF14268CD1E813E785AD584E4.pdf
- Duval, *A Cognitive Analysis of Problems of Comprehension in a Learning of Mathematics*: recognizing the same object across prose, symbols, tables, and diagrams is itself learned mathematical work. Explicitly teach these translations. Framework, not evidence every added view helps; conventions require instruction. https://link.springer.com/article/10.1007/s10649-006-0400-z
- Ainsworth, DeFT: choose representations for complementary information, constraints on interpretation, or deeper understanding. Design the translation task too. Multiple views add coordination demands; a permanent three-pane display may cost more than it contributes. Original paper: https://www.sciencedirect.com/science/article/pii/S0959475206000259
- Sweller and Cooper, worked examples: novices benefit from a worked route before unaided search, followed by structurally related practice and diminishing guidance. Five algebra experiments; benefits specific to structurally similar problems, not demonstrated arbitrary proof transfer. Original abstract: https://www.tandfonline.com/doi/abs/10.1207/s1532690xci0201_3
- Weber, strategic proof knowledge: students can know relevant facts yet fail to construct proofs. Explain why a theorem or representation is useful at a particular point. Abstract-algebra comparison; the strategic categories are hypotheses from that observed contrast. https://link.springer.com/article/10.1023/A:1015535614355
- Mejía-Ramos et al., proof comprehension: assess statement meaning, logical chaining, high-level ideas, modules, methods, and examples. Provide global and local comprehension support. Assessment framework illustrated in number theory; does not establish that clicking through steps improves understanding. Original: https://link.springer.com/article/10.1007/s10649-011-9349-7 ; author-supplied abstract: https://eric.ed.gov/?id=EJ948400
- Chi and Wylie, ICAP: producing an explanation/inference differs from merely manipulating a display. A slider alone does not imply deep cognitive engagement. ICAP's interactive category involves substantive co-construction with another person; do not equate solo interface clicking with it. Original: https://education.asu.edu/sites/default/files/lcl/chiwylie2014icap_2.pdf
- Karpicke and Blunt, retrieval: reconstruct claims, conditions, and argument outlines before checking; revisit after intervening work. Science-text experiments, not advanced proof studies. Retrieval complements explanation and problem solving, not replacing them with flashcards. Authors' paper: https://learninglab.psych.purdue.edu/downloads/2011/2011_Karpicke_Blunt_Science.pdf
- Shute, formative feedback: explain the mathematical issue and a useful next action. Feedback should be specific and supportive. Synthesis; detail/timing depend on learner/task, and immediate full solutions can remove productive effort. Author-hosted report: https://myweb.fsu.edu/vshute/pdf/shute%202007_f.pdf
- *Effects of representational format on learning combinatorics from an interactive computer simulation*: diagram conditions increased cognitive load in this study; text plus arithmetic performed best for procedural learning. One simulation/task domain, not a condemnation of diagrams; rejects “more visual is better” as a sufficient rationale. Original open-access study: https://link.springer.com/article/10.1007/s11251-008-9056-7

## Actual product-page inspection and its limits

Directly inspected public lesson/page content through web browsing. This researcher did not successfully manipulate these products or complete a visual usability test: browser-control setup failed. A separate prime-spirals screenshot is present in the saved baseline evidence; its existence is not evidence of tested interactions. These are firsthand page-content observations, not tested interaction, keyboard, animation, accessibility, or learning-outcome claims.

- Mathigon primes lesson: factorization, sieve instructions/predictions, Euclid argument. Activities interleave with narrative; completion gating has skip/reveal-all escape. Borrow short local questions and explicit transitions, not compulsory unlocking for an undergraduate reference. Its informal factorization wording also demonstrates the need for precise domain qualifications here. https://mathigon.org/course/divisibility/primes
- Seeing Theory basic probability: narrow sections combine experiment, formula, and changing a meaningful parameter; distinct single/batch actions described. Borrow bounded mathematical experiments, not stochastic spectacle for exact number theory. Page labels itself archived. https://seeing-theory.brown.edu/basic-probability/index.html
- 3Blue1Brown prime spirals: checks what is plotted, compares all integers against primes to separate causes, explains residue classes before application. Borrow representation literacy and deliberate comparison; do not import the article's extra mathematics. https://www.3blue1brown.com/lessons/prime-spirals/
- Desmos: official documentation describes keyboard exploration, points/curves/axes, audio trace, and onscreen equivalents. Documentation inspection only. Borrow meaningful access to the same relationships without relying solely on sight. Sonification is optional; its discrete-arithmetic benefit must be justified. https://help.desmos.com/hc/en-us/articles/4404860698253-Introduction-to-Accessibility-Features ; https://help.desmos.com/hc/en-us/articles/37064105800333-Audio-Trace
- Polypad: official API documentation lists prime-factor circles, sector labels, and equation/coordinate links. Documentation only, no canvas test. General-purpose canvas flexibility also imposes tool-learning irrelevant to a focused lesson. https://polypad.amplify.com/api/documentation

## Chosen teaching approach

Keep the continuous lesson as the primary object, with an editorial argument rather than a fixed parade of cards.

1. Opening question: mathematical stakes and what existing knowledge cannot resolve; one selected instance if useful.
2. Idea before detail: short mechanism overview—permutation, invariant, pairing, local-to-global decomposition, descent, controlled approximation.
3. Definition and claim in context: domains, quantifiers, and hypotheses remain visible, with their jobs explained.
4. Representation if it clarifies: adjacent explanation of what it represents, one small prediction, explicit connection to a proof obligation.
5. Proof at two levels: strategy/module outline followed by the complete continuous proof; optional annotations explain transitions and hypothesis use. Full proof readily readable.
6. Worked example: explain why the next method is chosen as well as the arithmetic.
7. Varied practice: computation, condition/boundary checks, proof comprehension or construction where appropriate.
8. Recall and next connection: claim, conditions, mechanism. “Understood” stays an explicit self-report, not certified mastery.

## Interaction candidates within existing scope

| Existing concept | Representation / action | Mathematical work |
| --- | --- | --- |
| Euclid/Bézout | Remainder equations, tiling, coefficient trace; step/reset | Predict remainder; explain gcd preservation; connect back-substitution to witness |
| Modular cancellation | Multiplication fibers/table, collisions, coprime contrast | Predict injectivity; construct counterexample; identify reduced modulus |
| CRT | Residue table, paired coordinates, compatible/incompatible presets | Explain existence, gcd compatibility, lcm uniqueness |
| Euler/order/generators | Orbit and unit table | Separate guaranteed and least returns; explain unit permutation |
| Arithmetic functions | Prime-exponent table/divisor lattice and finite sums | Identify multiplicativity; contrast shared-prime and coprime inputs |
| Hensel | Next-digit tree with exact expansion | Predict no/one/all lifts; explain derivative condition |
| Quadratic arithmetic | Paired inputs and proof-matched lattice counts | Explain multiplicity or count parity; preserve rigorous argument |
| Continued fractions | Convergent table with named error metric and exact fraction comparison | Distinguish error notions, alternating bounds, strict thresholds |
| Gaussian arithmetic | Lattice and norm equations | Connect norm multiplication, units, associates, factorization scope |
| Bertrand/Jacobsthal | Static argument outline with named bounds and identities | Explain proof dependency, contradiction/count, local bound; avoid forced animation |

Every interaction needs a meaningful default, interesting comparison, exact output, reset, declared limits, textual trace/table, keyboard operation, and an observation-to-proof sentence. Distinguish exhaustive finite verification from an illustrative universal instance.

## Accessibility

Dragging must have click/tap alternatives as well as keyboard controls. W3C distinguishes the single-pointer alternative required by the dragging criterion from independent keyboard requirements: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html

Use labels/patterns alongside color. Text data and mathematical summaries convey the important relationships. User-controlled/reducible animation; responsive reading order and accessible equations. Documentation precedents do not establish that this site's implementation meets those requirements.

## Alternatives and tradeoffs

- Annotated mathematical book: rigorous, durable, readable on mobile and printable. Risk: experiments remain detached appendices. Strong baseline.
- Narrative with integrated exact experiments: preferred candidate; keeps rigor while exposing mechanisms. Requires deliberate authorship per representation.
- Permanent theorem/visual/proof workspace: useful selectively for Euclid/CRT/orbits; high coordination and narrow-screen cost. Avoid globally.
- Activity-gated course: encourages attempts but obstructs reference use and independent pace. Optional practice route; complete content accessible.
- Free-form sandbox: expressive but distracts from goals and increases maintenance. Prefer bounded concept-specific controls.

Evaluation should test explanation of mechanism, conditions, examples-versus-proofs distinction, and a nearby unfamiliar task. Completing controls or enjoyment alone does not establish learning. No learner validation has occurred.


## Journey decisions

- **Learn:** begin or continue a coherent prerequisite-complete route. Path preparation belongs in the route rather than an unexplained jump. Completion marks are learner self-reports; the interface must not represent them as measured mastery.
- **Explore:** find a concept and navigate chapter connections. A chapter route is useful without requiring a graph; any map metaphor must accurately describe the representation actually offered.
- **Practice:** retrieve a claim and its conditions, attempt an existing problem, progressively reveal hints, compare justified reasoning, and mark a local revisit. Diagnostic feedback names the misconception, not merely correctness. Correct option positions should vary to avoid a positional shortcut.
- **Reference:** locate the exact statement, domains and conditions quickly, then open the complete contextual proof. Search and chapter filtering serve intentional lookup.
- **Studio:** enter a bounded exact experiment at its instrument, inspect textual evidence, and return to the proof. It complements continuous mathematical reading rather than becoming a separate computational syllabus.

The implementation choice is the annotated mathematical book with selectively integrated exact experiments. Labels and optional local reasons explain proof mechanisms while preserving every original paragraph. Complete content remains accessible; practice does not gate reading. A static argument outline is preferable to forced interaction when the proof's main work is a sequence of estimates or a delicate descent.

## Evaluation boundary

Source review can establish that a condition is stated, a proof remains complete, options have valid feedback, or routes include prerequisites. Browser checks can establish that a control changes the intended visible state, a link reaches its target, or a layout fits a tested viewport. Neither establishes learning. A future learner study would need to observe explanation of the mechanism, use of hypotheses, distinction between illustration and proof, and transfer to a nearby unfamiliar task. Those outcomes have not been measured here.

Baseline observations and historical provenance are recorded in [redesign-baseline.md](../redesign-baseline.md). Release verification remains a separate record; the research sources above do not certify this site's accessibility or effectiveness.

## Lead's additional product interaction observations

The lead separately used the Codex in-app browser on the public products and retained screenshots in the external baseline bundle. Mathigon's primes lesson was read through its sieve/factorization sections; Next step was clicked and the subsequent state captured, without asserting a verified sieve mutation. Seeing Theory's archived basic-probability page was opened, its coin Flip control clicked, and subsequent chart labels observed; no exact random count was asserted. The 3Blue1Brown prime-spirals polar-coordinate check was answered and its visible Correct feedback verified. These bounded interactions informed the choices above. They are not complete product audits or evidence of learner outcomes.
