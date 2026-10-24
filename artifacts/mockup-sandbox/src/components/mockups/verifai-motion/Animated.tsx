import type { ComponentProps } from 'react';
import { useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Check, X } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import './_group.css';
import './Animated.css';
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

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

export function Animated() {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [idea, setIdea] = useState('');
  const [showNote, setShowNote] = useState(false);
  const { scrollYProgress } = useScroll();
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const progressScale = useSpringlessScale(scrollYProgress, reduceMotion);
  const posterY = useTransform(heroProgress, [0, 1], [0, reduceMotion ? 0 : -34]);
  const posterRotate = useTransform(heroProgress, [0, 1], [2, reduceMotion ? 2 : -1]);
  const accessibleReveal: Variants = reduceMotion ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } } : reveal;
  const accessibleStagger: Variants = reduceMotion ? { hidden: {}, visible: {} } : stagger;
  const closeDialog = () => setDialogOpen(false);

  return <main className="app-shell verifai-motion" id="top">
    <motion.div className="page-progress" aria-hidden="true" style={{ scaleX: progressScale }} />
    <motion.header className="landing-nav" initial={reduceMotion ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
      <Brand href="#top" />
      <nav className="nav-links" aria-label="Main navigation">
        <a className="hide-mobile" href="#how-it-works">How it works</a>
        <a className="hide-mobile" href="#principles">Our principles</a>
        <button className="btn btn-dark" type="button" onClick={() => { setDialogOpen(true); setShowNote(false); }}>Start with an idea <ArrowRight size={15} /></button>
      </nav>
    </motion.header>
    <section className="hero" ref={heroRef}>
      <div className="hero-grid">
        <motion.div variants={accessibleStagger} initial="hidden" animate="visible">
          <motion.div className="eyebrow" variants={accessibleReveal}>A clearer first step for Indian founders</motion.div>
          <motion.h1 variants={accessibleReveal}>Before you build, <em>get real.</em></motion.h1>
          <motion.p className="hero-copy" variants={accessibleReveal}>A good idea deserves more than a yes. Pressure-test the problem, the people and the path forward — then decide what to do next.</motion.p>
          <motion.div className="hero-actions" variants={accessibleReveal}>
            <button type="button" className="btn btn-primary" onClick={() => { setDialogOpen(true); setShowNote(false); }}>Validate your idea <ArrowUpRight size={16} /></button>
            <a href="#how-it-works" className="btn btn-light">See how it works</a>
          </motion.div>
          <motion.div className="hero-note" variants={accessibleReveal}>MADE FOR THE MESSY MIDDLE · INDIA-FIRST CONTEXT</motion.div>
        </motion.div>
        <motion.div className="poster" aria-label="Vintage computer illustration" style={{ y: posterY, rotate: posterRotate }} initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}>
          <div className="poster-top"><span>VERIFAI / FIELD NOTES</span><span>01—03</span></div>
          <div className="poster-title">Less pitch.<span>More proof.</span></div>
          <motion.div className="computer" animate={reduceMotion ? undefined : { y: [0, -5, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}><div className="computer-screen">IDEA IN<br />EVIDENCE OUT<span className="cursor">_</span></div><div className="computer-base" /></motion.div>
          <motion.div className="poster-sticker" animate={reduceMotion ? undefined : { rotate: [12, 15, 12] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}>BUILD<br />PIVOT<br />PAUSE</motion.div>
        </motion.div>
      </div>
    </section>
    <motion.section className="section" id="how-it-works" variants={accessibleReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
      <div className="section-inner">
        <div className="section-heading"><div className="eyebrow">A useful kind of honesty</div><h2>Turn the idea into a <em>decision.</em></h2><p>VerifAI helps you see what is known, what is still a guess, and what small experiment could reduce the uncertainty.</p></div>
        <motion.div className="steps-grid" variants={accessibleStagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }}>
          <motion.article className="step" variants={accessibleReveal}><div className="step-num">01 / START WITH THE REAL THING</div><h3>Put the idea on paper</h3><p>Describe the problem in your own words. Add who feels it and where. Rough notes are welcome.</p></motion.article>
          <motion.article className="step" variants={accessibleReveal}><div className="step-num">02 / FILL THE GAPS</div><h3>Answer only what matters</h3><p>A short, staged set of questions makes assumptions visible without asking you to fake certainty.</p></motion.article>
          <motion.article className="step" variants={accessibleReveal}><div className="step-num">03 / CHOOSE YOUR MOVE</div><h3>Read the evidence, not hype</h3><p>Get a scoped snapshot of strengths, open questions and next steps. Build, pivot or pause with context.</p></motion.article>
        </motion.div>
      </div>
    </motion.section>
    <motion.section className="principle-band" variants={accessibleReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}><div className="principle-inner"><h2>“Not sure yet” is a useful answer.</h2><p>VerifAI distinguishes evidence from assumptions. It will not treat a confident guess as a customer interview.</p></div></motion.section>
    <motion.section className="section" id="principles" variants={accessibleReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
      <div className="section-inner three-columns">
        <div className="manifesto">Grounded beats <span>glowing.</span></div>
        <motion.ul className="plain-list" variants={accessibleStagger} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
          <motion.li variants={accessibleReveal}><Check size={16} /><span><strong>Clear scope.</strong> A free snapshot says what it can and cannot tell you.</span></motion.li>
          <motion.li variants={accessibleReveal}><Check size={16} /><span><strong>India by default.</strong> INR and local market context are part of the starting point.</span></motion.li>
          <motion.li variants={accessibleReveal}><Check size={16} /><span><strong>No certainty theatre.</strong> Scores guide investigation; they do not predict success.</span></motion.li>
        </motion.ul>
      </div>
    </motion.section>
    <motion.section className="section final-cta-section" style={{ paddingTop: 0 }} variants={accessibleReveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }}>
      <div className="section-inner panel final-cta-panel">
        <div><div className="eyebrow">Your next move is yours</div><h2 className="font-display final-cta-title">Start with the question you care about.</h2><p className="muted" style={{margin:0}}>No pitch deck needed. Just your best current understanding.</p></div>
        <button type="button" className="btn btn-primary" onClick={() => { setDialogOpen(true); setShowNote(false); }}>Open your workspace <ArrowRight size={15}/></button>
      </div>
    </motion.section>
    <footer className="footer"><Brand light href="#top" /><span>Make the next step a considered one.</span><span>India · INR</span></footer>
    {dialogOpen && <div className="idea-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <section className="idea-dialog" role="dialog" aria-modal="true" aria-labelledby="idea-dialog-title" onKeyDown={(event) => { if (event.key === 'Escape') closeDialog(); }}>
        <button className="idea-dialog-close" type="button" aria-label="Close idea preview" onClick={closeDialog}><X size={18} /></button>
        <div className="eyebrow">A small first step</div>
        <h2 id="idea-dialog-title">What problem are you thinking about?</h2>
        <p>This is a UI preview. Your note stays in this browser session; it will not be submitted or saved to VerifAI.</p>
        <form onSubmit={(event) => { event.preventDefault(); setShowNote(true); }}>
          <label className="idea-dialog-label" htmlFor="prototype-idea">Your rough idea</label>
          <textarea id="prototype-idea" value={idea} onChange={(event) => { setIdea(event.target.value); setShowNote(false); }} autoFocus placeholder="A problem I keep noticing is…" />
          <div className="idea-dialog-actions">
            <span>Rough notes are welcome.</span>
            <button className="btn btn-primary" type="submit" disabled={!idea.trim()}>Keep this note <ArrowRight size={15} /></button>
          </div>
          {showNote && <p className="idea-dialog-confirmation" role="status">Note held for this preview only. No account or submission was created.</p>}
        </form>
      </section>
    </div>}
  </main>;
}

function useSpringlessScale(progress: ReturnType<typeof useScroll>['scrollYProgress'], reduceMotion: boolean | null) {
  return useTransform(progress, [0, 1], [0, reduceMotion ? 0 : 1]);
}
