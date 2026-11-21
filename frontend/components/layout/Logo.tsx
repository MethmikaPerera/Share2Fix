import Link from 'next/link';

export function LogoMark({ className = 'h-8 w-8', inverted = false }: { className?: string; inverted?: boolean }) {
  const bg = inverted ? '#fdfcf9' : '#0b5d59';
  const fg = inverted ? '#0b5d59' : '#fdfcf9';
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill={bg} />
      <path
        d="M16 6.5a6.75 6.75 0 0 0-6.75 6.75c0 4.9 6.75 12.25 6.75 12.25s6.75-7.35 6.75-12.25A6.75 6.75 0 0 0 16 6.5Z"
        fill="none"
        stroke={fg}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="m12.9 13.4 2.2 2.2 4-4.2" fill="none" stroke={fg} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ light = false, className = 'text-[1.375rem]' }: { light?: boolean; className?: string }) {
  return (
    <span className={`font-serif font-medium leading-none tracking-tight ${light ? 'text-surface' : 'text-ink'} ${className}`}>
      Share<span className={`italic ${light ? 'text-[#d9b768]' : 'text-brass'}`}>2</span>Fix
    </span>
  );
}

export function Logo({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 no-underline" aria-label="Share2Fix home">
      <LogoMark inverted={light} />
      <Wordmark light={light} />
    </Link>
  );
}
