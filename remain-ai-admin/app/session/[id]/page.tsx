import ConversationView from './ConversationView';

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConversationView sessionId={id} />;
}
