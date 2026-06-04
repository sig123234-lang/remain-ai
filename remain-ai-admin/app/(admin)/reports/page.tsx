import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, Pill } from '@/components/Card';
import { fetchAllExtractedSessions } from '@/lib/sessions-server';

export const dynamic = 'force-dynamic';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return d >= weekAgo;
}

export default async function ReportsPage() {
  const all = await fetchAllExtractedSessions();
  const drafts = all.filter((r) => r.extraction.reportStatus !== 'sent');
  const sent = all.filter((r) => r.extraction.reportStatus === 'sent');
  const thisWeek = all.filter((r) => isThisWeek(r.startedAt));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="리포트"
        description="세션이 끝나면 보호자용 리포트가 자동으로 만들어져요. 검토 후 발송하세요."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold dark:text-slate-500">검토 대기</div>
          <div className="mt-2 text-[24px] font-bold text-amber-600 tabular-nums">{drafts.length}</div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold dark:text-slate-500">발송됨</div>
          <div className="mt-2 text-[24px] font-bold text-emerald-600 tabular-nums">{sent.length}</div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold dark:text-slate-500">이번 주 생성</div>
          <div className="mt-2 text-[24px] font-bold text-slate-900 tabular-nums dark:text-slate-100">{thisWeek.length}</div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold dark:text-slate-500">총 누적</div>
          <div className="mt-2 text-[24px] font-bold text-slate-900 tabular-nums dark:text-slate-100">{all.length}</div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader
          title="검토 대기"
          description="발송 전에 회원님 발화 인용, 민감 정보 누락 여부를 한 번 더 확인하세요"
          action={<Pill tone="warning">{drafts.length}</Pill>}
        />
        <CardBody>
          {drafts.length === 0 ? (
            <EmptyState title="검토 대기 중인 리포트가 없어요" hint="세션이 종료되면 자동으로 만들어집니다" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {drafts.map((r) => (
                <li key={r.sessionId} className="py-3">
                  <Link
                    href={`/reports/${r.sessionId}`}
                    className="block rounded-lg hover:bg-slate-50 active:bg-slate-100 -mx-2 px-2 py-2 transition dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid place-items-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 text-[12px] font-bold shrink-0 dark:text-slate-400 dark:bg-slate-800">
                        {r.memberName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{r.memberName}님</span>
                          <Pill>{r.sessionNumber}회차</Pill>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatDateTime(r.startedAt)} · {r.durationMinutes}분 · {r.turnCount}턴</span>
                        </div>
                        <div className="mt-1 text-[12px] text-slate-500 line-clamp-2 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{r.extraction.guardianReport.mainTopic}</span> · {r.extraction.guardianReport.summary}
                        </div>
                      </div>
                      <Pill tone={r.extraction.reportStatus === 'draft' ? 'warning' : 'info'}>
                        {r.extraction.reportStatus === 'draft' ? '검토 필요' : '검토됨'}
                      </Pill>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="발송됨"
          description="보호자에게 전달된 리포트"
          action={<Pill tone="success">{sent.length}</Pill>}
        />
        <CardBody>
          {sent.length === 0 ? (
            <EmptyState title="아직 발송된 리포트가 없어요" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {sent.map((r) => (
                <li key={r.sessionId} className="py-3">
                  <Link
                    href={`/reports/${r.sessionId}`}
                    className="block rounded-lg hover:bg-slate-50 -mx-2 px-2 py-2 transition dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-semibold text-slate-900 dark:text-slate-100">{r.memberName}님</span>
                      <Pill>{r.sessionNumber}회차</Pill>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">{formatDateTime(r.startedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
