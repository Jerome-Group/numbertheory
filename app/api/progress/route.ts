import { getDb } from '../../../db/index';
import { getChatGPTUser } from '../../../src/server/chatgpt-user';
import { handleProgress } from '../../../src/server/progress';

export const dynamic = 'force-dynamic';

function progress(request: Request) {
  return handleProgress(request, {
    getAccount: getChatGPTUser,
    getDatabase: getDb,
  });
}

export const GET = progress;
export const PATCH = progress;
export const PUT = progress;
export const POST = progress;
export const DELETE = progress;
export const HEAD = progress;
export const OPTIONS = progress;
