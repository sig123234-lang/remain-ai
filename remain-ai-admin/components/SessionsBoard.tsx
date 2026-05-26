'use client';

import { useMemo, useState } from 'react';
import type { LiveSession, RiskLevel, SessionPhase } from '@/lib/live-sessions';
import { sessionTone, triageScore } from '@/lib/live-sessions';
import SessionCard from './SessionCard';
import SessionDetailDrawer from './SessionDetailDrawer';
import CriticalAlertCard from './CriticalAlertCard';
import { Card, CardBody, CardHeader, EmptyState, Pill, StatCard } from './Card';

type Filter = 'all' | 'attention' | 'normal' | 'post';
type Sort = 'triage' | 'elapsed_desc' | 'elapsed_asc' | 'name';

export default function SessionsBoard({ sessions }: { sessions: LiveSession[] }) {
  const [selected, setSelected] = useState<LiveSession | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('triage');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [facility, setFacility] = useState<string>('all');

  const facilities = useMemo(() => {
    const set = new Set(sessions.map(s => s.facility));
    return ['all', ...Array.from(set)];
  }, [sessions]);

  // 위기 핀
  const criticalSessions = useMemo(
    () => sessions.filter(s => s.alerts.some(a => a.level === 'C' || a.level === 'B')),
    [sessions],
  );

  // 카운터
  const counts = useMemo(() => {
    const live = sessions.filter(s => s.sessionPhase !== 'post_processing');
    const post = sessions.filter(s => s.sessionPhase === 'post_processing');
    const critical = live.filter(s => sessionTone(s) === 'critical').length;
    const warning = live.filter(s => sessionTone(s) === 'warning').length;
    const normal = live.filter(s => sessionTone(s) === 'success').length;
    return { live: live.length, post: post.length, critical, warning, normal };
  }, [sessions]);

  // 필터 + 정렬
  const visible = useMemo(() => {
    let arr = [...sessions];
    if (facility !== 'all') arr = arr.filter(s => s.facility === facility);

    if (filter === 'attention') {
      arr = arr.filter(s => sessionTone(s) === 'critical' || sessionTone(s) === 'warning');
    } else if (filter === 'normal') {
      arr = arr.filter(s => sessionTone(s) === 'success');
    } else if (filter === 'post') {
      arr = arr.filter(s => s.sessionPhase === 'post_processing');
    } else {
      // 'all' — 후처리는 별도 섹션이라 메인 그리드에서 제외
      arr = arr.filter(s => s.sessionPhase !== 'post_processing');
    }

    if (sort === 'triage') {
      arr.sort((a, b) => triageScore(b) - triageScore(a));
    } else if (sort === 'elapsed_desc') {
      arr.sort((a, b) => b.elapsedMinutes - a.elapsedMinutes);
    } else if (sort === 'elapsed_asc') {
      arr.sort((a, b) => a.elapsedMinutes - b.elapsedMinutes);
    } else if (sort === 'name') {
      arr.sort((a, b) => a.elderly.name.localeCompare(b.elderly.name, 'ko'));
    }
    return arr;
  }, [sessions, filter, sort, facility]);

  // 후처리는 항상 별도
  const postProcessing = useMemo(() => {
    let arr = sessions.filter(s => s.sessionPhase === 'post_processing');
    if (facility !== 'all') arr = arr.filter(s => s.facility === facility);
    return arr;
  }, [sessions, facility]);

  return (
    <div className="animate-fade-in">
      {/* KPI 스트립 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="진행 중" value={counts.live} hint="후처리 제외" />
        <StatCard label="위기" value={counts.critical} hint="Level B/C · 규칙위반 · risk=high" tone="critical" />
        <StatCard label="주의" value={counts.warning} hint="medium · 거부3+ · 캡임박" tone="warning" />
        <StatCard label="후처리 대기" value={counts.post} hint="세션기록 / 보호자 리포트" tone="info" />
      </div>

      {/* 위기 핀 */}
      {criticalSessions.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block w-1 h-5 bg-red-500 rounded-full" aria-hidden />
              <h2 className="text-[14px] font-bold text-slate-900 tracking-tight">즉시 대응 필요</h2>
              <Pill tone="critical">{criticalSessions.length}건</Pill>
            </div>
            <span className="text-[11px] text-slate-400 tracking-wide">자해 언급 · 타인 위협 · 위급 신호</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {criticalSessions.map(s => (
              <CriticalAlertCard key={s.id} session={s} onSelect={setSelected} />
            ))}
          </div>
        </div>
      )}

      {/* 필터 / 정렬 바 */}
      <div className="mt-6 flex flex-wrap items-center gap-2 sticky top-0 lg:top-0 z-10 bg-slate-50/80 backdrop-blur-md -mx-2 px-2 py-3 rounded-xl">
        <div className="flex gap-1 bg-white ring-1 ring-slate-200 rounded-xl p-1">
          {([
            { id: 'all', label: '전체', count: counts.live },
            { id: 'attention', label: '주목', count: counts.critical + counts.warning },
            { id: 'normal', label: '정상', count: counts.normal },
            { id: 'post', label: '후처리', count: counts.post },
          ] as const).map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                px-3 py-1.5 rounded-lg text-[12px] font-semibold transition
                ${filter === f.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}
              `}
            >
              {f.label} <span className={`ml-1 text-[11px] tabular-nums ${filter === f.id ? 'text-slate-300' : 'text-slate-400'}`}>{f.count}</span>
            </button>
          ))}
        </div>

        <select
          value={facility}
          onChange={(e) => setFacility(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-[12px] font-medium text-slate-700"
        >
          {facilities.map(f => (
            <option key={f} value={f}>{f === 'all' ? '전체 시설' : f}</option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="px-3 py-2 rounded-xl bg-white ring-1 ring-slate-200 text-[12px] font-medium text-slate-700"
        >
          <option value="triage">위험도 높은순</option>
          <option value="elapsed_desc">진행시간 긴순</option>
          <option value="elapsed_asc">진행시간 짧은순</option>
          <option value="name">이름순</option>
        </select>

        <div className="ml-auto flex gap-1 bg-white ring-1 ring-slate-200 rounded-xl p-1">
          <button
            onClick={() => setView('grid')}
            aria-label="그리드 보기"
            className={`px-2.5 py-1.5 rounded-lg transition ${view === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            aria-label="리스트 보기"
            className={`px-2.5 py-1.5 rounded-lg transition ${view === 'list' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden>
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="mt-4">
        {visible.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState title="해당 조건에 맞는 세션이 없어요" hint="필터를 조정하거나 잠시 후 다시 확인해 주세요" />
            </CardBody>
          </Card>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {visible.map(s => (
              <SessionCard key={s.id} session={s} onSelect={setSelected} />
            ))}
          </div>
        ) : (
          <ListView sessions={visible} onSelect={setSelected} />
        )}
      </div>

      {/* 후처리 (필터가 'all'일 때 별도 섹션) */}
      {filter === 'all' && postProcessing.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader
              title="후처리 대기"
              description="세션 종료 후 세션기록(v5) + 보호자 리포트(v3) 생성 큐"
              action={<Pill tone="info">{postProcessing.length}</Pill>}
            />
            <CardBody>
              <ul className="divide-y divide-slate-100">
                {postProcessing.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelected(s)}
                      className="w-full flex items-center justify-between gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-[13px] font-semibold text-slate-800 truncate">
                          {s.elderly.name} <span className="font-normal text-slate-400">· {s.facility}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {s.elapsedMinutes}분 · 턴 {s.turnCount} · L{s.depthLevel}{s.treasureDetected ? ' · 보물' : ''}
                        </div>
                      </div>
                      <Pill tone="info">처리 중</Pill>
                    </button>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 상세 드로어 */}
      <SessionDetailDrawer session={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

// ─────────────────────────────────────────────
//  리스트 뷰 (테이블 — 데스크탑에 더 많이 보기)
// ─────────────────────────────────────────────
function ListView({ sessions, onSelect }: { sessions: LiveSession[]; onSelect: (s: LiveSession) => void }) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-100">
              <th className="py-3 px-3">상태</th>
              <th className="py-3 px-3">어르신</th>
              <th className="py-3 px-3 hidden md:table-cell">시설</th>
              <th className="py-3 px-3">경과</th>
              <th className="py-3 px-3">턴</th>
              <th className="py-3 px-3 hidden md:table-cell">phase</th>
              <th className="py-3 px-3 hidden md:table-cell">depth</th>
              <th className="py-3 px-3">risk</th>
              <th className="py-3 px-3 hidden lg:table-cell">주제</th>
              <th className="py-3 px-3">알림</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map(s => {
              const tone = sessionTone(s);
              const toneDot = { critical: 'bg-red-500', warning: 'bg-amber-500', success: 'bg-emerald-500', muted: 'bg-slate-300', info: 'bg-blue-500' }[tone];
              const riskBg = { high: 'bg-red-50 text-red-700', medium: 'bg-amber-50 text-amber-700', low: 'bg-emerald-50 text-emerald-700' }[s.riskLevel];
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className="cursor-pointer hover:bg-slate-50 transition"
                >
                  <td className="py-2.5 px-3">
                    <span className={`inline-block w-2 h-2 rounded-full ${toneDot}`} />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{s.elderly.name}</div>
                    <div className="text-[10px] text-slate-400">{s.elderly.age} · {s.elderly.sessionNumber}회차</div>
                  </td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-slate-500">{s.facility}</td>
                  <td className="py-2.5 px-3 tabular-nums text-slate-700">{s.elapsedMinutes}분</td>
                  <td className="py-2.5 px-3 tabular-nums text-slate-700">{s.turnCount}/{s.hardCapTurns}</td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-slate-700">{s.sessionPhase}</td>
                  <td className="py-2.5 px-3 hidden md:table-cell text-slate-700">L{s.depthLevel}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${riskBg}`}>{s.riskLevel}</span>
                  </td>
                  <td className="py-2.5 px-3 hidden lg:table-cell text-slate-500 max-w-[220px] truncate">{s.currentTopic ?? '-'}</td>
                  <td className="py-2.5 px-3">
                    {s.alerts.length > 0 ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 ring-1 ring-inset ring-red-200">
                        ⚠ {s.alerts[0].level}
                      </span>
                    ) : s.ruleViolationsActive > 0 ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                        규칙 {s.ruleViolationsActive}
                      </span>
                    ) : (
                      <span className="text-slate-300">·</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
