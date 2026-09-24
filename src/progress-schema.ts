export type ProgressState = Record<string, 'complete' | 'review'>;

export function parseProgressExport(
  text: string,
  validIds: ReadonlySet<string>,
): ProgressState {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Progress file must be an object.');
  const envelope = value as Record<string, unknown>;
  if (envelope.schemaVersion !== 1)
    throw new Error('Unsupported progress file version.');
  if (
    !envelope.lessons ||
    typeof envelope.lessons !== 'object' ||
    Array.isArray(envelope.lessons)
  )
    throw new Error('Progress file has no lesson map.');
  const entries = Object.entries(envelope.lessons);
  if (
    entries.some(
      ([id, status]) =>
        !validIds.has(id) || (status !== 'complete' && status !== 'review'),
    )
  )
    throw new Error('Progress file contains an unknown lesson or mark.');
  return Object.fromEntries(entries);
}
