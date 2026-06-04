'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardBody, CardHeader, Pill } from '@/components/Card';
import MemoryImage from '@/components/MemoryImage';
import {
  channelLabel,
  dateKo,
  statusLabel,
  type DeliveryChannel,
  type DeliveryRecord,
  type GuardianReport,
} from '@/lib/guardian-reports';

function maskPhone(p?: string): string {
  if (!p) return '';
  // 010-1234-5678 → 010-1**4-5***
  return p.replace(/(\d{3})-(\d)(\d{2})(\d)-(\d{3})(\d)/, '$1-$2**$4-$5*');
}
function maskEmail(e?: string): string {
  if (!e) return '';
  const [u, d] = e.split('@');
  if (!u || !d) return e;
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(1, u.length - 2))}@${d}`;
}

function StatusBadge({ s }: { s: GuardianReport['status'] }) {
  if (s === 'sent')     return <Pill tone="success">{statusLabel(s)}</Pill>;
  if (s === 'reviewed') return <Pill tone="info">{statusLabel(s)}</Pill>;
  return <Pill tone="warning">{statusLabel(s)}</Pill>;
}

function PhaseChip({ phase }: { phase: 'early' | 'mid' | 'late' }) {
  const label = phase === 'early' ? '대화 초반' : phase === 'mid' ? '대화 중반' : '대화 후반';
  const tone = phase === 'early' ? 'bg-emerald-50 text-emerald-700' : phase === 'mid' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${tone}`}>{label}</span>;
}

function ScoreRing({ score }: { score: number }) {
  // 점수 0~100 → ring 둘레 백분율
  const pct = Math.max(0, Math.min(100, score));
  const tone =
    pct >= 70 ? '#059669' :
    pct >= 55 ? '#0284c7' :
    pct >= 40 ? '#d97706' : '#64748b';
  const circumference = 2 * Math.PI * 44;
  const offset = circumference * (1 - pct / 100);
  return (
    <div className="relative w-[120px] h-[120px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r="44" stroke="#e2e8f0" strokeWidth="8" fill="none" />
        <circle
          cx="50"
          cy="50"
          r="44"
          stroke={tone}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[28px] font-bold tabular-nums" style={{ color: tone }}>{pct}</div>
          <div className="text-[10px] text-slate-400 font-semibold tracking-wider dark:text-slate-500">/ 100</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  발송 가능 채널 계산 — 보호자 연락처 정보 기반
// ─────────────────────────────────────────────
function availableChannels(report: GuardianReport): Array<{
  id: DeliveryChannel;
  enabled: boolean;
  target?: string;
  reason?: string;          // 비활성 사유
  recommended?: boolean;
}> {
  const hasPhone = !!report.guardianPhone;
  const hasEmail = !!report.guardianEmail;
  const kakao = report.kakaoChannelLinked;

  return [
    {
      id: 'kakao_alimtalk',
      enabled: hasPhone,
      target: hasPhone ? report.guardianPhone : undefined,
      reason: hasPhone ? undefined : '보호자 휴대폰번호 미등록',
      recommended: hasPhone && !kakao,  // 친구 추가 X 시 기본 채널
    },
    {
      id: 'kakao_friendtalk',
      enabled: hasPhone && !!kakao,
      target: hasPhone ? report.guardianPhone : undefined,
      reason: !hasPhone ? '보호자 휴대폰번호 미등록' : !kakao ? 'remAIn 카카오 채널 친구 아님' : undefined,
      recommended: hasPhone && !!kakao,  // 친구 추가 O 시 이미지 포함 가능 → 가장 풍부
    },
    {
      id: 'sms',
      enabled: hasPhone,
      target: hasPhone ? report.guardianPhone : undefined,
      reason: hasPhone ? undefined : '보호자 휴대폰번호 미등록',
    },
    {
      id: 'email',
      enabled: hasEmail,
      target: hasEmail ? report.guardianEmail : undefined,
      reason: hasEmail ? undefined : '보호자 이메일 미등록',
    },
    {
      id: 'link_copy',
      enabled: true,
      target: undefined,
    },
  ];
}

export default function ReportDetailView({ initial }: { initial: GuardianReport }) {
  const [report, setReport] = useState<GuardianReport>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const channels = availableChannels(report);
  // 기본 선택: recommended → 첫 enabled
  const defaultChannel = channels.find(c => c.recommended)?.id ?? channels.find(c => c.enabled)?.id ?? 'link_copy';
  const [selectedChannel, setSelectedChannel] = useState<DeliveryChannel>(defaultChannel);
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleSend() {
    const now = new Date().toISOString();
    const ch = channels.find(c => c.id === selectedChannel);

    // 링크 복사면 클립보드만 처리
    if (selectedChannel === 'link_copy') {
      const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${report.id}`;
      try {
        await navigator.clipboard.writeText(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      } catch {}
    }

    const newDelivery: DeliveryRecord = {
      channel: selectedChannel,
      sentAt: now,
      target: ch?.target,
      status: 'success',
    };
    setReport({
      ...report,
      status: 'sent',
      sentAt: report.sentAt ?? now,
      deliveries: [...(report.deliveries ?? []), newDelivery],
    });
    setConfirmOpen(false);
  }

  function handlePrint() {
    if (typeof window !== 'undefined') window.print();
  }

  return (
    <div className="animate-fade-in pb-24">
      {/* 인쇄 전용 브랜드 헤더 — 가운데 정렬, 적당 크기 */}
      <div className="hidden print:block text-center mb-8 pb-4 border-b border-slate-200">
        <div className="inline-flex items-baseline text-[28px] tracking-tight leading-none">
          <span className="font-medium text-slate-700">rem</span>
          <span className="font-bold text-slate-900">AI</span>
          <span className="font-medium text-slate-700">n</span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-slate-400">guardian report</div>
      </div>

      {/* 상단 — 돌아가기 + 회원 정보 */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/reports"
            aria-label="리포트 목록으로"
            className="grid place-items-center w-9 h-9 rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50 active:scale-95 transition shrink-0 dark:ring-slate-700 dark:hover:bg-slate-800/50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-700 dark:text-slate-300" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="text-[20px] sm:text-[22px] font-bold text-slate-900 tracking-tight truncate dark:text-slate-100">
              {report.elderlyName} 회원님 · {report.sessionNumber}회차
            </div>
            <div className="text-[12px] text-slate-400 truncate dark:text-slate-500">
              {dateKo(report.sessionDate)} · {report.durationMinutes}분 · {report.facility} · 보호자 {report.guardianName}님({report.guardianRelation})
            </div>
          </div>
        </div>
        <StatusBadge s={report.status} />
      </div>

      {/* 대화 요약 */}
      <Card className="mb-4">
        <CardHeader title="오늘의 이야기" description={report.conversationOverview.duration} />
        <CardBody>
          <p className="text-[14px] text-slate-700 leading-[1.75] word-keep-all whitespace-pre-line dark:text-slate-300">
            {report.conversationOverview.summary}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">함께 나눈 주제</div>
            <div className="flex flex-wrap gap-1.5">
              {report.conversationOverview.mainTopics.map((t) => (
                <span key={t} className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium bg-slate-100 text-slate-700 dark:text-slate-300 dark:bg-slate-800">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 감정 점수 */}
      <Card className="mb-4">
        <CardHeader title="오늘 회원님의 모습" />
        <CardBody>
          <div className="flex items-center gap-5 flex-wrap sm:flex-nowrap">
            <ScoreRing score={report.emotionalStateScore.score} />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-slate-900 mb-1 dark:text-slate-100">
                {report.emotionalStateScore.label}
              </div>
              <p className="text-[13px] text-slate-600 leading-relaxed word-keep-all dark:text-slate-400">
                {report.emotionalStateScore.basis}
              </p>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed dark:text-slate-500">
                {report.emotionalStateScore.note}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 인상 깊은 발췌 */}
      <Card className="mb-4">
        <CardHeader
          title="인상 깊은 말씀"
          description="회원님께서 직접 들려주신 표현 그대로"
          action={<Pill>{report.impressiveExcerpts.length}</Pill>}
        />
        <CardBody>
          <ul className="space-y-4">
            {report.impressiveExcerpts.map((ex, i) => (
              <li key={i} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] text-slate-500 font-medium leading-relaxed word-keep-all dark:text-slate-400">
                    {ex.context}
                  </span>
                  <PhaseChip phase={ex.sessionPhase} />
                </div>
                <blockquote className="text-[15px] sm:text-[16px] text-slate-900 font-medium leading-[1.7] word-keep-all dark:text-slate-100">
                  <span className="text-slate-300 mr-1">“</span>
                  {ex.elderlyQuote}
                  <span className="text-slate-300 ml-1">”</span>
                </blockquote>
                <p className="text-[12px] text-slate-500 mt-2 leading-relaxed word-keep-all dark:text-slate-400">
                  {ex.significance}
                </p>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      {/* 기억 이미지 */}
      {report.memoryImagePrompt && (
        <Card className="mb-4">
          <CardHeader
            title="오늘의 기억 이미지"
            description="회원님께서 들려주신 풍경을 바탕으로 AI가 만든 그림이에요"
          />
          <CardBody>
            <MemoryImage prompt={report.memoryImagePrompt} caption={false} />
            <div className="mt-4 space-y-2">
              <p className="text-[14px] text-slate-700 leading-relaxed word-keep-all dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">장면. </span>
                {report.memoryImagePrompt.description}
              </p>
              <p className="text-[12px] text-slate-500 leading-relaxed word-keep-all dark:text-slate-400">
                <span className="font-semibold">원천 기억. </span>
                {report.memoryImagePrompt.sourceMemory}
              </p>
            </div>
            {/* 운영자용 - 생성 프롬프트 (보호자에게는 안 보임) */}
            <details className="mt-4 group">
              <summary className="cursor-pointer list-none text-[11px] text-slate-400 font-semibold tracking-wide hover:text-slate-700 transition dark:text-slate-500">
                ▸ 이미지 생성 프롬프트 보기 <span className="text-slate-300 font-normal">(운영자용, 보호자 노출 안 됨)</span>
              </summary>
              <pre className="mt-2 p-3 rounded-lg bg-slate-50 text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed dark:text-slate-400 dark:bg-slate-800/50">
                {report.memoryImagePrompt.imageGenerationPrompt}
              </pre>
            </details>
          </CardBody>
        </Card>
      )}

      {/* 다음 세션 */}
      <Card className="mb-4">
        <CardHeader title="다음 시간 예고" />
        <CardBody>
          <p className="text-[14px] text-slate-700 leading-relaxed word-keep-all dark:text-slate-300">
            {report.nextSessionPreview.text}
          </p>
          {report.nextSessionPreview.scheduledDate && (
            <p className="text-[12px] text-slate-400 mt-2 dark:text-slate-500">
              예정: {report.nextSessionPreview.scheduledDate}
            </p>
          )}
        </CardBody>
      </Card>

      {/* 마무리 */}
      <Card className="mb-4">
        <CardBody>
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 dark:text-slate-500">마무리</div>
          <p className="text-[14px] text-slate-700 leading-relaxed word-keep-all whitespace-pre-line dark:text-slate-300">
            {report.closingNote}
          </p>
        </CardBody>
      </Card>

      {/* 발송 이력 (있을 때) */}
      {report.deliveries && report.deliveries.length > 0 && (
        <Card className="mb-4 no-print">
          <CardHeader title="발송 이력" description="이 리포트가 전달된 채널" />
          <CardBody>
            <ul className="divide-y divide-slate-100 -my-1 dark:divide-slate-800">
              {report.deliveries.map((d, i) => (
                <li key={i} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Pill tone="success">{channelLabel(d.channel)}</Pill>
                    {d.target && <span className="text-[12px] text-slate-500 tabular-nums dark:text-slate-400">{d.channel === 'email' ? maskEmail(d.target) : maskPhone(d.target)}</span>}
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums dark:text-slate-500">{new Date(d.sentAt).toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {/* 발송 상태/하단 액션 바 */}
      <div className="sticky bottom-0 -mx-5 lg:-mx-10 mt-6 px-5 lg:px-10 py-3 bg-white/95 backdrop-blur-md border-t border-slate-100 no-print dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/reports"
            className="px-4 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 active:scale-[0.99] transition dark:text-slate-300 dark:bg-slate-800/50 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            ← 목록으로
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {/* PDF 추출 — 항상 사용 가능 */}
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 active:scale-[0.99] transition flex items-center gap-1.5 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                <path d="M6 9V2h12v7" />
                <rect x="6" y="14" width="12" height="8" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              </svg>
              PDF 추출
            </button>
            {report.status === 'sent' ? (
              <button
                onClick={() => setConfirmOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition"
              >
                다른 채널로 추가 발송
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled
                  title="수정 요청 워크플로우는 추후 활성화됩니다"
                  className="px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-400 text-[13px] font-semibold transition cursor-not-allowed dark:text-slate-600 dark:ring-slate-800 dark:bg-slate-900/50"
                >
                  수정 요청
                </button>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition"
                >
                  보호자에게 발송
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 발송 모달 — 채널 선택 */}
      {confirmOpen && (
        <>
          <button
            aria-label="닫기"
            onClick={() => setConfirmOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in no-print"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[92vw] max-w-[480px] max-h-[88vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up no-print"
          >
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
              <div className="text-[16px] font-bold text-slate-900 dark:text-slate-100">보호자에게 어떻게 보낼까요?</div>
              <p className="text-[12px] text-slate-500 mt-1 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{report.guardianName}님 ({report.guardianRelation})</span>에게 이 리포트가 전달됩니다.
              </p>
            </div>

            {/* 채널 선택 */}
            <div className="px-5 py-4 overflow-y-auto">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2 dark:text-slate-500">발송 채널</div>
              <ul className="space-y-1.5">
                {channels.map((c) => {
                  const selected = selectedChannel === c.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={!c.enabled}
                        onClick={() => setSelectedChannel(c.id)}
                        aria-pressed={selected}
                        className={`
                          w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl ring-1 ring-inset transition
                          ${!c.enabled ? 'opacity-40 cursor-not-allowed ring-slate-100' : ''}
                          ${selected && c.enabled ? 'ring-slate-900 bg-slate-50' : c.enabled ? 'ring-slate-100 hover:bg-slate-50' : ''}
                        `}
                      >
                        <span
                          className={`mt-0.5 grid place-items-center w-4 h-4 rounded-full ring-1 ${selected ? 'bg-slate-900 ring-slate-900' : 'bg-white ring-slate-300'}`}
                          aria-hidden
                        >
                          {selected && <span className="block w-1.5 h-1.5 rounded-full bg-white" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[13px] font-semibold ${selected ? 'text-slate-900' : 'text-slate-800'}`}>
                              {channelLabel(c.id)}
                            </span>
                            {c.recommended && c.enabled && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">추천</span>
                            )}
                            {c.id === 'kakao_friendtalk' && c.enabled && (
                              <span className="text-[10px] text-violet-600 font-semibold">이미지 포함</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate dark:text-slate-500">
                            {c.id === 'link_copy' ? '클릭하면 보호자용 링크가 복사됩니다 — 카톡·문자 등 자유롭게 전달' :
                             c.enabled && c.target ? (c.id === 'email' ? maskEmail(c.target) : maskPhone(c.target)) :
                             c.reason}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {linkCopied && selectedChannel === 'link_copy' && (
                <div className="mt-3 rounded-lg bg-emerald-50 ring-1 ring-emerald-200 px-3 py-2 text-[12px] text-emerald-700 flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  링크가 클립보드에 복사됐어요
                </div>
              )}

              <p className="mt-4 text-[11px] text-slate-400 leading-relaxed dark:text-slate-500">
                연락처가 미등록된 채널은 회원 관리에서 보호자 정보 수정 후 가능합니다.
                {selectedChannel === 'link_copy' ? '' : ' 백엔드 연결 전엔 발송 이력만 기록되며 실제 메시지는 전송되지 않습니다.'}
              </p>
            </div>

            {/* 액션 */}
            <div className="border-t border-slate-100 px-5 py-3 grid grid-cols-2 gap-2 dark:border-slate-800">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 transition dark:text-slate-300 dark:bg-slate-800/50 dark:ring-slate-700 dark:hover:bg-slate-800"
              >
                취소
              </button>
              <button
                onClick={handleSend}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition"
              >
                {selectedChannel === 'link_copy' ? '링크 복사' : '지금 발송'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
