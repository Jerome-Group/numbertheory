import {
  type ProgressAccount,
  ProgressRequestError,
  parseProgressRequest,
} from './progress-protocol';
import { changeProgress, readProgress } from './progress-store';

export async function handleProgress(
  request: Request,
  {
    getAccount,
    getDatabase,
  }: {
    getAccount: () => Promise<ProgressAccount | null>;
    getDatabase: () => D1Database;
  },
): Promise<Response> {
  try {
    const account = await getAccount();
    if (!account)
      throw new ProgressRequestError(
        401,
        'sign_in_required',
        'Sign in to save account progress.',
      );
    const command = await parseProgressRequest(request);
    const database = getDatabase();
    const document =
      command.kind === 'read'
        ? await readProgress(database, account.accountId)
        : await changeProgress({
            database,
            accountId: account.accountId,
            command,
          });
    if (!document) {
      if (command.kind === 'replace')
        throw new ProgressRequestError(
          409,
          'conflict',
          'Progress changed. Reload progress before trying again.',
        );
      throw new Error('Progress revision cannot advance.');
    }
    return json({ ...account, ...document });
  } catch (error) {
    if (error instanceof ProgressRequestError)
      return json({ code: error.code, message: error.message }, error.status);
    return json(
      { code: 'unavailable', message: 'Account progress is unavailable.' },
      503,
    );
  }
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { 'cache-control': 'private, no-store', vary: 'Cookie' },
  });
}
