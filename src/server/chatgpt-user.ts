import { headers } from 'next/headers';
import type { ProgressAccount } from './progress-protocol';

export async function getChatGPTUser(): Promise<ProgressAccount | null> {
  const requestHeaders = await headers();
  const accountId = requestHeaders.get('oai-authenticated-user-id');
  const email = requestHeaders.get('oai-authenticated-user-email');
  if (!accountId || !email) return null;

  const encodedName = requestHeaders.get('oai-authenticated-user-full-name');
  let fullName: string | null = null;
  if (
    encodedName &&
    requestHeaders.get('oai-authenticated-user-full-name-encoding') ===
      'percent-encoded-utf-8'
  ) {
    try {
      fullName = decodeURIComponent(encodedName);
    } catch {
      fullName = null;
    }
  }
  return { accountId, displayName: fullName ?? email };
}
