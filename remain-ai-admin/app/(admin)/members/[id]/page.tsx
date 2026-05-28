import { notFound } from 'next/navigation';
import { fetchMemberById } from '@/lib/members-server';
import { findSessionsByMember } from '@/lib/sessions-archive';
import MemberDetailView from './MemberDetailView';

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await fetchMemberById(id);
  if (!member) notFound();
  // 세션 아카이브는 Phase 2에서 DB로 — 지금은 mock 유지
  const sessions = findSessionsByMember(id);
  return <MemberDetailView member={member} sessions={sessions} />;
}
