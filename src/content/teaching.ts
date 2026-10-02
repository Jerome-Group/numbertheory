import records from './teaching.json' with { type: 'json' };

export type Teaching = {
  intuition: string;
  strategy: string;
  hypotheses: string[];
  proofSteps: { label: string; reason: string }[];
  check: {
    prompt: string;
    choices: {
      text: string;
      label?: string;
      correct: boolean;
      feedback: string;
    }[];
  };
};

export function teachingFor(id: string): Teaching {
  const record = (records as Record<string, Teaching>)[id];
  if (!record) throw new Error(`Missing teaching for ${id}`);
  return record;
}
