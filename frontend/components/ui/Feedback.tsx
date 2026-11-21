import { AlertTriangle, CheckCircle2, Inbox, Info, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function Spinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-forest-muted">
      <Loader2 className="h-5 w-5 animate-spin text-teal" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-white px-6 py-12 text-center">
      <span className="mb-3 rounded-full bg-pale p-3 text-teal">
        <Inbox className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="text-base">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-forest-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type AlertTone = 'error' | 'warning' | 'success' | 'info';
const alertStyles: Record<AlertTone, string> = {
  error: 'border-danger/30 bg-danger-soft text-danger',
  warning: 'border-amber bg-amber-soft text-amber-ink',
  success: 'border-turquoise/40 bg-pale text-teal-dark',
  info: 'border-line bg-white text-forest-muted',
};
const alertIcons = { error: AlertTriangle, warning: AlertTriangle, success: CheckCircle2, info: Info };

export function Alert({ tone = 'info', title, children }: { tone?: AlertTone; title?: string; children?: ReactNode }) {
  const Icon = alertIcons[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-lg border p-3 text-sm ${alertStyles[tone]}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-card border border-danger/30 bg-danger-soft p-6 text-center">
      <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-danger" aria-hidden />
      <p className="text-sm font-medium text-danger">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm font-semibold text-danger underline">
          Try again
        </button>
      )}
    </div>
  );
}
