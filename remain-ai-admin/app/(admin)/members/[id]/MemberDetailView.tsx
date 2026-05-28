'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardBody, CardHeader, EmptyState, Pill, StatusDot } from '@/components/Card';
import { cognitiveBadge, timeAgoKo, type Member } from '@/lib/members';
import { aliveLabel } from '@/lib/live-sessions';
import { formatBytes, formatDuration, type ArchivedSession } from '@/lib/sessions-archive';
import { deleteMember } from '../actions';

function ConsentBadge({ on, label }: { on?: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      {label}
    </span>
  );
}

/** SSR/CSR 일치 보장: KST(+9) 기준 YYYY-MM-DD */
function dateKo(iso: string): string {
  const ms = new Date(iso).getTime() + 9 * 3_600_000;
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function MemberDetailView({ member, sessions }: { member: Member; sessions: ArchivedSession[] }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteMember(member.id);
      // 성공 시 server action이 redirect 하므로 여기 도달하지 않음.
      if (res && !res.ok) {
        setDeleteError(res.error ?? '삭제 실패');
        setDeleting(false);
      }
    } catch (e) {
      // NEXT_REDIRECT는 정상 — 그 외만 표시
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('NEXT_REDIRECT')) {
        setDeleteError(msg);
        setDeleting(false);
      }
    }
  }

  return (
    <div className="animate-fade-in">
      {/* 상단 — 돌아가기 + 회원 정보 */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/members"
            aria-label="회원 목록으로"
            className="grid place-items-center w-9 h-9 rounded-full bg-white ring-1 ring-slate-200 hover:bg-slate-50 active:scale-95 transition shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-700" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="grid place-items-center w-12 h-12 rounded-full bg-slate-100 text-slate-700 text-[16px] font-bold shrink-0">
            {member.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[20px] sm:text-[22px] font-bold text-slate-900 tracking-tight">
                {member.name} 회원님
              </span>
              {member.inActiveSession && (
                <Pill tone="success">진행 중</Pill>
              )}
            </div>
            <div className="text-[12px] text-slate-400 truncate">
              {member.age}세 · {cognitiveBadge(member.cognitiveLevel)} · {member.facility} · {member.sessionCount}회차 완료 · 마지막 {timeAgoKo(member.lastSessionAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setDeleteError(null); setConfirmOpen(true); }}
            className="px-3 py-2 rounded-xl bg-white ring-1 ring-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 active:scale-[0.99] transition flex items-center gap-1.5"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            회원 삭제
          </button>
        </div>
      </div>

      {confirmOpen && (
        <>
          <button aria-label="닫기" onClick={() => !deleting && setConfirmOpen(false)} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm animate-fade-in" />
          <div role="dialog" aria-label="회원 삭제 확인" className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl animate-fade-in-up p-5">
            <div className="text-[16px] font-bold text-slate-900 tracking-tight">
              "{member.name}" 회원님을 삭제할까요?
            </div>
            <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
              세션 기록·대화 로그·음성 파일도 함께 삭제됩니다. 이 작업은 되돌릴 수 없어요.
            </p>
            {deleteError && (
              <div className="mt-3 rounded-xl bg-red-50 ring-1 ring-red-200 px-3 py-2 text-[12px] text-red-700">
                {deleteError}
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 text-slate-700 text-[13px] font-semibold hover:bg-slate-100 disabled:opacity-60 transition"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white text-[13px] font-semibold hover:bg-red-700 active:scale-[0.99] transition disabled:opacity-60"
              >
                {deleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* 2단 레이아웃 — 좌측 프로필, 우측 세션 히스토리 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 좌측 프로필 정보 */}
        <div className="space-y-4 lg:col-span-1">
          {/* 보호자 */}
          <Card>
            <CardHeader title="보호자" />
            <CardBody>
              {member.guardianName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="grid place-items-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                      {member.guardianName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-slate-900">{member.guardianName}님</div>
                      <div className="text-[11px] text-slate-400">{member.guardianRelation}</div>
                    </div>
                  </div>
                  <div className="pt-2 space-y-1 text-[12px]">
                    {member.guardianPhone && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-400" aria-hidden>
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span className="tabular-nums">{member.guardianPhone}</span>
                      </div>
                    )}
                    {member.guardianEmail && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-slate-400" aria-hidden>
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <span className="truncate">{member.guardianEmail}</span>
                      </div>
                    )}
                    {member.kakaoChannelLinked && (
                      <div className="flex items-center gap-2 text-emerald-700">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[11px] font-semibold">카카오 채널 친구</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-slate-400">보호자 미등록 — 리포트 발송 불가</p>
              )}
            </CardBody>
          </Card>

          {/* 가족 상태 */}
          {member.familyStatus && (
            <Card>
              <CardHeader title="가족 생존 상태" />
              <CardBody>
                <ul className="space-y-2 text-[13px]">
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600">아버지</span>
                    <span className="text-slate-700 font-medium">{aliveLabel(member.familyStatus.father)}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600">어머니</span>
                    <span className="text-slate-700 font-medium">{aliveLabel(member.familyStatus.mother)}</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600">배우자</span>
                    <span className="text-slate-700 font-medium">{aliveLabel(member.familyStatus.spouse)}</span>
                  </li>
                </ul>
              </CardBody>
            </Card>
          )}

          {/* 동의 */}
          {member.consent && (
            <Card>
              <CardHeader title="동의 (consentStatus)" />
              <CardBody>
                <div className="grid grid-cols-2 gap-1.5">
                  <ConsentBadge on={member.consent.L1} label="L1 세션" />
                  <ConsentBadge on={member.consent.L2} label="L2 음성" />
                  <ConsentBadge on={member.consent.L3} label="L3 기록" />
                  <ConsentBadge on={member.consent.L4} label="L4 학습" />
                  <ConsentBadge on={member.consent.L5} label="L5 공유" />
                  <ConsentBadge on={member.consent.L6} label="L6 연구" />
                </div>
                {member.consent.L2 && member.consent.L3 ? (
                  <p className="mt-3 text-[11px] text-emerald-700">음성 보관 가능</p>
                ) : member.consent.L3 ? (
                  <p className="mt-3 text-[11px] text-amber-700">텍스트만 보관 (L2 음성 동의 X)</p>
                ) : (
                  <p className="mt-3 text-[11px] text-red-700">기록 보관 동의 미체크 (L3)</p>
                )}
              </CardBody>
            </Card>
          )}

          {/* 회피 주제 */}
          {member.tabooTopics && member.tabooTopics.length > 0 && (
            <Card>
              <CardHeader title="회피 주제" description="대화 중 LLM이 피하는 주제" />
              <CardBody>
                <div className="flex flex-wrap gap-1.5">
                  {member.tabooTopics.map((t) => (
                    <span key={t} className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                      {t}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* 우측 세션 히스토리 */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader
              title="이전 대화"
              description="완료된 세션을 누르면 전체 대화와 음성을 볼 수 있어요"
              action={<Pill>{sessions.length}건</Pill>}
            />
            <CardBody>
              {sessions.length === 0 ? (
                <EmptyState
                  title="아직 완료된 세션이 없어요"
                  hint="세션이 끝나면 여기에 자동으로 쌓여요"
                />
              ) : (
                <ul className="space-y-2">
                  {sessions.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/members/${member.id}/sessions/${s.id}`}
                        className="block rounded-xl bg-slate-50 hover:bg-slate-100 ring-1 ring-slate-100 hover:ring-slate-200 p-4 transition group"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[14px] font-bold text-slate-900">{s.sessionNumber}회차</span>
                              <span className="text-[12px] text-slate-400 tabular-nums">{dateKo(s.startedAt)}</span>
                              <span className="text-[11px] text-slate-300">·</span>
                              <span className="text-[12px] text-slate-500">{s.durationMinutes}분</span>
                              {s.treasureDetected && <Pill tone="info">깊은 이야기</Pill>}
                              {s.riskFlagged && <Pill tone="critical">위기 신호</Pill>}
                              {s.reportId && <Pill tone="success">리포트 발송됨</Pill>}
                            </div>
                            <div className="text-[13px] font-medium text-slate-800 mb-1.5 truncate">
                              {s.mainTopic}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {s.topics.slice(0, 4).map((t) => (
                                <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-white text-slate-600 ring-1 ring-slate-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {s.audio.stored ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden>
                                  <path d="M11 5 6 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l5 4Z" />
                                  <path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" />
                                </svg>
                                음성 {formatBytes(s.audio.sizeBytes)}
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-300 font-medium">텍스트만</div>
                            )}
                            <span className="text-[12px] font-semibold text-slate-400 tabular-nums">
                              {s.turnCount}대화
                            </span>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition" aria-hidden>
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* 누적 통계 */}
          {sessions.length > 0 && (
            <Card>
              <CardHeader title="누적 통계" />
              <CardBody>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">총 세션</div>
                    <div className="mt-1 text-[20px] font-bold text-slate-900 tabular-nums">{sessions.length}</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">총 대화 시간</div>
                    <div className="mt-1 text-[20px] font-bold text-slate-900 tabular-nums">
                      {sessions.reduce((a, s) => a + s.durationMinutes, 0)}<span className="text-[12px] font-normal text-slate-400">분</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">깊은 이야기</div>
                    <div className="mt-1 text-[20px] font-bold text-violet-700 tabular-nums">
                      {sessions.filter((s) => s.treasureDetected).length}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">음성 보관</div>
                    <div className="mt-1 text-[20px] font-bold text-slate-900 tabular-nums">
                      {sessions.filter((s) => s.audio.stored).length}<span className="text-[12px] font-normal text-slate-400">/{sessions.length}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
