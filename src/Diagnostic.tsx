import { useState } from 'react';
import { lessons } from './content/lessons';
import { MathText } from './MathText';

const prompts = [
  {
    question:
      'A pattern holds for the first \\(100\\) integers. What proves it for every integer?',
    choices: [
      'More examples',
      'A valid universal argument',
      'A larger diagram',
    ],
    correct: 1,
    next: 'P00',
  },
  {
    question:
      'When may \\(c\\) be cancelled from \\(ac\\equiv bc\\pmod n\\) without changing the modulus?',
    choices: [
      'Whenever \\(c\\ne0\\)',
      'When \\(\\gcd(c,n)=1\\)',
      'Whenever \\(n>1\\)',
    ],
    correct: 1,
    next: 'C02',
  },
  {
    question:
      'For Gaussian integers \\(\\alpha,\\beta\\), which norm identity is valid?',
    choices: [
      '\\(N(\\alpha\\beta)=N(\\alpha)+N(\\beta)\\)',
      '\\(N(\\alpha\\beta)=N(\\alpha)N(\\beta)\\)',
      '\\(N(\\alpha\\beta)=0\\)',
    ],
    correct: 1,
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
        <fieldset key={prompt.next}>
          <legend>
            <MathText text={prompt.question} />
          </legend>
          {prompt.choices.map((choice, choiceIndex) => (
            <label key={choice}>
              <input
                type="radio"
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
