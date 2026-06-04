'use server';

import { revalidatePath } from 'next/cache';
import { createSession as _createSession, finalizeSession, type SessionMode } from '@/lib/sessions-server';

export async function createSessionAction(memberId: string, mode: SessionMode = 'voice') {
  return _createSession(memberId, mode);
}

/**
 * 종료 + 추출. 추출에 ~5~10s 소요되므로 admin UI는 pending 상태를 보여야 함.
 */
export async function endSessionAction(sessionId: string) {
  const result = await finalizeSession(sessionId);
  if (result.ok) {
    revalidatePath('/sessions');
    revalidatePath(`/sessions/${sessionId}`);
    revalidatePath('/reports');
    revalidatePath('/archive');
  }
  return result;
}
