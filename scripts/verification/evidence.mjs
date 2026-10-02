import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';

const reject = (message) => {
  throw new Error(message);
};
const nonempty = (value) =>
  typeof value === 'string' && value.trim().length > 0;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const identityKeys = ['sourceHash', 'lockHash', 'buildHash', 'scopeHash'];
function object(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    reject(`${label} must be an object.`);
  const unknown = Object.keys(value).filter((key) => !keys.includes(key));
  if (unknown.length)
    reject(`${label} has unknown fields: ${unknown.join(', ')}.`);
}
function uniqueStrings(values, label, { empty = false } = {}) {
  if (
    !Array.isArray(values) ||
    (!empty && !values.length) ||
    values.some((value) => !nonempty(value))
  )
    reject(`${label} must be a nonempty string array.`);
  if (new Set(values).size !== values.length)
    reject(`${label} contains duplicate IDs.`);
  return values;
}
function exactIds(values, expected, label) {
  uniqueStrings(values, label, { empty: expected.length === 0 });
  if (
    values.length !== expected.length ||
    values.some((id) => !expected.includes(id))
  )
    reject(`${label} has missing or unknown IDs.`);
}
function timestamp(value, label, { now, maximumAgeMs, envelopeTime }) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  )
    reject(`${label} must be an ISO UTC timestamp.`);
  const time = Date.parse(value);
  const canonical = value.includes('.') ? value : value.replace(/Z$/, '.000Z');
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString() !== canonical ||
    now - time < -60000 ||
    now - time > maximumAgeMs
  )
    reject(`${label} is invalid, future, or stale.`);
  if (envelopeTime !== undefined && time > envelopeTime + 60000)
    reject(`${label} postdates evidence envelope.`);
  return time;
}
function references(record, artifacts, referenced, label) {
  if (!nonempty(record.summary))
    reject(`${label} requires an observation summary.`);
  uniqueStrings(record.artifactRefs, `${label} artifactRefs`);
  for (const id of record.artifactRefs) {
    if (!artifacts.has(id))
      reject(`${label} refers to unknown artifact ${id}.`);
    referenced.add(id);
  }
}

// Structural freshness/integrity and declared independence; never proof an observation is true.
export function validateEvidence(
  evidence,
  identity,
  map,
  kind,
  {
    authors: trustedAuthors = [],
    artifactRoot,
    now = Date.now(),
    maximumAgeMs = 7 * 86400000,
  } = {},
) {
  const common = [
    'schemaVersion',
    'kind',
    ...identityKeys,
    'status',
    'observer',
    'observedAt',
    'summary',
    'artifacts',
  ];
  object(
    evidence,
    [
      ...common,
      ...(kind === 'browser'
        ? ['surface', 'coverage']
        : [
            'independent',
            'authors',
            'lessonIds',
            'reviews',
            'unresolvedFindings',
          ]),
    ],
    'Evidence',
  );
  if (
    !['browser', 'semantic'].includes(kind) ||
    evidence.schemaVersion !== 1 ||
    evidence.kind !== kind ||
    evidence.status !== 'passed' ||
    !nonempty(evidence.observer)
  )
    reject('Invalid evidence kind/version/status/observer.');
  for (const key of identityKeys)
    if (!identity[key] || evidence[key] !== identity[key])
      reject(`Stale ${kind} ${key}.`);
  const envelopeTime = timestamp(evidence.observedAt, 'Evidence observedAt', {
    now,
    maximumAgeMs,
  });
  if (evidence.summary !== undefined && !nonempty(evidence.summary))
    reject('Evidence summary is empty.');
  if (!Array.isArray(evidence.artifacts) || !evidence.artifacts.length)
    reject('Evidence requires artifacts.');
  const artifacts = new Map(),
    referenced = new Set();
  const bundleRoot = artifactRoot ? realpathSync(artifactRoot) : undefined;
  for (const artifact of evidence.artifacts) {
    object(artifact, ['id', 'path', 'sha256'], 'Artifact');
    if (
      !nonempty(artifact.id) ||
      artifacts.has(artifact.id) ||
      !nonempty(artifact.path) ||
      !isAbsolute(artifact.path) ||
      typeof artifact.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(artifact.sha256)
    )
      reject('Invalid or duplicate artifact identity/path/digest.');
    const stat = lstatSync(artifact.path);
    if (!stat.isFile() || stat.size === 0 || stat.size > 20 * 1024 * 1024)
      reject('Artifact is empty, nonregular, or oversized.');
    const file = realpathSync(artifact.path);
    if (bundleRoot) {
      const within = relative(bundleRoot, file);
      if (within === '..' || within.startsWith('../') || isAbsolute(within))
        reject('Artifact is outside selected bundle.');
    }
    if (sha256(readFileSync(file)) !== artifact.sha256)
      reject('Missing or stale artifact digest.');
    artifacts.set(artifact.id, artifact);
  }
  if (kind === 'browser') {
    if (
      evidence.surface !== 'codex-in-app-browser' ||
      !Array.isArray(evidence.coverage)
    )
      reject('Invalid browser surface or coverage.');
    exactIds(
      evidence.coverage.map((record) => record?.id),
      map.requiredCoverage,
      'Browser coverage',
    );
    for (const record of evidence.coverage) {
      object(
        record,
        ['id', 'status', 'observedAt', 'summary', 'artifactRefs'],
        'Coverage record',
      );
      if (record.status !== 'passed')
        reject(`Failed/skipped coverage ${record.id}.`);
      timestamp(record.observedAt, `Coverage ${record.id} observedAt`, {
        now,
        maximumAgeMs,
        envelopeTime,
      });
      references(record, artifacts, referenced, `Coverage ${record.id}`);
    }
  } else {
    if (evidence.independent !== true || evidence.unresolvedFindings !== 0)
      reject('Semantic review independence/findings invalid.');
    uniqueStrings(evidence.authors, 'Declared authors');
    uniqueStrings(trustedAuthors, 'Trusted authors', { empty: true });
    const authors = new Set([...trustedAuthors, ...evidence.authors]);
    const expected = map.lessons.map((lesson) => lesson.id);
    exactIds(evidence.lessonIds, expected, 'Semantic lessonIds');
    if (!Array.isArray(evidence.reviews) || !evidence.reviews.length)
      reject('Semantic reviewer partitions required.');
    const reviewed = [];
    for (const review of evidence.reviews) {
      object(
        review,
        [
          'reviewer',
          'authors',
          'independent',
          'status',
          'lessonIds',
          'observedAt',
          'summary',
          'artifactRefs',
        ],
        'Semantic review',
      );
      uniqueStrings(review.authors, 'Partition authors');
      if (
        !nonempty(review.reviewer) ||
        authors.has(review.reviewer) ||
        review.authors.includes(review.reviewer) ||
        review.independent !== true ||
        review.status !== 'passed'
      )
        reject(
          'Reviewer must be named, independent, and distinct from authors.',
        );
      uniqueStrings(review.lessonIds, 'Reviewer lessonIds');
      reviewed.push(...review.lessonIds);
      timestamp(review.observedAt, 'Reviewer observedAt', {
        now,
        maximumAgeMs,
        envelopeTime,
      });
      references(review, artifacts, referenced, `Review by ${review.reviewer}`);
    }
    exactIds(reviewed, expected, 'Reviewer partitions');
  }
  if (referenced.size !== artifacts.size)
    reject('Evidence includes unreferenced artifacts.');
  return true;
}
