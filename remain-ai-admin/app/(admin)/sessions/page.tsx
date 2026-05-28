import SessionsClient from './SessionsClient';
import { fetchMembers } from '@/lib/members-server';

export default async function SessionsPage() {
  const { members } = await fetchMembers();
  return <SessionsClient members={members} />;
}
