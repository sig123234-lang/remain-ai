import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`
        rounded-2xl
        bg-white dark:bg-slate-900
        ring-1 ring-slate-100 dark:ring-slate-800
        shadow-[0_1px_3px_-1px_rgba(15,23,42,0.04)] dark:shadow-[0_1px_3px_-1px_rgba(0,0,0,0.4)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
      <div>
        <h3 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 tracking-tight ">{title}</h3>
        {description && <p className="mt-0.5 text-[12px] text-slate-400 dark:text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'critical' | 'warning' | 'success' | 'info';
}) {
  const toneClass = {
    default:  'text-slate-900 dark:text-slate-100',
    critical: 'text-red-600 dark:text-red-400',
    warning:  'text-amber-600 dark:text-amber-400',
    success:  'text-emerald-600 dark:text-emerald-400',
    info:     'text-blue-600 dark:text-blue-400',
  }[tone];

  return (
    <Card className="px-5 py-5">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 font-semibold">
        {label}
      </div>
      <div className={`mt-2 text-[28px] sm:text-[32px] font-bold tracking-tight tabular-nums ${toneClass}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[12px] text-slate-400 dark:text-slate-500">{hint}</div>}
    </Card>
  );
}

export function StatusDot({ tone = 'default' }: { tone?: 'default' | 'critical' | 'warning' | 'success' | 'info' | 'muted' }) {
  const cls = {
    default:  'bg-slate-300 dark:bg-slate-600',
    muted:    'bg-slate-300 dark:bg-slate-600',
    critical: 'bg-red-500',
    warning:  'bg-amber-500',
    success:  'bg-emerald-500',
    info:     'bg-blue-500',
  }[tone];
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls}`} aria-hidden />;
}

export function Pill({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: 'default' | 'critical' | 'warning' | 'success' | 'info';
}) {
  const cls = {
    default:  'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700',
    critical: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900/60',
    warning:  'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60',
    success:  'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60',
    info:     'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/60',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${cls}`}>
      {children}
    </span>
  );
}

export function EmptyState({ icon, title, hint }: { icon?: ReactNode; title: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 ring-1 ring-slate-100/60 dark:ring-slate-800/60 py-10 px-6 text-center">
      {icon && (
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-white dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800 mb-3 text-slate-300 dark:text-slate-600">
          {icon}
        </div>
      )}
      <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">{title}</p>
      {hint && <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}
