import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, EmptyState, Pill } from '@/components/Card';

export default function ArchivePage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="기억 아카이브"
        description="세션에서 추출된 기억·인물·장소·사건을 회원님별로 모아 봅니다."
      />

      {/* 회원님 선택 + 필터 */}
      <Card className="px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <select className="flex-1 px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[13px] text-slate-700">
            <option>회원님 선택</option>
          </select>
          <div className="flex gap-2 flex-wrap">
            <button className="px-3 py-2 rounded-lg bg-slate-900 text-white text-[12px] font-semibold">기억</button>
            <button className="px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[12px] font-medium text-slate-700">인물</button>
            <button className="px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[12px] font-medium text-slate-700">장소</button>
            <button className="px-3 py-2 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[12px] font-medium text-slate-700">사건</button>
          </div>
        </div>
      </Card>

      {/* keyMemories 카드 — 시기별 그룹 */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="핵심 기억 (keyMemories)" description="시기·인물·장소·감정 무게로 정리" action={<Pill>0개</Pill>} />
          <CardBody>
            <EmptyState title="아직 수집된 기억이 없어요" hint="세션이 종료되면 자동으로 추가됩니다" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="감정적 보물 (emotionalTreasures)" description="명시적·암묵적 보물 키워드 매칭" action={<Pill tone="warning">0개</Pill>} />
          <CardBody>
            <EmptyState title="아직 감지된 보물이 없어요" hint="'보고 싶', '아직도 생각나' 등 매칭 시 자동 기록" />
          </CardBody>
        </Card>
      </div>

      {/* 엔티티 그래프 */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="엔티티 그래프"
            description="누적 등장 인물·장소·사건 — 세션 간 ID 유지"
          />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">인물</div>
                <div className="mt-2 text-[24px] font-bold text-slate-800 tabular-nums">0</div>
                <div className="text-[11px] text-slate-400 mt-1">aliveStatus 자동 추적</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">장소</div>
                <div className="mt-2 text-[24px] font-bold text-slate-800 tabular-nums">0</div>
                <div className="text-[11px] text-slate-400 mt-1">시대·유형별 분류</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">사건</div>
                <div className="mt-2 text-[24px] font-bold text-slate-800 tabular-nums">0</div>
                <div className="text-[11px] text-slate-400 mt-1">시기·반복 패턴</div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
