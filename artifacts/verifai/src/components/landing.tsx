import { useRef } from 'react';
import { Link } from 'wouter';
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react';
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion';
import { Brand } from './brand';
import './landing-motion.css';

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.68, ease: [0.22, 1, 0.36, 1] } },
};
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
};

export function Landing() {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll();
  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const progressScale = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 1]);
  const posterY = useTransform(heroProgress, [0, 1], [0, reduceMotion ? 0 : -34]);
  const posterRotate = useTransform(heroProgress, [0, 1], [2, reduceMotion ? 2 : -1]);
  const accessibleReveal: Variants = reduceMotion ? { hidden: { opacity: 1, y: 0 }, visible: { opacity: 1, y: 0 } } : reveal;
  const accessibleStagger: Variants = reduceMotion ? { hidden: {}, visible: {} } : stagger;

  return <main className="app-shell verifai-motion" id="top">
    <motion.div className="page-progress" aria-hidden="true" style={{ scaleX: progressScale }} />
    <motion.header className="landing-nav" initial={reduceMotion ? false : { opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
      <Brand href="#top" />
      <nav className="nav-links" aria-label="Main navigation">
        <a className="hide-mobile" href="#how-it-works">How it works</a>
        <Link href="/sign-in" className="hide-mobile" data-testid="link-signin-nav">Sign in</Link>
        <Link href="/sign-up" className="btn btn-dark" data-testid="link-start">Start with an idea <ArrowRight size={15} /></Link>
      </nav>
    </motion.header>
    <section className="hero" ref={heroRef}>
      <div className="hero-grid">
        <motion.div variants={accessibleStagger} initial="hidden" animate="visible">
          <motion.div className="eyebrow" variants={accessibleReveal}>A clearer first step for Indian founders</motion.div>
          <motion.h1 variants={accessibleReveal}>Before you build, <em>get real.</em></motion.h1>
          <motion.p className="hero-copy" variants={accessibleReveal}>A good idea deserves more than a yes. Pressure-test the problem, the people and the path forward — then decide what to do next.</motion.p>
          <motion.div className="hero-actions" variants={accessibleReveal}>
            <Link href="/sign-up" className="btn btn-primary" data-testid="link-validate-idea">Validate your idea <ArrowUpRight size={16} /></Link>
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
        <Link href="/sign-up" className="btn btn-primary" data-testid="link-final-cta">Open your workspace <ArrowRight size={15}/></Link>
      </div>
    </motion.section>
    <footer className="footer"><Brand light href="#top" /><span>Make the next step a considered one.</span><span>India · INR</span></footer>
  </main>;
}
