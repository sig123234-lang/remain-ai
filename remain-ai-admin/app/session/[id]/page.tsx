import { notFound } from 'next/navigation';
import { fetchSessionContext } from '@/lib/sessions-server';
import ConversationView from './ConversationView';
import RealtimeConversationView from './RealtimeConversationView';

export const dynamic = 'force-dynamic';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await fetchSessionContext(id);
  if (!ctx) notFound();

  if (ctx.mode === 'realtime') {
    return <RealtimeConversationView sessionId={id} memberName={ctx.member.name} />;
  }
  return <ConversationView sessionId={id} memberName={ctx.member.name} mode={ctx.mode} />;
}
