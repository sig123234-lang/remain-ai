import { notFound } from 'next/navigation';
import { findSessionById } from '@/lib/live-sessions';
import LiveListenView from './LiveListenView';

export default async function SessionListenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = findSessionById(id);
  if (!session) {
    notFound();
  }
  return <LiveListenView session={session} />;
}
