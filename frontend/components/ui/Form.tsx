import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

const control =
  'w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-faint transition-[border-color,box-shadow] duration-150 hover:border-ink-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-faint';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[0.8125rem] font-semibold text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-faint">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} h-10 ${className}`} {...rest} />;
}

export function Textarea({ className = '', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${control} min-h-24 py-2.5 leading-relaxed ${className}`} {...rest} />;
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${control} h-10 ${className}`} {...rest}>
      {children}
    </select>
  );
}
