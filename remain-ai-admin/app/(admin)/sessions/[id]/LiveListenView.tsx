'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { LiveSession, RecentUtterance } from '@/lib/live-sessions';
import { aliveLabel, alertLevelLabel, cognitiveLabel, depthLabel, phaseLabel, riskLabel, sessionTone } from '@/lib/live-sessions';
import { Card, CardBody, CardHeader, Pill, StatusDot } from '@/components/Card';
import FacilitatorCallDialog from '@/components/FacilitatorCallDialog';
import {
  type FacilitatorCall,
  type FacilitatorCallReason,
  diffSecs,
  newCallId,
  reasonLabel,
  secsToMmss,
  statusLabel,
} from '@/lib/facilitator-calls';

// ─────────────────────────────────────────────
//  소형 헬퍼
// ─────────────────────────────────────────────
function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Waveform({ count = 5, color = 'bg-slate-700' }: { count?: number; color?: string }) {
  return (
    <div className="inline-flex items-center gap-[3px]" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] h-3 rounded-full ${color} animate-wave`}
          style={{ animationDelay: `${i * 0.11}s` }}
        />
      ))}
    </div>
  );
}

function TurnBubble({ turn }: { turn: RecentUtterance }) {
  const isElder = turn.role === 'elderly';
  return (
    <div className={`flex ${isElder ? 'justify-start' : 'justify-end'} animate-fade-in-up`}>
      <div className={`max-w-[78%] ${isElder ? '' : 'text-right'}`}>
        <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${isElder ? 'text-slate-400' : 'text-blue-500'}`}>
          {isElder ? '회원님' : 'AI 도우미'}
          <span className="ml-1.5 font-normal text-slate-300 tabular-nums">{hhmm(turn.at)}</span>
        </div>
        <div
          className={`
            inline-block rounded-2xl px-4 py-2.5 text-[14px] leading-[1.55] word-keep-all
            ${isElder
              ? 'bg-white ring-1 ring-slate-100 text-slate-800 rounded-tl-sm'
              : 'bg-blue-600 text-white rounded-tr-sm'}
          `}
        >
          {turn.text}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  메인
// ─────────────────────────────────────────────
export default function LiveListenView({ session }: { session: LiveSession }) {
  const [muted, setMuted] = useState(false);
  const [memo, setMemo] = useState('');
  const [memos, setMemos] = useState<{ at: string; text: string }[]>([]);
  const [listenStart] = useState(() => Date.now());
  const [listenElapsed, setListenElapsed] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // ── 진행자 호출 상태 ──
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callDialogPreset, setCallDialogPreset] = useState<FacilitatorCallReason | undefined>();
  const [activeCall, setActiveCall] = useState<FacilitatorCall | null>(null);
  const [callHistory, setCallHistory] = useState<FacilitatorCall[]>([]);

  // 청취 시간 카운터 — 매초 리렌더로 활성 호출 경과도 자동 갱신
  useEffect(() => {
    const t = setInterval(() => {
      setListenElapsed(Math.floor((Date.now() - listenStart) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [listenStart]);

  // 초기 마운트 시 트랜스크립트 맨 아래로
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  function handleSaveMemo() {
    const t = memo.trim();
    if (!t) return;
    setMemos((prev) => [{ at: new Date().toISOString(), text: t }, ...prev]);
    setMemo('');
  }

  // ─── 진행자 호출 핸들러 ───
  function openCallDialog(preset?: FacilitatorCallReason) {
    setCallDialogPreset(preset);
    setCallDialogOpen(true);
  }
  function handleCallSubmit(reason: FacilitatorCallReason, note: string) {
    const now = new Date().toISOString();
    setActiveCall({
      id: newCallId(),
      reason,
      note: note || undefined,
      status: 'pending',
      calledAt: now,
    });
    setCallDialogOpen(false);
  }
  function handleAdvance(next: 'responding' | 'arrived') {
    setActiveCall((c) =>
      c
        ? {
            ...c,
            status: next,
            ...(next === 'responding' ? { respondedAt: new Date().toISOString() } : {}),
            ...(next === 'arrived' ? { arrivedAt: new Date().toISOString() } : {}),
          }
        : c,
    );
  }
  function handleResolve() {
    if (!activeCall) return;
    const resolved: FacilitatorCall = {
      ...activeCall,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
    };
    setCallHistory((h) => [resolved, ...h]);
    setActiveCall(null);
  }
  function handleCancel() {
    if (!activeCall) return;
    const cancelled: FacilitatorCall = {
      ...activeCall,
      status: 'cancelled',
      resolvedAt: new Date().toISOString(),
    };
    setCallHistory((h) => [cancelled, ...h]);
    setActiveCall(null);
  }

  const turns = session.recentTurns ?? (session.recent ? [session.recent] : []);
  const tone = sessionTone(session);

  // 라이브 인디케이터 — speakingNow 기반
  const speaking = session.speakingNow ?? (session.recent?.role ?? 'silence');
  const indicator = speaking === 'ai'
    ? { label: 'AI 도우미가 이야기하는 중', dot: 'bg-blue-500', wave: 'bg-blue-500' }
    : speaking === 'elderly'
    ? { label: '회원님이 이야기하는 중', dot: 'bg-emerald-500', wave: 'bg-emerald-500' }
    : { label: '잠시 침묵 중', dot: 'bg-slate-300', wave: 'bg-slate-300' };

  const elapsedStr = `${String(Math.floor(listenElapsed / 60)).padStart(2, '0')}:${String(listenElapsed % 60).padStart(2, '0')}`;

  return (
    <div className="animate-fade-in">
      {/* 상단 — 돌아가기 + 회원님 정보 + 라이브 상태 */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/sessions"
            aria-label="실시간 세션 목록으로"
            className="grid place-items-center w-9 h-9 rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50 active:scale-95 transition shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-700" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="text-[20px] sm:text-[22px] font-bold text-slate-900 tracking-tight truncate">
              {session.elderly.name} 회원님
            </div>
            <div className="text-[12px] text-slate-400 truncate">
              {session.elderly.age}세 · {cognitiveLabel(session.elderly.cognitiveLevel)} · {session.elderly.sessionNumber}회차 · {session.facility}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeCall && (
            <span
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold ring-1
                ${activeCall.status === 'pending'   ? 'bg-amber-50 text-amber-700 ring-amber-200' : ''}
                ${activeCall.status === 'responding'? 'bg-blue-50 text-blue-700 ring-blue-200' : ''}
                ${activeCall.status === 'arrived'   ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : ''}
              `}
            >
              <span className="relative inline-flex w-2 h-2">
                <span className={`absolute inset-0 rounded-full animate-ping opacity-75 ${
                  activeCall.status === 'pending' ? 'bg-amber-500' : activeCall.status === 'responding' ? 'bg-blue-500' : 'bg-emerald-500'
                }`} />
                <span className={`relative inline-flex rounded-full w-2 h-2 ${
                  activeCall.status === 'pending' ? 'bg-amber-500' : activeCall.status === 'responding' ? 'bg-blue-500' : 'bg-emerald-500'
                }`} />
              </span>
              진행자 {statusLabel(activeCall.status)}
              <span className="tabular-nums opacity-70">
                {secsToMmss(diffSecs(activeCall.calledAt))}
              </span>
            </span>
          )}
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white ring-1 ring-slate-200 text-[11px] font-semibold text-slate-600">
            <span className="relative inline-flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
              <span className="relative inline-flex rounded-full bg-red-500 w-2 h-2" />
            </span>
            청취 중
            <span className="text-slate-400 tabular-nums">{elapsedStr}</span>
          </span>
        </div>
      </div>

      {/* 위기 알림 핀 */}
      {session.alerts.length > 0 && (
        <div className="mb-4 rounded-2xl bg-red-50 ring-1 ring-red-200 p-4 flex items-start gap-3 animate-fade-in-up">
          <span className="grid place-items-center w-9 h-9 rounded-full bg-red-100 shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-red-700" aria-hidden>
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-bold text-red-700">위기 알림</div>
            <ul className="mt-1 space-y-0.5">
              {session.alerts.map((a, i) => (
                <li key={i} className="text-[13px] text-red-800">
                  <span className="font-bold">{alertLevelLabel(a.level)}</span> — {a.kind}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => openCallDialog(session.alerts[0]?.level === 'C' ? 'level_c' : 'level_b')}
            disabled={!!activeCall}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-red-600 text-white text-[12px] font-semibold hover:bg-red-700 active:scale-[0.99] transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            진행자 호출
          </button>
        </div>
      )}

      {/* 활성 진행자 호출 상태 카드 */}
      {activeCall && (
        <div
          className={`
            mb-4 rounded-2xl p-4 ring-1 animate-fade-in-up
            ${activeCall.status === 'pending'    ? 'bg-amber-50 ring-amber-200' : ''}
            ${activeCall.status === 'responding' ? 'bg-blue-50 ring-blue-200' : ''}
            ${activeCall.status === 'arrived'    ? 'bg-emerald-50 ring-emerald-200' : ''}
          `}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className={`
                grid place-items-center w-9 h-9 rounded-full shrink-0
                ${activeCall.status === 'pending'    ? 'bg-amber-100' : ''}
                ${activeCall.status === 'responding' ? 'bg-blue-100' : ''}
                ${activeCall.status === 'arrived'    ? 'bg-emerald-100' : ''}
              `}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${
                  activeCall.status === 'pending' ? 'text-amber-700' : activeCall.status === 'responding' ? 'text-blue-700' : 'text-emerald-700'
                }`} aria-hidden>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[11px] uppercase tracking-wider font-bold ${
                    activeCall.status === 'pending' ? 'text-amber-800' : activeCall.status === 'responding' ? 'text-blue-800' : 'text-emerald-800'
                  }`}>
                    진행자 호출 — {statusLabel(activeCall.status)}
                  </span>
                  <span className={`text-[11px] font-semibold tabular-nums ${
                    activeCall.status === 'pending' ? 'text-amber-700' : activeCall.status === 'responding' ? 'text-blue-700' : 'text-emerald-700'
                  }`}>
                    {secsToMmss(diffSecs(activeCall.calledAt))} 째
                  </span>
                </div>
                <div className="text-[14px] font-semibold text-slate-900">
                  사유: {reasonLabel(activeCall.reason)}
                </div>
                {activeCall.note && (
                  <div className="text-[12px] text-slate-600 mt-1 leading-relaxed word-keep-all">
                    “{activeCall.note}”
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 tabular-nums">
                  {activeCall.respondedAt && (
                    <span>응답 {secsToMmss(diffSecs(activeCall.calledAt, activeCall.respondedAt))}</span>
                  )}
                  {activeCall.arrivedAt && (
                    <span>도착 {secsToMmss(diffSecs(activeCall.calledAt, activeCall.arrivedAt))}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {activeCall.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleAdvance('responding')}
                    className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-amber-300 text-amber-800 text-[12px] font-semibold hover:bg-amber-100 active:scale-[0.99] transition"
                  >
                    응답 받음
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1.5 rounded-lg bg-transparent text-slate-500 text-[12px] font-semibold hover:bg-slate-100 active:scale-[0.99] transition"
                  >
                    취소
                  </button>
                </>
              )}
              {activeCall.status === 'responding' && (
                <button
                  onClick={() => handleAdvance('arrived')}
                  className="px-3 py-1.5 rounded-lg bg-white ring-1 ring-blue-300 text-blue-800 text-[12px] font-semibold hover:bg-blue-100 active:scale-[0.99] transition"
                >
                  도착 표시
                </button>
              )}
              {(activeCall.status === 'responding' || activeCall.status === 'arrived') && (
                <button
                  onClick={handleResolve}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition"
                >
                  해제
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 본문 그리드 — 좌측 트랜스크립트, 우측 사이드패널 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 트랜스크립트 영역 */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 flex flex-col min-h-[500px]">
            <CardHeader
              title="실시간 대화"
              description={`현재 ${session.turnCount}턴 · ${session.elapsedMinutes}분째 진행 중`}
              action={
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 ring-1 ring-slate-200 text-[11px] font-semibold text-slate-700`}>
                    <Waveform color={indicator.wave} />
                    {indicator.label}
                  </span>
                </div>
              }
            />
            <CardBody className="flex-1 flex flex-col">
              <div
                ref={transcriptRef}
                className="flex-1 overflow-y-auto bg-slate-50/40 rounded-xl p-4 space-y-3 min-h-[320px] max-h-[480px]"
              >
                {turns.length === 0 ? (
                  <div className="grid place-items-center h-full text-[12px] text-slate-400">
                    아직 발화 없음
                  </div>
                ) : (
                  turns.map((t, i) => <TurnBubble key={i} turn={t} />)
                )}
                {/* 라이브 인디케이터 (트랜스크립트 끝) */}
                <div className="flex items-center gap-2 pt-2">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${indicator.dot}`} />
                  <span className="text-[11px] text-slate-400 tracking-wide">{indicator.label}…</span>
                </div>
              </div>

              {/* 오디오 컨트롤 */}
              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`
                    inline-flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition
                    ${muted
                      ? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}
                  `}
                >
                  {muted ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                        <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4Z" />
                        <line x1="22" y1="9" x2="16" y2="15" />
                        <line x1="16" y1="9" x2="22" y2="15" />
                      </svg>
                      음소거됨
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                        <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4Z" />
                        <path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" />
                      </svg>
                      소리 듣기
                    </>
                  )}
                </button>
                <span className="text-[11px] text-slate-400">
                  실시간 오디오 스트림 — 백엔드 연결 후 활성화
                </span>
              </div>
            </CardBody>
          </Card>

          {/* 메모 작성 */}
          <Card className="mt-4">
            <CardHeader title="관리자 메모" description="이 세션에 대한 관찰 기록 — facilitatorNote에 추가됨" />
            <CardBody>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 아버지 이야기에서 보물 감지. 다음 세션에서 이어가도 좋겠음."
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-100 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveMemo}
                  disabled={!memo.trim()}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  메모 저장
                </button>
              </div>
              {memos.length > 0 && (
                <ul className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  {memos.map((m, i) => (
                    <li key={i} className="text-[12px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-slate-400 tabular-nums mr-2">{hhmm(m.at)}</span>
                      {m.text}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* 사이드패널 */}
        <div className="space-y-4">
          {/* 진행 상황 */}
          <Card>
            <CardHeader title="진행 상황" />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">세션 단계</div>
                  <div className="mt-1 text-[14px] font-semibold text-slate-800">{phaseLabel(session.sessionPhase)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">위험도</div>
                  <div className={`mt-1 text-[14px] font-bold ${tone === 'critical' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {riskLabel(session.riskLevel)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">대화 깊이</div>
                  <div className="mt-1 text-[14px] font-semibold text-slate-800">{depthLabel(session.depthLevel)}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">대화 횟수</div>
                  <div className="mt-1 text-[14px] font-semibold text-slate-800 tabular-nums">
                    {session.turnCount}회 <span className="text-slate-400 font-normal text-[12px]">/ 최대 {session.hardCapTurns}</span>
                  </div>
                </div>
              </div>
              {(session.treasureDetected || session.consecutiveRefusals >= 3 || session.ruleViolationsActive > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {session.treasureDetected && <Pill tone="info">깊은 이야기</Pill>}
                  {session.consecutiveRefusals >= 3 && <Pill tone="warning">짧은 답 {session.consecutiveRefusals}회</Pill>}
                  {session.ruleViolationsActive > 0 && <Pill tone="critical">응대 점검 {session.ruleViolationsActive}건</Pill>}
                </div>
              )}
            </CardBody>
          </Card>

          {/* 현재 주제 */}
          {session.currentTopic && (
            <Card>
              <CardHeader title="현재 주제" />
              <CardBody>
                <div className="text-[14px] font-semibold text-slate-800 word-keep-all">{session.currentTopic}</div>
              </CardBody>
            </Card>
          )}

          {/* 누적 엔티티 */}
          <Card>
            <CardHeader title="언급된 인물·장소" description="세션 누적" />
            <CardBody className="space-y-3">
              {(session.mentionedPeople ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">인물</div>
                  <ul className="space-y-1">
                    {(session.mentionedPeople ?? []).map((p, i) => (
                      <li key={i} className="flex items-center justify-between text-[12px]">
                        <span className="text-slate-700">
                          <span className="font-semibold">{p.name}</span>
                          <span className="text-slate-400 ml-1.5">{p.relation}</span>
                        </span>
                        {p.aliveStatus === 'deceased' && (
                          <span className="text-[10px] font-semibold text-slate-400">{aliveLabel('deceased')}</span>
                        )}
                        {p.aliveStatus === 'alive' && (
                          <span className="text-[10px] font-semibold text-emerald-600">{aliveLabel('alive')}</span>
                        )}
                        {p.aliveStatus === 'unknown' && (
                          <span className="text-[10px] font-semibold text-slate-300">{aliveLabel('unknown')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(session.mentionedPlaces ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">장소</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(session.mentionedPlaces ?? []).map((p, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(session.mentionedTimeperiods ?? []).length > 0 && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">시기</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(session.mentionedTimeperiods ?? []).map((t, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(session.mentionedPeople ?? []).length === 0 && (session.mentionedPlaces ?? []).length === 0 && (
                <div className="text-[12px] text-slate-400">아직 추출된 엔티티 없음</div>
              )}
            </CardBody>
          </Card>

          {/* 진행자 호출 이력 */}
          <Card>
            <CardHeader
              title="진행자 호출 이력"
              description="이번 세션 누적 — 응답·도착 시간 기록"
              action={<Pill>{callHistory.length}</Pill>}
            />
            <CardBody>
              {callHistory.length === 0 ? (
                <div className="text-[12px] text-slate-400">아직 호출 기록 없음</div>
              ) : (
                <ul className="divide-y divide-slate-100 -my-1">
                  {callHistory.map((c) => {
                    const respSec = c.respondedAt ? diffSecs(c.calledAt, c.respondedAt) : null;
                    const arrSec  = c.arrivedAt   ? diffSecs(c.calledAt, c.arrivedAt)   : null;
                    return (
                      <li key={c.id} className="py-2.5 first:pt-1 last:pb-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[12px] font-semibold text-slate-800 truncate">
                            {reasonLabel(c.reason)}
                          </span>
                          {c.status === 'resolved' ? (
                            <Pill tone="success">해제</Pill>
                          ) : (
                            <Pill>{statusLabel(c.status)}</Pill>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 tabular-nums">
                          <span>{hhmm(c.calledAt)}</span>
                          {respSec !== null && <span>응답 {secsToMmss(respSec)}</span>}
                          {arrSec  !== null && <span>도착 {secsToMmss(arrSec)}</span>}
                        </div>
                        {c.note && (
                          <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">“{c.note}”</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* 상태 인디케이터 */}
          <Card>
            <CardHeader title="라이브 신호" />
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot tone={speaking === 'silence' ? 'muted' : speaking === 'ai' ? 'info' : 'success'} />
                  <span className="text-[12px] font-medium text-slate-700">{indicator.label}</span>
                </div>
                <Waveform count={6} color={indicator.wave} />
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>오디오 스트림</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  연결됨 (mock)
                </span>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* 하단 액션 바 */}
      <div className="sticky bottom-0 -mx-5 lg:-mx-10 mt-6 px-5 lg:px-10 py-3 bg-white/95 backdrop-blur-md border-t border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/sessions"
            className="px-4 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 active:scale-[0.99] transition"
          >
            ← 목록으로
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openCallDialog()}
              disabled={!!activeCall}
              className="px-4 py-2.5 rounded-xl bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-[13px] font-semibold hover:bg-amber-100 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {activeCall ? '진행자 호출됨' : '진행자 호출'}
            </button>
            <button className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 active:scale-[0.99] transition">
              세션 종료
            </button>
          </div>
        </div>
      </div>

      {/* 호출 사유 모달 */}
      <FacilitatorCallDialog
        open={callDialogOpen}
        onClose={() => setCallDialogOpen(false)}
        onSubmit={handleCallSubmit}
        presetReason={callDialogPreset}
      />
    </div>
  );
}
