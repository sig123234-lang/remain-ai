import { notFound } from 'next/navigation';
import { findReportById } from '@/lib/guardian-reports';
import ReportDetailView from './ReportDetailView';

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = findReportById(id);
  if (!report) {
    notFound();
  }
  return <ReportDetailView initial={report} />;
}
