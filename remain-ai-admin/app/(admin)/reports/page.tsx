import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, Pill } from '@/components/Card';

export default function ReportsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="리포트"
        description="보호자 리포트와 어르신별 종단 추이를 확인합니다."
      />

      {/* 탭 영역 */}
      <Card className="px-4 py-3">
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[13px] font-semibold">
            보호자 리포트
          </button>
          <button className="px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[13px] font-medium text-slate-600">
            종단 추이
          </button>
          <button className="px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[13px] font-medium text-slate-600">
            세션 상세
          </button>
        </div>
      </Card>

      {/* 보호자 리포트 리스트 */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="보호자 리포트"
            description="세션 종료 후 자동 생성 — header / overview / impressiveExcerpts / emotionalStateScore"
            action={<Pill>0개</Pill>}
          />
          <CardBody>
            <EmptyState
              title="아직 생성된 리포트가 없어요"
              hint="세션 종료 → 세션기록(v5) → 보호자 리포트(v3) 파이프라인 통과 후 표시됩니다"
            />
          </CardBody>
        </Card>
      </div>

      {/* 리포트 카드 미리보기 */}
      <div className="mt-6">
        <Card className="border-dashed border-slate-200">
          <CardHeader title="리포트 카드 미리보기" action={<Pill tone="info">예시</Pill>} />
          <CardBody>
            <div className="rounded-xl bg-slate-50 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[15px] font-semibold text-slate-900">이화상 어르신 · 3회차</div>
                  <div className="text-[12px] text-slate-400 mt-0.5">2026-05-26 · 23분 · 보호자: 민수님 (아들)</div>
                </div>
                <Pill tone="success">전송 완료</Pill>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center pt-3 border-t border-slate-200/70">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">감정 점수</div>
                  <div className="mt-1 text-[18px] font-bold text-emerald-600 tabular-nums">72</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">발췌</div>
                  <div className="mt-1 text-[18px] font-bold text-slate-800 tabular-nums">2</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">기억 이미지</div>
                  <div className="mt-1 text-[18px] font-bold text-slate-800 tabular-nums">1</div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
