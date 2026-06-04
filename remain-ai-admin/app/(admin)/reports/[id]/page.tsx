import { notFound } from 'next/navigation';
import { fetchGuardianReportBySessionId } from '@/lib/sessions-server';
import ReportDetailView from './ReportDetailView';

export const dynamic = 'force-dynamic';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await fetchGuardianReportBySessionId(id);
  if (!report) {
    notFound();
  }
  return <ReportDetailView initial={report} />;
}
