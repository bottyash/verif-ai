import { Link } from 'wouter';

type Tone = 'dark' | 'light';

/**
 * The VerifAI mark: a heavy left stroke and a hairline right stroke that stop
 * short of each other at the base, closed by a coral dot. One SVG, used everywhere.
 */
export function BrandMark({ tone = 'dark', size = 28, className = '' }: { tone?: Tone; size?: number; className?: string }) {
  const ink = tone === 'light' ? '#f7f0e3' : '#1f1d19';
  return (
    <svg
      className={`brand-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 9h15.5l17.2 45H20.2L3 9Z" fill={ink} />
      <path d="M38.6 54 54.8 9h3.6L42.2 54h-3.6Z" fill={ink} />
      <circle cx="56.5" cy="49.5" r="5" fill="#e0644e" />
    </svg>
  );
}

export function Brand({ light = false, href = '/' }: { light?: boolean; href?: string }) {
  return (
    <Link href={href} className={`brand ${light ? 'brand-light' : ''}`} data-testid="link-brand" aria-label="VerifAI home">
      <BrandMark tone={light ? 'light' : 'dark'} />
      <span className="brand-word">verifai</span>
    </Link>
  );
}
