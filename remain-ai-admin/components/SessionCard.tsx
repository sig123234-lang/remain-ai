'use client';

import type { LiveSession } from '@/lib/live-sessions';
import { cognitiveLabel, phaseLabel, sessionTone } from '@/lib/live-sessions';

const TONE_RING = {
  critical: 'ring-red-200 hover:ring-red-300',
  warning:  'ring-amber-200 hover:ring-amber-300',
  success:  'ring-slate-100 hover:ring-slate-200',
  muted:    'ring-slate-100 hover:ring-slate-200',
  info:     'ring-blue-200 hover:ring-blue-300',
} as const;

const TONE_DOT = {
  critical: 'bg-red-500',
  warning:  'bg-amber-500',
  success:  'bg-emerald-500',
  muted:    'bg-slate-300',
  info:     'bg-blue-500',
} as const;

const TONE_TEXT = {
  critical: 'text-red-700',
  warning:  'text-amber-700',
  success:  'text-emerald-700',
  muted:    'text-slate-400',
  info:     'text-blue-700',
} as const;

const TONE_BG = {
  critical: 'bg-red-50',
  warning:  'bg-amber-50',
  success:  'bg-emerald-50',
  muted:    'bg-slate-50',
  info:     'bg-blue-50',
} as const;

const RISK_PILL = {
  high: 'bg-red-50 text-red-700 ring-red-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
} as const;

function ProgressBar({ ratio, tone }: { ratio: number; tone: keyof typeof TONE_DOT }) {
  const pct = Math.min(100, Math.max(0, ratio * 100));
  const fillCls = {
    critical: 'bg-red-500',
    warning:  'bg-amber-500',
    success:  'bg-emerald-500',
    muted:    'bg-slate-300',
    info:     'bg-blue-500',
  }[tone];
  return (
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full ${fillCls} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SessionCard({ session, onSelect }: { session: LiveSession; onSelect: (s: LiveSession) => void }) {
  const tone = sessionTone(session);
  const turnRatio = session.turnCount / session.hardCapTurns;
  const timeRatio = session.elapsedMinutes / session.hardCapMinutes;
  const isCritical = tone === 'critical';

  return (
    <button
      onClick={() => onSelect(session)}
      aria-label={`${session.elderly.name} 어르신 세션 상세 보기`}
      className={`
        relative text-left
        rounded-2xl bg-white
        ring-1 ${TONE_RING[tone]}
        shadow-[0_1px_3px_-1px_rgba(15,23,42,0.05)]
        hover:shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)]
        active:scale-[0.99]
        transition-all duration-200
        p-4
        ${isCritical ? 'animate-fade-in-up' : 'animate-fade-in'}
      `}
    >
      {/* 위기 시 좌측 컬러 바 */}
      {isCritical && (
        <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-red-500" aria-hidden />
      )}

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`relative inline-flex w-2 h-2 rounded-full ${TONE_DOT[tone]}`}>
            {isCritical && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-70" />}
          </span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-slate-900 truncate">
              {session.elderly.name} <span className="font-normal text-slate-500">{session.elderly.age}</span>
            </div>
            <div className="text-[11px] text-slate-400 tracking-wide truncate">
              {cognitiveLabel(session.elderly.cognitiveLevel)} · {session.elderly.sessionNumber}회차 · {session.facility}
            </div>
          </div>
        </div>
        <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset ${RISK_PILL[session.riskLevel]}`}>
          {session.riskLevel}
        </span>
      </div>

      {/* 진행률 */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">턴</span>
            <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{session.turnCount}/{session.hardCapTurns}</span>
          </div>
          <ProgressBar ratio={turnRatio} tone={tone} />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">시간</span>
            <span className="text-[11px] font-semibold text-slate-700 tabular-nums">{session.elapsedMinutes}/{session.hardCapMinutes}분</span>
          </div>
          <ProgressBar ratio={timeRatio} tone={tone} />
        </div>
      </div>

      {/* 칩 */}
      <div className="flex items-center gap-1.5 mt-3 flex-wrap">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset ${TONE_BG[tone]} ${TONE_TEXT[tone]} ring-current/30`}>
          {phaseLabel(session.sessionPhase)}
        </span>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
          L{session.depthLevel}
        </span>
        {session.treasureDetected && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200">
            보물
          </span>
        )}
        {session.consecutiveRefusals >= 3 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
            거부 {session.consecutiveRefusals}
          </span>
        )}
        {session.ruleViolationsActive > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
            규칙 {session.ruleViolationsActive}
          </span>
        )}
        {session.alerts.length > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 ring-1 ring-inset ring-red-200">
            ⚠ Level {session.alerts[0].level}
          </span>
        )}
      </div>

      {/* 주제 + 직전 발화 */}
      {session.currentTopic && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 mb-0.5 tracking-wide">현재 주제</div>
          <div className="text-[12px] text-slate-700 font-medium truncate">{session.currentTopic}</div>
        </div>
      )}

      {session.recent && (
        <div className="mt-2 text-[12px] text-slate-500 leading-relaxed word-keep-all line-clamp-2">
          <span className={`mr-1 font-semibold ${session.recent.role === 'elderly' ? 'text-slate-700' : 'text-blue-700'}`}>
            {session.recent.role === 'elderly' ? '어르신' : 'AI'}:
          </span>
          {session.recent.text}
        </div>
      )}
    </button>
  );
}
