import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line bg-surface shadow-card ${className}`} {...rest} />;
}

export function CardHeader({ title, action, icon }: { title: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <h2 className="flex items-center gap-2.5 font-serif text-[1.0625rem] font-medium">
        {icon && <span className="text-ink-faint [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line pb-6 sm:mb-10">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
        <h1 className="text-[2rem] leading-[1.1] sm:text-[2.5rem]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Joined strip of figures. Children should be <StatCard/>. */
export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 3 | 4 }) {
  return (
    <div
      className={`grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line shadow-card ${
        cols === 3 ? 'sm:grid-cols-3' : 'lg:grid-cols-4'
      }`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className="relative bg-surface px-5 py-5">
      {tone === 'warn' && <span className="absolute inset-y-0 left-0 w-[3px] bg-brass" aria-hidden />}
      <div className="flex items-start justify-between gap-2">
        <p className="eyebrow !tracking-[0.1em]">{label}</p>
        {icon && <span className={`${tone === 'warn' ? 'text-brass-ink' : 'text-ink-faint'} [&>svg]:h-4 [&>svg]:w-4`}>{icon}</span>}
      </div>
      <p className={`mt-3 font-serif text-[2.25rem] font-medium leading-none tabular-nums ${tone === 'warn' ? 'text-brass-ink' : 'text-ink'}`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
