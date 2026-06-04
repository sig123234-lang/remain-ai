import SessionsClient from './SessionsClient';
import { fetchMembers } from '@/lib/members-server';
import { fetchActiveLiveSessions } from '@/lib/sessions-server';

export const dynamic = 'force-dynamic';
// 진행 중 세션은 자주 바뀌므로 캐싱하지 않음
export const revalidate = 0;

export default async function SessionsPage() {
  const [{ members }, sessions] = await Promise.all([
    fetchMembers(),
    fetchActiveLiveSessions(),
  ]);
  return <SessionsClient members={members} sessions={sessions} />;
}
