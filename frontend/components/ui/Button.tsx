import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-[0.005em] transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-50 select-none whitespace-nowrap';
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-deep hover:text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line-strong hover:bg-sunken hover:text-ink',
  ghost: 'text-brand hover:bg-sunken hover:text-brand-deep',
  danger: 'bg-danger text-white hover:brightness-90 hover:text-white',
  light: 'bg-surface text-brand-deep hover:bg-surface hover:text-brand-deep',
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[0.9375rem]',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, `${className} no-underline`)}>
      {icon}
      {children}
    </Link>
  );
}
