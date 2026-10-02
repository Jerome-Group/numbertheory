import katex from 'katex';

export function validateLearningContent(
  lessons,
  teaching,
  paths,
  figures,
  inventory,
) {
  const errors = [];
  const ids = lessons.map((lesson) => lesson.id);
  const exactIds = (actual, expected) =>
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
  if (!exactIds(ids, inventory.lessonIds))
    errors.push('Published lesson scope differs from the baseline.');
  if (!exactIds(Object.keys(teaching), ids))
    errors.push('Teaching records must cover exactly the published IDs.');
  function text(value, location) {
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${location}: missing text`);
      return;
    }
    const math = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
    const matches = [...value.matchAll(math)];
    if (
      (value.match(/\\[([]/g) ?? []).length !== matches.length ||
      (value.match(/\\[)\]]/g) ?? []).length !== matches.length
    )
      errors.push(`${location}: unmatched math delimiters`);
    for (const match of matches) {
      try {
        katex.renderToString(match[1] ?? match[2], {
          throwOnError: true,
          trust: false,
        });
      } catch (error) {
        errors.push(`${location}: ${error.message}`);
      }
    }
    if (/[=<>∈∣≤≥±√∑]/.test(value.replace(math, '')))
      errors.push(`${location}: math outside LaTeX`);
  }
  const byId = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  for (const [index, lesson] of lessons.entries()) {
    for (const prerequisite of lesson.prerequisites)
      if (!byId.has(prerequisite) || ids.indexOf(prerequisite) >= index)
        errors.push(
          `${lesson.id}: prerequisite ${prerequisite} must precede it`,
        );
    const record = teaching[lesson.id];
    if (!record) continue;
    text(record.intuition, `${lesson.id}.intuition`);
    text(record.strategy, `${lesson.id}.strategy`);
    if (!Array.isArray(record.hypotheses) || !record.hypotheses.length)
      errors.push(`${lesson.id}: missing conditions`);
    else
      record.hypotheses.forEach((value, index) => {
        text(value, `${lesson.id}.conditions.${index}`);
      });
    if (
      !Array.isArray(record.proofSteps) ||
      record.proofSteps.length !== lesson.proof.length
    )
      errors.push(`${lesson.id}: proof annotations do not match paragraphs`);
    else
      record.proofSteps.forEach((step, index) => {
        text(step.label, `${lesson.id}.label.${index}`);
        text(step.reason, `${lesson.id}.reason.${index}`);
      });
    text(record.check?.prompt, `${lesson.id}.check`);
    const choices = record.check?.choices;
    if (
      !Array.isArray(choices) ||
      choices.length !== 3 ||
      choices.filter((choice) => choice.correct === true).length !== 1 ||
      choices.some((choice) => typeof choice.correct !== 'boolean')
    )
      errors.push(
        `${lesson.id}: diagnostic requires three choices and exactly one correct answer`,
      );
    else
      choices.forEach((choice, index) => {
        text(choice.text, `${lesson.id}.choice.${index}`);
        text(choice.feedback, `${lesson.id}.feedback.${index}`);
      });
  }
  for (const [id, path] of Object.entries(paths)) {
    if (new Set(path.ids).size !== path.ids.length)
      errors.push(`${id}: duplicate path lessons`);
    for (const lessonId of path.ids) {
      const lesson = byId.get(lessonId);
      if (!lesson) {
        errors.push(`${id}: unknown path lesson ${lessonId}`);
        continue;
      }
      for (const prerequisite of lesson.prerequisites)
        if (
          !path.ids.includes(prerequisite) ||
          path.ids.indexOf(prerequisite) >= path.ids.indexOf(lessonId)
        )
          errors.push(
            `${id}: missing or late prerequisite ${prerequisite} of ${lessonId}`,
          );
    }
  }
  for (const [id, figure] of Object.entries(figures)) {
    if (!byId.has(id)) errors.push(`Unknown figure lesson ${id}`);
    text(figure.title, `${id}.figure.title`);
    text(figure.caption, `${id}.figure.caption`);
    figure.headers.forEach((value, index) => {
      text(value, `${id}.figure.header.${index}`);
    });
    for (const [index, row] of figure.rows.entries()) {
      if (row.length !== figure.headers.length)
        errors.push(`${id}: figure row ${index} has wrong column count`);
      row.forEach((value, col) => {
        text(value, `${id}.figure.${index}.${col}`);
      });
    }
  }
  return errors;
}
