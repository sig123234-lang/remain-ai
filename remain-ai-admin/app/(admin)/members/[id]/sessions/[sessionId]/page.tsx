import { notFound } from 'next/navigation';
import { fetchMemberById } from '@/lib/members-server';
import { fetchArchivedSessionById } from '@/lib/sessions-server';
import ArchivedSessionView from './ArchivedSessionView';

export const dynamic = 'force-dynamic';

export default async function ArchivedSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const [member, session] = await Promise.all([
    fetchMemberById(id),
    fetchArchivedSessionById(sessionId),
  ]);
  if (!member || !session || session.memberId !== id) notFound();
  return <ArchivedSessionView member={member} session={session} />;
}
