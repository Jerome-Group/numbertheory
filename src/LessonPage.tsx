import { useSyncExternalStore } from 'react';
import { EuclidLab, CrtLab, LinearLab } from './BasicLabs';
import {
  ContinuedFractionStaircaseLab,
  PellHyperbolaOrbitLab,
} from './ContinuedFractionLabs';
import { lessons } from './content/lessons';
import type { Lesson } from './content/types';
import { HenselRootTreeLab } from './HenselLab';
import {
  DivisorIncidenceLab,
  PrimitiveRootCycleLab,
  ReciprocityLatticeLab,
} from './GroupLabs';
import { MathText } from './MathText';
import { QuadraticResidueMapLab, ResidueClockLab } from './ResidueLabs';
import { Practice, NextLesson } from './StudyPanels';
import { studyStore } from './state';

export function LessonPage({
  lesson,
  onSelect,
}: {
  lesson: Lesson;
  onSelect: (id: string) => void;
}) {
  const state = useSyncExternalStore(
    studyStore.subscribe,
    studyStore.getSnapshot,
  );
  const select = onSelect;
  return (
    <div className="reading-shell">
      <div className="breadcrumb">
        ATLAS <span>/</span> {lesson.cluster.toUpperCase()} <span>/</span>{' '}
        {lesson.id}
      </div>
      <div className={`lesson-head ${lesson.lab ? 'with-instrument' : ''}`}>
        <div>
          <p className="eyebrow">
            {lesson.id} · {lesson.cluster}
          </p>
          <h1>{lesson.title}</h1>
          <p className="question">
            <MathText text={lesson.question} />
          </p>
          <p className="summary">
            <MathText text={lesson.summary} />
          </p>
        </div>
        {lesson.lab === 'euclid' && state.result && (
          <div className="hero-instrument">
            <span className="instrument-kicker">LIVE EXAMPLE · EUCLID</span>
            <strong>
              <MathText
                text={`\\(\\gcd(${state.a},${state.b})=${state.result.gcd}\\)`}
              />
            </strong>
            <div className="instrument-rule" />
            <div className="instrument-trace">
              {state.result.steps.slice(0, 3).map((step, i) => (
                <div key={i}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <MathText
                    text={`\\(${step.dividend}=${step.quotient}\\cdot${step.divisor}+${step.remainder}\\)`}
                  />
                </div>
              ))}
            </div>
            <a href="#lab">Inspect the full trace ↓</a>
          </div>
        )}
        {lesson.lab === 'crt' && state.crt && (
          <div className="hero-instrument">
            <span className="instrument-kicker">LIVE EXAMPLE · CRT</span>
            <strong>
              {state.crt.compatible ? (
                <MathText
                  text={`\\(x\\equiv${state.crt.residue}\\pmod{${state.crt.modulus}}\\)`}
                />
              ) : (
                <span>No common class</span>
              )}
            </strong>
            <div className="instrument-rule" />
            <div className="instrument-trace">
              <div>
                <span>01</span>
                <MathText
                  text={`\\(x\\equiv${state.crt.a}\\pmod{${state.crt.m}}\\)`}
                />
              </div>
              <div>
                <span>02</span>
                <MathText
                  text={`\\(x\\equiv${state.crt.b}\\pmod{${state.crt.n}}\\)`}
                />
              </div>
            </div>
            <a href="#lab">Test another system ↓</a>
          </div>
        )}
      </div>
      <div className="reading-grid">
        <article className="lesson-body">
          <section id="definition" className="content-section">
            <h2>Start with the definition</h2>
            {lesson.definition.map((text, i) => (
              <p key={i}>
                <MathText text={text} />
              </p>
            ))}
          </section>
          <section id="theorem" className="content-section">
            <h2>The claim</h2>
            <div className="theorem">
              <div className="callout-label">THEOREM</div>
              <p>
                <MathText text={lesson.theorem} />
              </p>
            </div>
          </section>
          <section id="proof" className="content-section">
            <h2>Why it is true</h2>
            {lesson.proof.map((text, i) => (
              <p key={i}>
                <MathText text={text} />
              </p>
            ))}
          </section>
          <section id="example" className="content-section">
            <h2>Worked example</h2>
            <p className="section-lead">
              <MathText text={lesson.example.prompt} />
            </p>
            <ol className="worked-steps">
              {lesson.example.steps.map((text, i) => (
                <li key={i}>
                  <span className="step-text">
                    <MathText text={text} />
                  </span>
                </li>
              ))}
            </ol>
            <p className="result-line">
              <MathText text={lesson.example.conclusion} />
            </p>
          </section>
          {lesson.lab === 'euclid' && <EuclidLab />}
          {lesson.lab === 'crt' && <CrtLab />}
          {lesson.lab === 'linear' && <LinearLab />}
          {lesson.lab === 'residue' && <ResidueClockLab />}
          {lesson.lab === 'quadratic' && <QuadraticResidueMapLab />}
          {lesson.lab === 'hensel' && <HenselRootTreeLab />}
          {lesson.lab === 'divisor' && (
            <DivisorIncidenceLab
              lessonId={lesson.id as 'A03' | 'A04'}
              initialInputs={{
                n: state.divisorN,
                leftFunction: state.divisorF,
                rightFunction: state.divisorG,
              }}
              onRun={(inputs) =>
                studyStore.setDivisorInputs(
                  inputs.n,
                  inputs.leftFunction,
                  inputs.rightFunction,
                )
              }
            />
          )}
          {lesson.lab === 'order' && (
            <PrimitiveRootCycleLab
              lessonId={lesson.id as 'U01' | 'U02'}
              initialInputs={{
                prime: state.orderP,
                candidate: state.orderG,
              }}
              onRun={(inputs) =>
                studyStore.setOrderInputs(inputs.prime, inputs.candidate)
              }
            />
          )}
          {lesson.lab === 'lattice' && (
            <ReciprocityLatticeLab
              initialInputs={{ p: state.latticeP, q: state.latticeQ }}
              onRun={(inputs) =>
                studyStore.setLatticeInputs(inputs.p, inputs.q)
              }
            />
          )}
          {lesson.lab === 'continued-fraction' && (
            <ContinuedFractionStaircaseLab
              key={`${lesson.id}-${state.cfn}-${state.cfd}-${state.cfD}-${state.cfterms}`}
              id="lab"
              initialInput={
                lesson.id === 'R05'
                  ? { kind: 'sqrt', radicand: state.cfD }
                  : {
                      kind: 'rational',
                      numerator: state.cfn,
                      denominator: state.cfd,
                    }
              }
              initialVisibleTerms={Number(state.cfterms)}
              onRun={(_result, input, visibleTerms) =>
                studyStore.setContinuedFractionInputs(
                  input.kind,
                  input.kind === 'rational' ? input.numerator : state.cfn,
                  input.kind === 'rational' ? input.denominator : state.cfd,
                  input.kind === 'sqrt' ? input.radicand : state.cfD,
                  String(visibleTerms),
                )
              }
            />
          )}
          {lesson.lab === 'pell' && (
            <PellHyperbolaOrbitLab
              key={`${lesson.id}-${state.pellD}-${state.pellCount}`}
              id="lab"
              initialRadicand={state.pellD}
              initialCount={state.pellCount}
              onRun={(orbit) =>
                studyStore.setPellInputs(
                  orbit.radicand,
                  String(orbit.solutions.length),
                )
              }
            />
          )}
          <Practice key={lesson.id} lesson={lesson} />
          <section id="boundary" className="content-section">
            <h2>Watch the boundary</h2>
            <p>
              <MathText text={lesson.caution} />
            </p>
          </section>
          {lesson.bridge && (
            <section id="bridge" className="content-section bridge">
              <span className="callout-label">ALGEBRA LENS</span>
              <p>
                <MathText text={lesson.bridge} />
              </p>
            </section>
          )}
          <footer className="lesson-footer">
            <h2>Sources and status</h2>
            <p>{lesson.sourceNote}</p>
            <p>
              Proof and examples are authored for this site. The source locator
              is not a claim that private course material is published here.
            </p>
          </footer>
          <NextLesson id={lesson.id} onSelect={select} />
        </article>
        <aside className="context-rail" aria-label="On this lesson">
          <div className="rail-inner">
            <span className="rail-heading">ON THIS LESSON</span>
            <a href="#definition">Definition</a>
            <a href="#theorem">The claim</a>
            <a href="#proof">Proof</a>
            <a href="#example">Worked example</a>
            {lesson.lab && <a href="#lab">Experiment</a>}
            <a href="#practice">Practice</a>
            <div className="rail-divider" />
            <span className="rail-heading">BEFORE THIS</span>
            {lesson.prerequisites.length ? (
              lesson.prerequisites.map((id) => (
                <button type="button" key={id} onClick={() => select(id)}>
                  {id} ·{' '}
                  {lessons.find((x) => x.id === id)?.title ?? 'Prerequisite'}
                </button>
              ))
            ) : (
              <p>Start here</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
