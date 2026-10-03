import ts from '@typescript/typescript6';

function mathOnlyText(node) {
  const element = ts.isJsxElement(node) ? node.openingElement : node;
  if (!ts.isJsxSelfClosingElement(element) && !ts.isJsxOpeningElement(element))
    return false;
  if (element.tagName.getText() !== 'MathText') return false;
  const attribute = element.attributes.properties.find(
    (item) => ts.isJsxAttribute(item) && item.name.getText() === 'text',
  );
  const text = fixedLabelText(attribute?.initializer);
  return (
    text.trim() !== '' &&
    text.replace(/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g, '').trim() === ''
  );
}

function onlyMath(children) {
  const meaningful = children.filter(
    (node) =>
      !(ts.isJsxText(node) && !node.text.trim()) &&
      !(ts.isJsxExpression(node) && !node.expression),
  );
  return (
    meaningful.length > 0 &&
    meaningful.every((node) => {
      if (ts.isJsxFragment(node)) return onlyMath(node.children);
      return mathOnlyText(node);
    })
  );
}

function fixedLabelText(initializer) {
  if (!initializer) return '';
  const value = ts.isJsxExpression(initializer)
    ? initializer.expression
    : initializer;
  if (!value) return '';
  if (ts.isStringLiteralLike(value)) return value.text;
  if (ts.isTemplateExpression(value))
    return [
      value.head.text,
      ...value.templateSpans.map((span) => span.literal.text),
    ].join(' ');
  return '';
}

// Source guard for MathText-only headings; dynamic native AX still needs review.
export function validateMathSurface(source, file = 'source.tsx') {
  const errors = [];
  for (const [pattern, reason] of [
    [/(?<!\\)\\[([]/g, 'single-escaped LaTeX delimiter in TSX'],
    [/[²³√≤≥≡∑∈∣±∞]/g, 'raw math glyph in TSX'],
  ]) {
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split('\n').length;
      errors.push(file + ':' + line + ': ' + reason);
    }
  }
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  for (const diagnostic of tree.parseDiagnostics) {
    const line = tree.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line;
    errors.push(
      file +
        ':' +
        (line + 1) +
        ': invalid TSX: ' +
        ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
    );
  }
  function visit(node) {
    if (
      ts.isJsxElement(node) &&
      /^h[1-6]$/.test(node.openingElement.tagName.getText(tree)) &&
      onlyMath(node.children)
    ) {
      const label = node.openingElement.attributes.properties.find(
        (attribute) =>
          ts.isJsxAttribute(attribute) &&
          attribute.name.getText(tree) === 'aria-label',
      );
      const text = fixedLabelText(label?.initializer);
      if (!text.trim() || text.includes('\\')) {
        const line = tree.getLineAndCharacterOfPosition(
          node.getStart(tree),
        ).line;
        errors.push(
          file +
            ':' +
            (line + 1) +
            ': MathText-only heading requires a plain spoken aria-label with nonempty literal or template text',
        );
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return errors;
}
