import { lazy, Suspense, useSyncExternalStore } from 'react';
import { CancellationLab } from './CancellationLab';
import { LessonCore } from './LessonCore';
import { lessons } from './content/lessons';
import { lessonV2 } from './content/registries';
import type { Lesson } from './content/types';
import { MathText } from './MathText';
import { studyStore } from './state';

const EuclidLab = lazy(() =>
  import('./BasicLabs').then((module) => ({ default: module.EuclidLab })),
);
const GaussianLab = lazy(() =>
  import('./GaussianLab').then((module) => ({ default: module.GaussianLab })),
);
const SquareRootLab = lazy(() =>
  import('./SquareRootLab').then((module) => ({
    default: module.SquareRootLab,
  })),
);
const CrtLab = lazy(() =>
  import('./BasicLabs').then((module) => ({ default: module.CrtLab })),
);
const LinearLab = lazy(() =>
  import('./BasicLabs').then((module) => ({ default: module.LinearLab })),
);
const ContinuedFractionStaircaseLab = lazy(() =>
  import('./ContinuedFractionLabs').then((module) => ({
    default: module.ContinuedFractionStaircaseLab,
  })),
);
const PellHyperbolaOrbitLab = lazy(() =>
  import('./ContinuedFractionLabs').then((module) => ({
    default: module.PellHyperbolaOrbitLab,
  })),
);
const HenselRootTreeLab = lazy(() =>
  import('./HenselLab').then((module) => ({
    default: module.HenselRootTreeLab,
  })),
);
const DivisorIncidenceLab = lazy(() =>
  import('./GroupLabs').then((module) => ({
    default: module.DivisorIncidenceLab,
  })),
);
const PrimitiveRootCycleLab = lazy(() =>
  import('./GroupLabs').then((module) => ({
    default: module.PrimitiveRootCycleLab,
  })),
);
const ReciprocityLatticeLab = lazy(() =>
  import('./GroupLabs').then((module) => ({
    default: module.ReciprocityLatticeLab,
  })),
);
const QuadraticResidueMapLab = lazy(() =>
  import('./ResidueLabs').then((module) => ({
    default: module.QuadraticResidueMapLab,
  })),
);
const ResidueClockLab = lazy(() =>
  import('./ResidueLabs').then((module) => ({
    default: module.ResidueClockLab,
  })),
);

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
  const model = lessonV2.find((item) => item.id === lesson.id);
  if (!model) throw new Error(`Missing lesson model ${lesson.id}`);
  return (
    <div className="reading-shell">
      <div className="breadcrumb">
        ATLAS <span>/</span> {lesson.cluster.toUpperCase()} <span>/</span>{' '}
        {lesson.id}
      </div>
      <div
        className={`lesson-head ${lesson.lab === 'euclid' || lesson.lab === 'crt' ? 'with-instrument' : ''}`}
      >
        <div>
          <p className="eyebrow">
            {lesson.id} · {lesson.cluster}
          </p>
          {model && (
            <p className="lesson-archetype">
              {model.archetype.replace('-', ' ')}
            </p>
          )}
          <h1 id="lesson-heading" tabIndex={-1}>
            {lesson.title}
          </h1>
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
      {lesson.id === 'C02' && <CancellationLab />}
      {lesson.id === 'N04' && (
        <Suspense fallback={<p>Loading exact lab…</p>}>
          <GaussianLab />
        </Suspense>
      )}
      {lesson.id === 'X05' && (
        <Suspense fallback={<p>Loading exact lab…</p>}>
          <SquareRootLab />
        </Suspense>
      )}
      <div className="reading-grid">
        <article className="lesson-body">
          <LessonCore
            lesson={lesson}
            model={model}
            onSelect={select}
            lab={
              lesson.id === 'C02' ||
              lesson.id === 'N04' ||
              lesson.id === 'X05' ? null : (
                <Suspense fallback={<p>Loading exact lab…</p>}>
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
                        studyStore.setOrderInputs(
                          inputs.prime,
                          inputs.candidate,
                        )
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
                          input.kind === 'rational'
                            ? input.numerator
                            : state.cfn,
                          input.kind === 'rational'
                            ? input.denominator
                            : state.cfd,
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
                </Suspense>
              )
            }
          />
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
