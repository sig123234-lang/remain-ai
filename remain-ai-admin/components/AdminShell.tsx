'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';

// ─────────────────────────────────────────────
//  로고
// ─────────────────────────────────────────────
function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'text-[16px]', md: 'text-[20px]', lg: 'text-[22px]' }[size];
  return (
    <span className={`inline-flex items-baseline ${sizeClass} tracking-tight leading-none`}>
      <span className="font-medium text-slate-700">rem</span>
      <span className="font-bold text-slate-900">AI</span>
      <span className="font-medium text-slate-700">n</span>
      <span className="ml-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">Admin</span>
    </span>
  );
}

// ─────────────────────────────────────────────
//  아이콘
// ─────────────────────────────────────────────
const baseSvg = 'currentColor';
type IconProps = { className?: string; filled?: boolean };

function HomeIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? baseSvg : 'none'} stroke={baseSvg} strokeWidth={filled ? 0 : 1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7H10v7H4a1 1 0 0 1-1-1Z" />
    </svg>
  );
}
function ActivityIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  // 라이브/세션 - waveform
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={baseSvg} strokeWidth={filled ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 12h3l3-7 4 14 3-10 2 3h3" />
    </svg>
  );
}
function UsersIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? baseSvg : 'none'} stroke={baseSvg} strokeWidth={filled ? 0 : 1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function ArchiveIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? baseSvg : 'none'} stroke={baseSvg} strokeWidth={filled ? 0 : 1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <line x1="10" y1="13" x2="14" y2="13" />
    </svg>
  );
}
function ReportIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? baseSvg : 'none'} stroke={baseSvg} strokeWidth={filled ? 0 : 1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="14 3 14 9 20 9" />
      <line x1="9" y1="14" x2="15" y2="14" />
      <line x1="9" y1="18" x2="13" y2="18" />
    </svg>
  );
}
function ShieldIcon({ className = 'w-5 h-5', filled = false }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? baseSvg : 'none'} stroke={baseSvg} strokeWidth={filled ? 0 : 1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function SettingsIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={baseSvg} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}
function MenuIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={baseSvg} strokeWidth={1.6} strokeLinecap="round" className={className} aria-hidden>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
function CloseIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={baseSvg} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// ─────────────────────────────────────────────
//  메뉴 정의
// ─────────────────────────────────────────────
type NavItem = {
  href: string;
  label: string;
  renderIcon: (filled: boolean) => ReactNode;
  badge?: { label: string; tone: 'critical' | 'warning' | 'info' };
};

const NAV: NavItem[] = [
  { href: '/',         label: '홈',          renderIcon: (f) => <HomeIcon filled={f} /> },
  { href: '/sessions', label: '실시간 세션', renderIcon: (f) => <ActivityIcon filled={f} /> },
  { href: '/members',  label: '회원 관리',   renderIcon: (f) => <UsersIcon filled={f} /> },
  { href: '/archive',  label: '기억 아카이브', renderIcon: (f) => <ArchiveIcon filled={f} /> },
  { href: '/reports',  label: '리포트',      renderIcon: (f) => <ReportIcon filled={f} /> },
  { href: '/quality',  label: 'AI 품질 감사', renderIcon: (f) => <ShieldIcon filled={f} /> },
  { href: '/settings', label: '설정',        renderIcon: () => <SettingsIcon /> },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function BadgeChip({ tone, label }: { tone: NavItem['badge'] extends infer T ? T extends { tone: infer X } ? X : never : never; label: string }) {
  const toneClass = {
    critical: 'bg-red-50 text-red-700 ring-red-200',
    warning:  'bg-amber-50 text-amber-700 ring-amber-200',
    info:     'bg-blue-50 text-blue-700 ring-blue-200',
  }[tone];
  return (
    <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset ${toneClass}`}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────
//  사이드바 (재사용 — 데스크탑 고정 / 모바일 드로어)
// ─────────────────────────────────────────────
function SidebarContents({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="px-2 mb-10">
        <Link href="/" onClick={onNavigate} aria-label="홈으로 이동" className="inline-block">
          <Logo size="md" />
        </Link>
      </div>

      <nav className="flex-1" aria-label="메인 네비게이션">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    group w-full flex items-center gap-3
                    px-3 py-2.5 rounded-xl
                    text-[14px]
                    transition-all duration-200
                    ${active
                      ? 'bg-slate-900 text-white font-semibold shadow-[0_4px_14px_-6px_rgba(15,23,42,0.35)]'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'
                    }
                  `}
                >
                  <span className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}>
                    {item.renderIcon(active)}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && <BadgeChip tone={item.badge.tone} label={item.badge.label} />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2">
          <div className="grid place-items-center w-8 h-8 rounded-full bg-slate-200 text-slate-600 text-[12px] font-semibold">
            관
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-slate-800 truncate">관리자</div>
            <div className="text-[11px] text-slate-400 truncate">admin@remain.ai</div>
          </div>
        </div>
        <p className="mt-4 px-2 text-[11px] text-slate-300 tracking-wide">remain.ai · v0.1</p>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
//  Shell
// ─────────────────────────────────────────────
export default function AdminShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="min-h-screen">
      {/* 데스크탑 사이드바 (≥lg) */}
      <aside
        className="
          hidden lg:flex
          fixed left-0 top-0 bottom-0 z-40
          w-64
          flex-col
          bg-white border-r border-slate-100
          px-5 py-8
        "
        aria-label="사이드 네비게이션"
      >
        <SidebarContents />
      </aside>

      {/* 모바일/태블릿 상단 바 (< lg) */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100">
        <div className="flex items-center justify-between px-5 py-3 pt-safe">
          <Link href="/" aria-label="홈으로 이동" onClick={closeDrawer}>
            <Logo size="sm" />
          </Link>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="메뉴 열기"
            className="grid place-items-center w-10 h-10 rounded-full hover:bg-slate-100 active:scale-95 transition"
          >
            <MenuIcon className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </header>

      {/* 모바일 드로어 */}
      {drawerOpen && (
        <>
          <button
            aria-label="메뉴 닫기"
            onClick={closeDrawer}
            className="lg:hidden fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm animate-fade-in"
          />
          <aside
            className="
              lg:hidden fixed top-0 bottom-0 left-0 z-50
              w-72 max-w-[85vw]
              flex flex-col
              bg-white shadow-2xl
              px-5 py-8 pt-safe
              animate-fade-in-up
            "
            aria-label="모바일 네비게이션"
          >
            <button
              onClick={closeDrawer}
              aria-label="메뉴 닫기"
              className="self-end mb-2 grid place-items-center w-10 h-10 rounded-full hover:bg-slate-100 active:scale-95 transition"
            >
              <CloseIcon className="w-5 h-5 text-slate-700" />
            </button>
            <SidebarContents onNavigate={closeDrawer} />
          </aside>
        </>
      )}

      {/* 콘텐츠 영역 */}
      <main className="lg:pl-64">
        <div className="min-h-[calc(100vh-56px)] lg:min-h-screen px-5 lg:px-10 py-6 lg:py-10 pb-safe">
          {children}
        </div>
      </main>
    </div>
  );
}
