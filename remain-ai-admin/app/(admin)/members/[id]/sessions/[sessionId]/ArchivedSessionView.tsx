'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Card, CardBody, CardHeader, Pill } from '@/components/Card';
import { cognitiveBadge, type Member } from '@/lib/members';
import {
  formatBytes,
  formatDuration,
  secToMmss,
  type ArchivedSession,
  type ArchivedTurn,
} from '@/lib/sessions-archive';

/** SSR/CSR 일치 보장: KST(+9) 기준 YYYY-MM-DD HH:mm */
function dateTimeKo(iso: string): string {
  const ms = new Date(iso).getTime() + 9 * 3_600_000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}-${M}-${day} ${h}:${m}`;
}

function TurnRow({
  turn,
  onJump,
}: {
  turn: ArchivedTurn;
  onJump?: (sec: number) => void;
}) {
  const isElder = turn.role === 'elderly';
  return (
    <div className={`flex ${isElder ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[80%] ${isElder ? '' : 'text-right'}`}>
        <div className={`flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wider font-semibold ${isElder ? '' : 'justify-end'}`}>
          <span className={isElder ? 'text-slate-400' : 'text-blue-500'}>
            {isElder ? '회원님' : 'AI 도우미'}
          </span>
          <button
            onClick={() => onJump?.(turn.timestampSec)}
            disabled={!onJump}
            className="font-mono font-normal tabular-nums text-slate-300 hover:text-slate-700 transition disabled:hover:text-slate-300 disabled:cursor-default"
            title={onJump ? `음성 ${secToMmss(turn.timestampSec)}로 이동` : ''}
          >
            {secToMmss(turn.timestampSec)}
          </button>
          {turn.sttConfidence !== undefined && turn.sttConfidence < 0.85 && (
            <span className="font-normal text-amber-600 normal-case tracking-normal">신뢰도 낮음</span>
          )}
        </div>
        <div
          className={`
            inline-block rounded-2xl px-4 py-2.5 text-[14px] leading-[1.65] word-keep-all
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

export default function ArchivedSessionView({
  member,
  session,
}: {
  member: Member;
  session: ArchivedSession;
}) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // mock 데이터 — 실제로는 signed URL로 받음. mock에선 클릭 시 toast.
  function handlePlay() {
    setPlaying((p) => !p);
  }

  function handleDownload() {
    // mock — 실제로는 signed URL 발급 후 다운로드
    if (!session.audio.url) return;
    const a = document.createElement('a');
    a.href = session.audio.url;
    a.download = `${member.name}_${session.sessionNumber}회차_${session.id}.${session.audio.format}`;
    a.click();
  }

  function handleJumpTo(sec: number) {
    // 실제 오디오면 audioRef.current.currentTime = sec
    // mock: visual feedback만
    console.log('jump to', sec);
  }

  return (
    <div className="animate-fade-in pb-12">
      {/* 상단 — 돌아가기 + 회원/세션 정보 */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/members/${member.id}`}
            aria-label="회원 상세로"
            className="grid place-items-center w-9 h-9 rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50 active:scale-95 transition shrink-0 dark:ring-slate-700 dark:hover:bg-slate-800/50"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-700 dark:text-slate-300" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="min-w-0">
            <div className="text-[20px] sm:text-[22px] font-bold text-slate-900 tracking-tight dark:text-slate-100">
              {member.name} 회원님 · {session.sessionNumber}회차
            </div>
            <div className="text-[12px] text-slate-400 dark:text-slate-500">
              {dateTimeKo(session.startedAt)} · {session.durationMinutes}분 · {session.turnCount}회 대화 · {cognitiveBadge(member.cognitiveLevel)} · {member.facility}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {session.reportId && (
            <Link
              href={`/reports/${session.reportId}`}
              className="px-3 py-2 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 text-emerald-800 text-[12px] font-semibold hover:bg-emerald-100 active:scale-[0.99] transition flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden>
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="14 3 14 9 20 9" />
              </svg>
              보호자 리포트 보기
            </Link>
          )}
        </div>
      </div>

      {/* 메타 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="px-4 py-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold dark:text-slate-500">대화 시간</div>
          <div className="mt-1.5 text-[22px] font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {session.durationMinutes}<span className="text-[12px] font-normal text-slate-400 dark:text-slate-500">분</span>
          </div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold dark:text-slate-500">대화 횟수</div>
          <div className="mt-1.5 text-[22px] font-bold text-slate-900 tabular-nums dark:text-slate-100">
            {session.turnCount}<span className="text-[12px] font-normal text-slate-400 dark:text-slate-500">회</span>
          </div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold dark:text-slate-500">감정 점수</div>
          <div className="mt-1.5 text-[22px] font-bold text-emerald-600 tabular-nums">
            {session.emotionalScore}
          </div>
        </Card>
        <Card className="px-4 py-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold dark:text-slate-500">상태</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {session.treasureDetected && <Pill tone="info">깊은 이야기</Pill>}
            {session.riskFlagged && <Pill tone="critical">위기 신호</Pill>}
            {!session.treasureDetected && !session.riskFlagged && <span className="text-[12px] text-slate-400 dark:text-slate-500">평온</span>}
          </div>
        </Card>
      </div>

      {/* 2단 레이아웃: 좌측 트랜스크립트, 우측 음성 + 메타 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 좌측 — 전체 대화 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="전체 대화"
              description="시간 라벨을 누르면 음성의 해당 위치로 점프합니다"
              action={<Pill>{session.turns.length}회</Pill>}
            />
            <CardBody>
              <div className="space-y-3">
                {session.turns.map((t) => (
                  <TurnRow key={t.index} turn={t} onJump={session.audio.stored ? handleJumpTo : undefined} />
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* 우측 — 음성 + 메타 */}
        <div className="space-y-4">
          {/* 음성 파일 */}
          <Card>
            <CardHeader title="음성 파일" />
            <CardBody>
              {session.audio.stored ? (
                <>
                  {/* 플레이어 */}
                  <div className="rounded-xl bg-slate-50 p-4 space-y-3 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePlay}
                        aria-label={playing ? '일시정지' : '재생'}
                        className="grid place-items-center w-11 h-11 rounded-full bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition shrink-0"
                      >
                        {playing ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden>
                            <rect x="6" y="4" width="4" height="16" />
                            <rect x="14" y="4" width="4" height="16" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5" aria-hidden>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                          {member.name} 회원님 · {session.sessionNumber}회차
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums dark:text-slate-500">
                          {formatDuration(session.audio.durationSec)} · {session.audio.format.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    {/* 더미 프로그레스 바 */}
                    <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full bg-slate-900 transition-all ${playing ? 'w-1/3' : 'w-0'}`} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 tabular-nums font-mono dark:text-slate-500">
                      <span>{playing ? secToMmss(Math.floor(session.audio.durationSec / 3)) : '00:00'}</span>
                      <span>{secToMmss(session.audio.durationSec)}</span>
                    </div>
                  </div>

                  {/* 다운로드 */}
                  <button
                    onClick={handleDownload}
                    className="mt-3 w-full px-4 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 active:scale-[0.99] transition flex items-center justify-center gap-1.5 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    음성 파일 다운로드
                  </button>

                  {/* 파일 메타 */}
                  <dl className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-[11px] dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-400 dark:text-slate-500">파일 크기</dt>
                      <dd className="text-slate-700 font-medium tabular-nums dark:text-slate-300">{formatBytes(session.audio.sizeBytes)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-400 dark:text-slate-500">포맷</dt>
                      <dd className="text-slate-700 font-medium dark:text-slate-300">{session.audio.format.toUpperCase()}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-400 dark:text-slate-500">샘플레이트</dt>
                      <dd className="text-slate-700 font-medium tabular-nums dark:text-slate-300">{session.audio.sampleRateHz / 1000}kHz</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-400 dark:text-slate-500">채널</dt>
                      <dd className="text-slate-700 font-medium dark:text-slate-300">{session.audio.channels === 1 ? '모노' : '스테레오'}</dd>
                    </div>
                  </dl>

                  <audio ref={audioRef} src={session.audio.url} preload="none" />
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-slate-100 mb-3 dark:bg-slate-800">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden>
                      <line x1="1" y1="1" x2="23" y2="23" />
                      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  </div>
                  <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">음성 미보관</p>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed dark:text-slate-500">
                    L2(음성 처리) 동의를 받지 않아<br />
                    이 세션의 음성은 저장되지 않았어요.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* 주제 */}
          <Card>
            <CardHeader title="다룬 주제" />
            <CardBody>
              <div className="text-[13px] font-semibold text-slate-900 mb-2 word-keep-all dark:text-slate-100">{session.mainTopic}</div>
              <div className="flex flex-wrap gap-1.5">
                {session.topics.map((t) => (
                  <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:text-slate-300 dark:bg-slate-800">
                    {t}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* 연결 */}
          <Card>
            <CardHeader title="연결된 정보" />
            <CardBody className="space-y-2">
              {session.reportId ? (
                <Link
                  href={`/reports/${session.reportId}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800 dark:text-slate-200">보호자 리포트</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500">발송 완료</div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ) : (
                <p className="text-[12px] text-slate-400 dark:text-slate-500">아직 보호자 리포트가 생성되지 않았어요</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
