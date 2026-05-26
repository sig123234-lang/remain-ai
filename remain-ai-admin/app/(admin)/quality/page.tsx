import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, Pill, StatCard, StatusDot } from '@/components/Card';

const ABSOLUTE_RULES = [
  { n: 1, name: '동일 인물 7턴 초과 금지', detail: 'currentPersonTurnCount 모니터링 (보물 시 10턴)' },
  { n: 2, name: '거부 2회 연속 → 완전 전환', detail: 'consecutiveRefusals + AI action=transition 확인' },
  { n: 3, name: '체감 반복 즉시 전환', detail: 'emotionStructureCount ≤ 3 + 어르신 "또?" 반응' },
  { n: 4, name: '동일 인생 시기 8턴 초과 금지', detail: 'lifePeriodTurnCount 모니터링' },
  { n: 5, name: '엔진 action 제한 준수', detail: 'allowedActions 강제 — 엔진 레벨' },
  { n: 6, name: '사망 부모 현재형 질문 금지', detail: 'familyStatus.alive=false 대조 — 신뢰 직격탄' },
  { n: 7, name: '세션 종료 시 새 질문 금지', detail: '종료 신호 후 AI 응답에 ? 포함 여부' },
];

const CORE_METRICS = [
  { key: 'aiEmotionInsertion', label: 'AI 감정 삽입', detail: '"특별한/대단한/소중한" 등 미사용 표현' },
  { key: 'listenMoreUsage', label: 'H패턴 (listen_more)', detail: '미러링 + 30단어+ + 1회/세션' },
  { key: 'aiResponseLengthViolation', label: '응답 3문장 이상', detail: '최대 2문장 규칙' },
  { key: 'multipleQuestionViolation', label: '물음표 2개+', detail: '한 응답 1개 질문 규칙' },
];

export default function QualityPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="AI 품질 감사"
        description="회상치료 실행 프롬프트(v10)의 절대 규칙·핵심 규칙 준수 현황을 추적합니다."
      />

      {/* 종합 지표 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="이번 주 세션" value={0} hint="전체 감사 대상" />
        <StatCard label="complianceGrade A" value={0} hint="위반 0 + 삽입 0" tone="success" />
        <StatCard label="규칙 위반" value={0} hint="#1~#7 절대 규칙" tone="critical" />
        <StatCard label="핵심 규칙 위반" value={0} hint="감정삽입·H패턴·응답길이" tone="warning" />
      </div>

      {/* 7개 절대 규칙 */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="절대 규칙 — 7개"
            description="모든 규칙보다 우선. 예외 없음. 위반 1건이라도 D 후보."
          />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {ABSOLUTE_RULES.map((r) => (
                <li key={r.n} className="py-3 flex items-start gap-3">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-slate-50 ring-1 ring-slate-100 text-[13px] font-bold text-slate-700 tabular-nums shrink-0">
                    {r.n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-slate-800">{r.name}</div>
                    <div className="text-[12px] text-slate-400 mt-0.5">{r.detail}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusDot tone="success" />
                    <span className="text-[12px] font-semibold text-slate-600 tabular-nums">0건</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* 핵심 규칙 */}
      <div className="mt-6">
        <Card>
          <CardHeader title="핵심 규칙 모니터링" description="ruleComplianceAudit의 보조 지표" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CORE_METRICS.map((m) => (
                <div key={m.key} className="rounded-xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[13px] font-semibold text-slate-800">{m.label}</div>
                    <span className="text-[16px] font-bold tabular-nums text-slate-900">0</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{m.detail}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 프롬프트 버전 */}
      <div className="mt-6">
        <Card>
          <CardHeader title="프롬프트 버전" description="현재 사용 중인 시스템 프롬프트" />
          <CardBody>
            <ul className="space-y-2">
              {[
                { name: '실시간 인터뷰', file: '회상치료_실행_프롬프트_v10.md', version: 'v10', date: '2026-05-26' },
                { name: '세션 기록 정리', file: '회상치료_세션기록_실행_프롬프트_v5.md', version: 'v5', date: '2026-05-26' },
                { name: '보호자 리포트', file: '보호자_리포트_생성_프롬프트_v3.md', version: 'v3', date: '2026-05-26' },
              ].map((p) => (
                <li key={p.file} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-slate-800">{p.name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{p.file}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Pill tone="success">{p.version}</Pill>
                    <span className="text-[11px] text-slate-400 tabular-nums">{p.date}</span>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
