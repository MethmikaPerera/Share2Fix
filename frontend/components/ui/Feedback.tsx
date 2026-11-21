import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2.5 py-16 text-ink-soft">
      <Loader2 className="h-4 w-4 animate-spin text-brand" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      <span className="mb-5 h-px w-10 bg-brass" aria-hidden />
      <h3 className="font-serif text-xl">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

type AlertTone = 'error' | 'warning' | 'success' | 'info';
const alertStyles: Record<AlertTone, string> = {
  error: 'border-danger bg-danger-tint text-danger',
  warning: 'border-brass bg-brass-tint text-brass-ink',
  success: 'border-brand bg-brand-tint text-brand-deep',
  info: 'border-line-strong bg-surface text-ink-soft',
};
const alertIcons = { error: AlertTriangle, warning: AlertTriangle, success: CheckCircle2, info: Info };

export function Alert({ tone = 'info', title, children }: { tone?: AlertTone; title?: string; children?: ReactNode }) {
  const Icon = alertIcons[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-md border-l-[3px] px-3.5 py-3 text-sm ${alertStyles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-card border border-danger/30 bg-danger-tint px-6 py-8 text-center">
      <AlertTriangle className="mx-auto mb-2 h-5 w-5 text-danger" aria-hidden />
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-semibold text-danger underline underline-offset-4">
          Try again
        </button>
      )}
    </div>
  );
}
