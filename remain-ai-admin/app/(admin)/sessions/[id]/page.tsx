import { notFound } from 'next/navigation';
import { fetchLiveSessionById } from '@/lib/sessions-server';
import LiveListenView from './LiveListenView';

export const dynamic = 'force-dynamic';

export default async function SessionListenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await fetchLiveSessionById(id);
  if (!result) {
    notFound();
  }
  return <LiveListenView session={result.session} mode={result.mode} />;
}
