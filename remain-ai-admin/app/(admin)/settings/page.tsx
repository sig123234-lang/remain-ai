import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/Card';
import ThemeSelector from '@/components/ThemeSelector';
import IntegrationsCard, { type IntegrationStatus } from './IntegrationsCard';
import PrefsCardsClient from './PrefsCardsClient';
import { loadFacilityPrefs } from './actions';

export default async function SettingsPage() {
  const prefs = await loadFacilityPrefs();

  const integrations: IntegrationStatus[] = [
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      detail: 'claude-opus-4-7 — 대화·기록·리포트',
      connected: Boolean(process.env.ANTHROPIC_API_KEY),
    },
    {
      id: 'openai_stt',
      name: 'OpenAI Whisper',
      detail: 'STT — 어르신 음성 → 텍스트 (Phase 4)',
      connected: Boolean(process.env.OPENAI_API_KEY),
    },
    {
      id: 'openai_tts',
      name: 'OpenAI TTS',
      detail: 'TTS — AI 응답 → 음성 (Phase 4)',
      connected: Boolean(process.env.OPENAI_API_KEY),
    },
    {
      id: 'supabase',
      name: 'Supabase',
      detail: 'PostgreSQL + 인증',
      connected: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="설정"
        description="시설 정보, 동의 관리, 알림, 외부 연동을 구성합니다."
      />

      {/* 외관 */}
      <Card>
        <CardHeader title="외관" description="화면 테마를 라이트·다크·시스템으로 전환합니다" />
        <CardBody>
          <ThemeSelector />
        </CardBody>
      </Card>

      {/* 시설 정보 — 시설 관리 메뉴로 안내 */}
      <div className="mt-6">
        <Card>
          <CardHeader
            title="시설 정보"
            description="진행자·관리자 식별 + 보고서 헤더에 사용"
          />
          <CardBody>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              시설명·연락처·주소는 <Link href="/facilities" className="underline font-semibold text-slate-700 dark:text-slate-200">시설 관리</Link>에서 등록·수정합니다.
            </p>
          </CardBody>
        </Card>
      </div>

      {/* 동의 관리 + 알림 자동화 (실데이터) */}
      <div className="mt-6">
        <PrefsCardsClient
          facilityId={prefs.facilityId}
          facilityName={prefs.facilityName}
          initialConsent={prefs.defaultConsent}
          initialPrefs={prefs.notificationPrefs}
        />
      </div>

      {/* 외부 연동 */}
      <div className="mt-6">
        <IntegrationsCard integrations={integrations} />
      </div>
    </div>
  );
}
