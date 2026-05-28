import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, Pill } from '@/components/Card';
import type { GuardianReport } from '@/lib/guardian-reports';

export default function ReportsPage() {
  // 백엔드 연결 전 — 리포트는 세션 종료 후 자동 생성됨. 지금은 비어있음.
  const reports: GuardianReport[] = [];
  const drafts = reports.filter((r) => r.status !== 'sent');
  const sent   = reports.filter((r) => r.status === 'sent');

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="리포트"
        description="세션이 끝나면 보호자용 리포트가 자동으로 만들어져요. 검토 후 발송하세요."
      />

      {/* 통계 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">검토 대기</div>
          <div className="mt-2 text-[24px] font-bold text-amber-600 tabular-nums">{drafts.length}</div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">발송됨</div>
          <div className="mt-2 text-[24px] font-bold text-emerald-600 tabular-nums">{sent.length}</div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">이번 주 생성</div>
          <div className="mt-2 text-[24px] font-bold text-slate-900 tabular-nums">{reports.length}</div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 font-semibold">기억 이미지</div>
          <div className="mt-2 text-[24px] font-bold text-slate-900 tabular-nums">0</div>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader
          title="검토 대기"
          description="발송 전에 회원님 발화 인용, 기억 이미지, 민감 정보 누락 여부를 한 번 더 확인하세요"
          action={<Pill tone="warning">{drafts.length}</Pill>}
        />
        <CardBody>
          <EmptyState
            title="아직 생성된 리포트가 없어요"
            hint="세션이 종료되면 자동으로 만들어집니다"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="발송됨"
          description="보호자에게 전달된 리포트"
          action={<Pill tone="success">{sent.length}</Pill>}
        />
        <CardBody>
          <EmptyState title="아직 발송된 리포트가 없어요" />
        </CardBody>
      </Card>
    </div>
  );
}
