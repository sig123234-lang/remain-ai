'use client';

import { useTheme, type Theme } from './ThemeProvider';

function SunIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function SystemIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <line x1="8" y1="20" x2="16" y2="20" />
      <line x1="12" y1="16" x2="12" y2="20" />
    </svg>
  );
}

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light',  label: '라이트', icon: <SunIcon /> },
  { value: 'dark',   label: '다크',   icon: <MoonIcon /> },
  { value: 'system', label: '시스템', icon: <SystemIcon /> },
];

export default function ThemeSelector() {
  const { theme, resolved, setTheme } = useTheme();

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="화면 테마"
        className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 ring-1 ring-slate-200 dark:ring-slate-700"
      >
        {OPTIONS.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold
                transition-all duration-150
                ${active
                  ? 'bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 shadow-[0_1px_3px_-1px_rgba(15,23,42,0.15)]'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }
              `}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-slate-400 dark:text-slate-500">
        현재 적용: <span className="font-semibold text-slate-600 dark:text-slate-300">{resolved === 'dark' ? '다크' : '라이트'}</span>
        {theme === 'system' && <span> · 시스템 설정 따름</span>}
      </p>
    </div>
  );
}
