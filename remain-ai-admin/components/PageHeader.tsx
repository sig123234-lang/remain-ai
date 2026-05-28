import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-[26px] sm:text-[30px] font-semibold text-slate-900 dark:text-slate-100 tracking-tight leading-tight word-keep-all">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[14px] sm:text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed word-keep-all">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
