import { useState } from 'react';
import { lessons } from './content/lessons';
import { MathText } from './MathText';

const prompts = [
  {
    question:
      'A pattern holds for the first \\(100\\) integers. What proves it for every integer?',
    spokenQuestion:
      'A pattern holds for the first one hundred integers. What proves it for every integer?',
    choices: [
      'A valid universal argument',
      'More examples',
      'A larger diagram',
    ],
    correct: 0,
    next: 'P00',
  },
  {
    question:
      'When may \\(c\\) be cancelled from \\(ac\\equiv bc\\pmod n\\) without changing the modulus?',
    spokenQuestion:
      'When may c be cancelled from a times c congruent to b times c modulo n without changing the modulus?',
    choices: [
      'Whenever \\(c\\ne0\\)',
      'Whenever \\(n>1\\)',
      'When \\(\\gcd(c,n)=1\\)',
    ],
    correct: 2,
    spokenChoices: [
      'Whenever c is not zero',
      'Whenever n is greater than one',
      'When the gcd of c and n equals one',
    ],
    next: 'C02',
  },
  {
    question:
      'For Gaussian integers \\(\\alpha,\\beta\\), which norm identity is valid?',
    spokenQuestion:
      'For Gaussian integers alpha and beta, which norm identity is valid?',
    choices: [
      '\\(N(\\alpha\\beta)=N(\\alpha)+N(\\beta)\\)',
      '\\(N(\\alpha\\beta)=N(\\alpha)N(\\beta)\\)',
      '\\(N(\\alpha\\beta)=0\\)',
    ],
    correct: 1,
    spokenChoices: [
      'The norm of alpha times beta equals the norm of alpha plus the norm of beta',
      'The norm of alpha times beta equals the norm of alpha times the norm of beta',
      'The norm of alpha times beta equals zero',
    ],
    next: 'N04',
  },
] as const;

export function Diagnostic({ open }: { open: (id: string) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [result, setResult] = useState<string | null>(null);
  function check() {
    if (answers.some((answer) => answer === null)) return;
    const missed = prompts.findIndex(
      (prompt, index) => answers[index] !== prompt.correct,
    );
    setResult(missed < 0 ? 'N05' : prompts[missed].next);
  }
  return (
    <section className="diagnostic" aria-labelledby="diagnostic-title">
      <p className="eyebrow">A QUICK STARTING POINT</p>
      <h2 id="diagnostic-title">Find your next proof</h2>
      <p>Three checks suggest a place to begin. Answers stay on this page.</p>
      {prompts.map((prompt, index) => (
        <fieldset key={prompt.next} aria-label={prompt.spokenQuestion}>
          <legend>
            <MathText text={prompt.question} />
          </legend>
          {prompt.choices.map((choice, choiceIndex) => (
            <label key={choice}>
              <input
                type="radio"
                aria-label={
                  'spokenChoices' in prompt
                    ? prompt.spokenChoices[choiceIndex]
                    : choice
                }
                name={`diagnostic-${index}`}
                checked={answers[index] === choiceIndex}
                onChange={() => {
                  setAnswers((current) =>
                    current.map((value, i) =>
                      i === index ? choiceIndex : value,
                    ),
                  );
                  setResult(null);
                }}
              />
              <MathText text={choice} />
            </label>
          ))}
        </fieldset>
      ))}
      <button
        type="button"
        disabled={answers.some((answer) => answer === null)}
        onClick={check}
      >
        Suggest a lesson
      </button>
      {result && (
        <div className="diagnostic-result" role="status">
          <p>
            Suggested next lesson:{' '}
            <strong>
              {result} · {lessons.find((lesson) => lesson.id === result)?.title}
            </strong>
          </p>
          <button type="button" onClick={() => open(result)}>
            Open this lesson →
          </button>
        </div>
      )}
    </section>
  );
}
