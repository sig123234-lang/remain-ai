import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader, Pill } from '@/components/Card';

const CONSENT_LEVELS = [
  { id: 'L1', name: 'L1 — 세션 진행', desc: '대화 진행을 위한 기본 동의' },
  { id: 'L2', name: 'L2 — 음성 처리', desc: 'STT 변환 및 처리 동의' },
  { id: 'L3', name: 'L3 — 기록 보관', desc: '대화 로그·메타데이터 저장' },
  { id: 'L4', name: 'L4 — AI 학습', desc: '익명화된 데이터 모델 개선 사용' },
  { id: 'L5', name: 'L5 — 보호자 공유', desc: '리포트 형태로 가족에게 전달' },
  { id: 'L6', name: 'L6 — 외부 연구', desc: '제3자 연구 기관 제공 (선택)' },
];

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  return (
    <span
      role="switch"
      aria-checked={defaultOn}
      className={`
        inline-flex items-center w-10 h-6 rounded-full transition-colors
        ${defaultOn ? 'bg-slate-900' : 'bg-slate-200'}
      `}
    >
      <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${defaultOn ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
    </span>
  );
}

export default function SettingsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        title="설정"
        description="시설 정보, 동의 관리, 알림, 외부 연동을 구성합니다."
      />

      {/* 시설 정보 */}
      <Card>
        <CardHeader title="시설 정보" description="진행자·관리자 식별 + 보고서 헤더에 사용" />
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">시설명</label>
              <input
                type="text"
                placeholder="예: 한울요양원"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">진행자 이름</label>
              <input
                type="text"
                placeholder="예: 김선생"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">대표 연락처</label>
              <input
                type="tel"
                placeholder="010-0000-0000"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 mb-1.5">위기 알림 수신처</label>
              <input
                type="email"
                placeholder="alerts@..."
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[14px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 동의 관리 */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="동의 관리 (consentStatus)"
            description="어르신/보호자 동의 레벨 L1~L6 — 데이터 사용 권한 단계"
            action={<Pill tone="info">기본값</Pill>}
          />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {CONSENT_LEVELS.map((l) => (
                <li key={l.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-slate-800">{l.name}</div>
                    <div className="text-[12px] text-slate-400 mt-0.5">{l.desc}</div>
                  </div>
                  <Toggle defaultOn={l.id !== 'L4' && l.id !== 'L6'} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[12px] text-slate-400">
              실제 동의는 어르신·보호자별로 회원 관리에서 개별 설정합니다. 여기는 신규 등록 시 기본값입니다.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* 알림 / 자동화 */}
      <div className="mt-6">
        <Card>
          <CardHeader title="알림 / 자동화" />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {[
                { label: '위기 알림 즉시 이메일', desc: 'Level B/C 감지 시', on: true },
                { label: '보호자 리포트 자동 발송', desc: '꺼두면 관리자 검토 후 수동 발송 (권장)', on: false },
                { label: '주간 운영 요약', desc: '매주 월요일 09:00 발송', on: false },
                { label: '규칙 위반 일일 다이제스트', desc: '하루 1회 관리자 메일', on: true },
              ].map((item) => (
                <li key={item.label} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-slate-800">{item.label}</div>
                    <div className="text-[12px] text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                  <Toggle defaultOn={item.on} />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* 외부 연동 */}
      <div className="mt-6">
        <Card>
          <CardHeader title="외부 연동 (API 키)" description="LLM·STT·TTS·DB 키는 .env로 관리, 여기서는 연결 상태만 표시" />
          <CardBody>
            <ul className="divide-y divide-slate-100">
              {[
                { name: 'Anthropic Claude', detail: 'claude-sonnet-4 (인터뷰/기록/리포트)' },
                { name: 'OpenAI Whisper', detail: 'STT — 음성 → 텍스트' },
                { name: 'OpenAI TTS', detail: 'tts-1, voice=nova' },
                { name: 'Supabase', detail: 'PostgreSQL + 인증' },
              ].map((s) => (
                <li key={s.name} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-slate-800">{s.name}</div>
                    <div className="text-[12px] text-slate-400 mt-0.5">{s.detail}</div>
                  </div>
                  <Pill tone="warning">미연결</Pill>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* 저장 */}
      <div className="mt-6 flex justify-end">
        <button className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-[14px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition">
          변경사항 저장
        </button>
      </div>
    </div>
  );
}
