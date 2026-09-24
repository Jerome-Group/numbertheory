import type { ReactNode } from 'react';
import type { LessonV2 } from './content/lesson-v2';
import {
  claimRegistry,
  exampleRegistry,
  exerciseRegistry,
} from './content/registries';
import type { Lesson } from './content/types';
import { MathText } from './MathText';
import { ProofRepair } from './ProofRepair';
import { NextLesson, Practice } from './StudyPanels';

export function LessonCore({
  lesson,
  model,
  lab,
  onSelect,
}: {
  lesson: Lesson;
  model: LessonV2;
  lab: ReactNode;
  onSelect: (id: string) => void;
}) {
  const firstDefinition = model.blocks.findIndex(
    (block) => block.kind === 'definition',
  );
  return (
    <>
      {model.blocks.map((block, index) => {
        switch (block.kind) {
          case 'question':
            return null;
          case 'definition':
            return index === firstDefinition ? (
              <section
                id="definition"
                className="content-section"
                key={block.id}
              >
                <h2>Start with the definition</h2>
                {model.blocks
                  .filter((item) => item.kind === 'definition')
                  .map((item) => (
                    <p key={item.id}>
                      <MathText text={item.text} />
                    </p>
                  ))}
              </section>
            ) : null;
          case 'claim': {
            const claim = claimRegistry.get(block.id);
            if (!claim) throw new Error(`Missing claim ${block.id}`);
            return (
              <section id="theorem" className="content-section" key={block.id}>
                <h2>The claim</h2>
                <div className="theorem">
                  <div className="callout-label">THEOREM</div>
                  <p>
                    <MathText text={claim.statement} />
                  </p>
                </div>
              </section>
            );
          }
          case 'proof': {
            const claim = claimRegistry.get(block.id);
            if (!claim) throw new Error(`Missing proof ${block.id}`);
            return (
              <div key={`${block.id}.proof`}>
                {lesson.id === 'P00' && <ProofRepair />}
                <section id="proof" className="content-section">
                  <h2>Why it is true</h2>
                  {claim.proof.map((text, step) => (
                    <p key={`${block.id}.${step}`}>
                      <MathText text={text} />
                    </p>
                  ))}
                </section>
              </div>
            );
          }
          case 'example': {
            const example = exampleRegistry.get(block.id);
            if (!example) throw new Error(`Missing example ${block.id}`);
            return (
              <section id="example" className="content-section" key={block.id}>
                <h2>Worked example</h2>
                <p className="section-lead">
                  <MathText text={example.prompt} />
                </p>
                <ol className="worked-steps">
                  {example.steps.map((text, step) => (
                    <li key={`${block.id}.${step}`}>
                      <span className="step-text">
                        <MathText text={text} />
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="result-line">
                  <MathText text={example.conclusion} />
                </p>
              </section>
            );
          }
          case 'lab':
            return lab ? (
              <div key={`${model.id}.lab`} className="lesson-lab-slot">
                {lab}
              </div>
            ) : null;
          case 'practice': {
            const exercise = exerciseRegistry.get(block.id);
            if (!exercise) throw new Error(`Missing exercise ${block.id}`);
            return <Practice key={block.id} lesson={lesson} />;
          }
          case 'boundary':
            return (
              <section id="boundary" className="content-section" key="boundary">
                <h2>Watch the boundary</h2>
                <p>
                  <MathText text={block.text} />
                </p>
              </section>
            );
          case 'bridge':
            return (
              <section
                id="bridge"
                className="content-section bridge"
                key="bridge"
              >
                <span className="callout-label">ALGEBRA LENS</span>
                <p>
                  <MathText text={block.text} />
                </p>
              </section>
            );
          case 'source':
            return (
              <footer className="lesson-footer" key="source">
                <h2>Sources and status</h2>
                <p>
                  <MathText text={block.text} />
                </p>
                <p>
                  Proof and examples are authored for this site. The source
                  locator is not a claim that private course material is
                  published here.
                </p>
              </footer>
            );
        }
        return null;
      })}
      <NextLesson id={lesson.id} onSelect={onSelect} />
    </>
  );
}
