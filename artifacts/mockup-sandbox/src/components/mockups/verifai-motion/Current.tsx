import type { ComponentProps } from 'react';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import './_group.css';
const Link = (props: ComponentProps<'a'>) => <a {...props} />;


type Tone = 'dark' | 'light';

/**
 * The VerifAI mark: a heavy left stroke and a hairline right stroke that stop
 * short of each other at the base, closed by a coral dot. One SVG, used everywhere.
 */
function BrandMark({ tone = 'dark', size = 28, className = '' }: { tone?: Tone; size?: number; className?: string }) {
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

function Brand({ light = false, href = '/' }: { light?: boolean; href?: string }) {
  return (
    <Link href={href} className={`brand ${light ? 'brand-light' : ''}`} data-testid="link-brand" aria-label="VerifAI home">
      <BrandMark tone={light ? 'light' : 'dark'} />
      <span className="brand-word">verifai</span>
    </Link>
  );
}

export function Current() {
  return <main className="app-shell">
    <header className="landing-nav">
      <Brand />
      <nav className="nav-links">
        <a className="hide-mobile" href="#how-it-works">How it works</a>
        <Link href="/sign-in" className="hide-mobile" data-testid="link-signin-nav">Sign in</Link>
        <Link href="/sign-up" className="btn btn-dark" data-testid="link-start">Start with an idea <ArrowRight size={15} /></Link>
      </nav>
    </header>
    <section className="hero">
      <div className="hero-grid">
        <div>
          <div className="eyebrow">A clearer first step for Indian founders</div>
          <h1>Before you build, <em>get real.</em></h1>
          <p className="hero-copy">A good idea deserves more than a yes. Pressure-test the problem, the people and the path forward — then decide what to do next.</p>
          <div className="hero-actions">
            <Link href="/sign-up" className="btn btn-primary" data-testid="link-validate-idea">Validate your idea <ArrowUpRight size={16} /></Link>
            <a href="#how-it-works" className="btn btn-light">See how it works</a>
          </div>
          <div className="hero-note">MADE FOR THE MESSY MIDDLE · INDIA-FIRST CONTEXT</div>
        </div>
        <div className="poster" aria-label="Vintage computer illustration">
          <div className="poster-top"><span>VERIFAI / FIELD NOTES</span><span>01—03</span></div>
          <div className="poster-title">Less pitch.<span>More proof.</span></div>
          <div className="computer"><div className="computer-screen">IDEA IN<br />EVIDENCE OUT<span className="cursor">_</span></div><div className="computer-base" /></div>
          <div className="poster-sticker">BUILD<br />PIVOT<br />PAUSE</div>
        </div>
      </div>
    </section>
    <section className="section" id="how-it-works">
      <div className="section-inner">
        <div className="section-heading"><div className="eyebrow">A useful kind of honesty</div><h2>Turn the idea into a <em>decision.</em></h2><p>VerifAI helps you see what is known, what is still a guess, and what small experiment could reduce the uncertainty.</p></div>
        <div className="steps-grid">
          <article className="step"><div className="step-num">01 / START WITH THE REAL THING</div><h3>Put the idea on paper</h3><p>Describe the problem in your own words. Add who feels it and where. Rough notes are welcome.</p></article>
          <article className="step"><div className="step-num">02 / FILL THE GAPS</div><h3>Answer only what matters</h3><p>A short, staged set of questions makes assumptions visible without asking you to fake certainty.</p></article>
          <article className="step"><div className="step-num">03 / CHOOSE YOUR MOVE</div><h3>Read the evidence, not hype</h3><p>Get a scoped snapshot of strengths, open questions and next steps. Build, pivot or pause with context.</p></article>
        </div>
      </div>
    </section>
    <section className="principle-band"><div className="principle-inner"><h2>“Not sure yet” is a useful answer.</h2><p>VerifAI distinguishes evidence from assumptions. It will not treat a confident guess as a customer interview.</p></div></section>
    <section className="section">
      <div className="section-inner three-columns">
        <div className="manifesto">Grounded beats <span>glowing.</span></div>
        <ul className="plain-list">
          <li><Check size={16} /><span><strong>Clear scope.</strong> A free snapshot says what it can and cannot tell you.</span></li>
          <li><Check size={16} /><span><strong>India by default.</strong> INR and local market context are part of the starting point.</span></li>
          <li><Check size={16} /><span><strong>No certainty theatre.</strong> Scores guide investigation; they do not predict success.</span></li>
        </ul>
      </div>
    </section>
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="section-inner panel" style={{ display:'flex',justifyContent:'space-between',alignItems:'center',gap:24 }}>
        <div><div className="eyebrow">Your next move is yours</div><h2 className="font-display" style={{fontSize:'clamp(28px,4vw,42px)',letterSpacing:'-.06em',margin:'12px 0 8px'}}>Start with the question you care about.</h2><p className="muted" style={{margin:0}}>No pitch deck needed. Just your best current understanding.</p></div>
        <Link href="/sign-up" className="btn btn-primary" data-testid="link-final-cta">Open your workspace <ArrowRight size={15}/></Link>
      </div>
    </section>
    <footer className="footer"><Brand light /><span>Make the next step a considered one.</span><span>India · INR</span></footer>
  </main>;
}
