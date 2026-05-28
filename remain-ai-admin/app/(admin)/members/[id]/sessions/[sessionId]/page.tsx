import { notFound } from 'next/navigation';
import { fetchMemberById } from '@/lib/members-server';
import { findArchivedSessionById } from '@/lib/sessions-archive';
import ArchivedSessionView from './ArchivedSessionView';

export default async function ArchivedSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const member = await fetchMemberById(id);
  const session = findArchivedSessionById(sessionId);
  if (!member || !session || session.memberId !== id) notFound();
  return <ArchivedSessionView member={member} session={session} />;
}
