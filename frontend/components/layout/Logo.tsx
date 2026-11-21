import Link from 'next/link';

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#25BDB5" />
      <path
        d="M16 5.5a7.5 7.5 0 0 0-7.5 7.5c0 5.4 7.5 13.5 7.5 13.5s7.5-8.1 7.5-13.5A7.5 7.5 0 0 0 16 5.5Z"
        fill="#FFFFFF"
      />
      <path d="m12.6 13 2.5 2.5 4.4-4.6" fill="none" stroke="#087F78" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2 no-underline" aria-label="Share2Fix home">
      <LogoMark />
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-forest'}`}>Share2Fix</span>
    </Link>
  );
}
