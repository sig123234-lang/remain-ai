import { notFound } from 'next/navigation';
import { fetchMemberById } from '@/lib/members-server';
import { fetchMemberArchivedSessions } from '@/lib/sessions-server';
import MemberDetailView from './MemberDetailView';

export const dynamic = 'force-dynamic';

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [member, sessions] = await Promise.all([
    fetchMemberById(id),
    fetchMemberArchivedSessions(id),
  ]);
  if (!member) notFound();
  return <MemberDetailView member={member} sessions={sessions} />;
}
