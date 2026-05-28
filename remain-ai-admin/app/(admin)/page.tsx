import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, Pill, StatCard, StatusDot } from '@/components/Card';

export default function HomePage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="대시보드"
        description="오늘의 세션 운영 현황과 주요 지표를 한눈에 확인하세요."
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="진행 중 세션" value={0} hint="실시간 모니터링" />
        <StatCard label="오늘 완료" value={0} hint="세션 종료 후 후처리 포함" />
        <StatCard label="활성 회원" value={0} hint="최근 30일 1회 이상" />
        <StatCard label="위기 알림" value={0} hint="긴급·주의 신호 — 검토 필요" tone="critical" />
      </div>

      {/* 최근 활동 + AI 품질 요약 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="최근 활동" description="오늘 종료된 세션과 알림" />
            <CardBody>
              <EmptyState
                title="오늘 진행된 세션이 없어요"
                hint="세션이 시작되면 여기에 실시간으로 표시됩니다"
              />
            </CardBody>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="AI 품질" description="이번 주 절대 규칙 위반" />
            <CardBody className="space-y-3">
              {[
                { rule: '#1 동일 인물 7턴', count: 0 },
                { rule: '#2 거부 연속 미전환', count: 0 },
                { rule: '#3 체감 반복', count: 0 },
                { rule: '#4 동일 시기 8턴', count: 0 },
                { rule: '#6 사망 부모 현재형', count: 0 },
                { rule: '#7 종료 후 질문', count: 0 },
              ].map((r) => (
                <div key={r.rule} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2 text-slate-600">
                    <StatusDot tone={r.count > 0 ? 'critical' : 'success'} />
                    <span>{r.rule}</span>
                  </div>
                  <span className="text-slate-900 font-semibold tabular-nums">{r.count}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* 빠른 진입 */}
      <div className="mt-6">
        <Card>
          <CardHeader title="빠른 진입" />
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: '실시간 세션', href: '/sessions' },
                { label: '회원 관리', href: '/members' },
                { label: '기억 아카이브', href: '/archive' },
                { label: '리포트', href: '/reports' },
                { label: 'AI 품질 감사', href: '/quality' },
                { label: '설정', href: '/settings' },
              ].map((q) => (
                <a
                  key={q.href}
                  href={q.href}
                  className="
                    px-4 py-3 rounded-xl
                    bg-slate-50 hover:bg-slate-100
                    text-[13px] font-medium text-slate-700
                    transition-colors
                    flex items-center justify-between gap-2
                  "
                >
                  {q.label}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300" aria-hidden>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </a>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[12px] text-slate-400">
        <Pill tone="info">개발</Pill>
        <span>실제 데이터는 백엔드 연동 후 표시됩니다.</span>
      </div>
    </div>
  );
}
