import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-card border border-line bg-white shadow-card ${className}`} {...rest} />;
}

export function CardHeader({ title, action, icon }: { title: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
      <h2 className="flex items-center gap-2 text-base">
        {icon && <span className="text-turquoise">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-forest-muted">{description}</p>}
      </div>
      {action}
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
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-forest-muted">{label}</p>
        {icon && (
          <span className={`rounded-lg p-1.5 ${tone === 'warn' ? 'bg-amber-soft text-amber-ink' : 'bg-pale text-teal'}`}>{icon}</span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums text-forest">{value}</p>
      {hint && <p className="mt-1 text-xs text-forest-muted">{hint}</p>}
    </Card>
  );
}
