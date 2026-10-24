import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronRight,
  CircleHelp, Compass, FileText, Layers3, Lightbulb, LockKeyhole,
  MessageCircle, Plus, RotateCw, UserRound, LogOut, Send, Users,
  MousePointerClick, ShieldAlert, ServerCrash, X,
} from 'lucide-react';
import {
  ClerkProvider,
  Show,
  SignIn,
  SignUp,
  useClerk,
  useUser,
} from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import {
  getGetVerifaiDashboardQueryKey,
  getGetVerifaiIdeaQueryKey,
  getGetVerifaiMessagesQueryKey,
  getGetVerifaiReportQueryKey,
  getGetVerifaiAdminReportQueryKey,
  getListVerifaiIdeasQueryKey,
  useCreateVerifaiIdea,
  useGenerateVerifaiQuestions,
  useGetVerifaiDashboard,
  useGetVerifaiAdminOverview,
  useGetVerifaiAdminReports,
  useGetVerifaiAdminReport,
  useGetVerifaiIdea,
  useGetVerifaiMessages,
  useGetVerifaiReport,
  useListVerifaiIdeas,
  useRunVerifaiAnalysis,
  useSaveVerifaiAnswers,
  useSendVerifaiMessage,
  useDemoUnlockVerifaiReport,
  useTrackVerifaiUnlockClick,
} from '@workspace/api-client-react';
import { Link, Redirect, Route, Router as WouterRouter, Switch, useLocation, useParams } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY.');
}

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: '#d45f4a',
    colorForeground: '#28231f',
    colorMutedForeground: '#726b63',
    colorDanger: '#a6362e',
    colorBackground: '#fffdf7',
    colorInput: '#fffdf7',
    colorInputForeground: '#28231f',
    colorNeutral: '#d8cbbb',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '12px',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fffdf7] rounded-2xl w-[440px] max-w-full overflow-hidden border border-[#ded5c7]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-display text-2xl text-[#28231f]',
    headerSubtitle: 'text-[#726b63]',
    socialButtonsBlockButtonText: 'text-[#28231f]',
    formFieldLabel: 'text-[#28231f]',
    footerActionLink: 'text-[#d45f4a]',
    footerActionText: 'text-[#726b63]',
    dividerText: 'text-[#726b63]',
    identityPreviewEditButton: 'text-[#d45f4a]',
    formFieldSuccessText: 'text-[#2f6c52]',
    alertText: 'text-[#a6362e]',
    logoBox: 'rounded-xl',
    logoImage: 'rounded-xl',
    socialButtonsBlockButton: 'border-[#d8cbbb] bg-[#fffdf7] hover:bg-[#f5eee3]',
    formButtonPrimary: 'bg-[#d45f4a] hover:bg-[#bf4e3a] text-white',
    formFieldInput: 'bg-[#fffdf7] text-[#28231f] border-[#d8cbbb]',
    footerAction: 'text-[#726b63]',
    dividerLine: 'bg-[#d8cbbb]',
    alert: 'border-[#d8cbbb]',
    otpCodeFieldInput: 'border-[#d8cbbb] text-[#28231f]',
    formFieldRow: 'text-[#28231f]',
    main: 'text-[#28231f]',
  },
};

function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className={`brand ${light ? 'brand-light' : ''}`} data-testid="link-brand"><span className="brand-mark">v.</span><span>verifai</span></Link>;
}

function Landing() {
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
        <div className="section-heading"><div className="eyebrow">A useful kind of honesty</div><h2>Turn the idea into a decision.</h2><p>VerifAI helps you see what is known, what is still a guess, and what small experiment could reduce the uncertainty.</p></div>
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

function Shell({ children, title = 'Workspace' }: { children: ReactNode; title?: string }) {
  const [location] = useLocation();
  return <div className="workspace">
    <aside className="sidebar">
      <Brand light />
      <div>
        <div className="sidebar-label">Workspace</div>
        <nav>
          <Link href="/dashboard" className={`side-link ${location === '/dashboard' ? 'active' : ''}`} data-testid="link-dashboard"><Compass size={17}/><span>Overview</span></Link>
          <Link href="/new" className={`side-link ${location === '/new' ? 'active' : ''}`} data-testid="link-new-idea"><Plus size={17}/><span>New idea</span></Link>
          <Link href="/admin" className={`side-link ${location === '/admin' ? 'active' : ''}`} data-testid="link-admin-sidebar"><Users size={17}/><span>Admin</span></Link>
        </nav>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-label">Your account</div>
        <Link href="/account" className={`side-link ${location === '/account' ? 'active' : ''}`} data-testid="link-account"><UserRound size={17}/><span>Profile</span></Link>
        <Link href="/" className="side-link" data-testid="link-home"><ArrowLeft size={17}/><span>Back to VerifAI</span></Link>
      </div>
    </aside>
    <div className="workspace-main">
      <header className="topbar"><div className="crumb"><span className="mobile-only">VERIFAI / </span>{title.toUpperCase()}</div><div className="topbar-right"><Link href="/admin" className="admin-top-link" data-testid="link-admin-topbar">Admin</Link><span>India · INR</span><Link href="/account" aria-label="Account" className="avatar" data-testid="link-avatar">F</Link></div></header>
      {children}
    </div>
  </div>;
}

function LoadingPage() {
  return <div className="page"><div className="skeleton" style={{height:13,width:150,marginBottom:22}}/><div className="skeleton" style={{height:46,width:'50%',marginBottom:18}}/><div className="skeleton" style={{height:90,marginBottom:32}}/><div className="loading-stack">{[1,2,3].map((n)=><div className="skeleton" key={n} style={{height:84}}/>)}</div></div>;
}

function SnapshotReadout({ snapshot, prefix = 'snapshot' }: { snapshot: any; prefix?: string }) {
  const value = (item: unknown) => item == null || item === '' ? 'Needs validation' : String(item);
  const groups = [
    { title: 'Market shape', items: [['Total addressable market', snapshot.market?.tam], ['Serviceable market', snapshot.market?.sam], ['Obtainable market', snapshot.market?.som], ['Growth rate', snapshot.market?.cagr], ['Market stage', snapshot.market?.stage]] },
    { title: 'Who it may serve', items: [['Primary segment', snapshot.audience?.primarySegment], ['Age group', snapshot.audience?.ageGroup], ['Reachable users', snapshot.audience?.estimatedReachableUsers], ['Top region', snapshot.audience?.topRegion]] },
    { title: 'Financial signals', items: [['Startup cost range', snapshot.financialSignals?.startupCostRange], ['Break-even timeline', snapshot.financialSignals?.breakEvenTimeline], ['ROI rating', snapshot.financialSignals?.roiRating]] },
  ];
  const ratings = [
    ['Technical feasibility', snapshot.quickRatings?.technicalFeasibility],
    ['Competition pressure', snapshot.quickRatings?.competitionPressure],
    ['Legal complexity', snapshot.quickRatings?.legalComplexity],
    ['Go-to-market difficulty', snapshot.quickRatings?.goToMarketDifficulty],
  ] as const;
  return <section className="snapshot-readout" data-testid={`${prefix}-headline-snapshot`}>
    <div className="snapshot-section-heading"><div><div className="question-count">Headline snapshot</div><h2>What the current inputs suggest</h2></div><span className="muted">Directional, not market research</span></div>
    <div className="snapshot-readout-groups">{groups.map((group)=><article className="snapshot-readout-group" key={group.title}>
      <h3>{group.title}</h3><dl>{group.items.map(([label, item])=><div key={label}><dt>{label}</dt><dd>{value(item)}</dd></div>)}</dl>
    </article>)}</div>
    <article className="snapshot-readout-group quick-ratings"><h3>Quick ratings <span>1–5 · higher means more of the named quality or challenge</span></h3>
      <div className="rating-list">{ratings.map(([label, rating])=><div className="rating-row" key={label}><span>{label}</span><strong>{rating == null ? 'Needs validation' : `${rating} / 5`}</strong></div>)}</div>
    </article>
    <div className="teaser-strip" aria-label="Locked report details">
      <div><strong>{snapshot.teasers?.criticalRiskCount ?? '—'}</strong><span>critical risks to review</span></div>
      <div><strong>{snapshot.teasers?.competitorReviewCount ?? '—'}</strong><span>competitor notes</span></div>
      <div><strong>{snapshot.teasers?.legalReviewCount ?? '—'}</strong><span>legal checks</span></div>
      <div><strong>{snapshot.teasers?.fundingReadinessAvailable ? 'Available' : 'Not included'}</strong><span>funding readiness</span></div>
    </div>
  </section>;
}

function DetailList({ title, items }: { title: string; items?: string[] | null }) {
  return <section className="paid-detail-card"><h3>{title}</h3>{items?.length ? <ul>{items.map((item, index)=><li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="muted">No detail was included for this area.</p>}</section>;
}

function PaidDetailsReadout({ details, history }: { details: any; history?: any[] }) {
  const categories = [
    ['Market analysis', details.marketAnalysis],
    ['Customer analysis', details.customerAnalysis],
    ['Competitor analysis', details.competitorAnalysis],
    ['Financial model', details.financialModel],
    ['Technical plan', details.technicalPlan],
    ['Go-to-market', details.goToMarket],
    ['Legal and compliance', details.legalCompliance],
  ] as const;
  const funding = details.fundingReadiness;
  const plan = details.actionPlan;
  return <div className="paid-details-readout" data-testid="paid-report-details">
    <section className="paid-breakdown">
      <div className="snapshot-section-heading"><div><div className="question-count">How the score is weighted</div><h2>Score breakdown</h2></div></div>
      {details.scoreBreakdown?.length ? <div className="breakdown-list">{details.scoreBreakdown.map((item: any)=><div className="breakdown-row" key={item.key}><div><strong>{item.title}</strong><span>{item.weightPercent}% weight</span></div><b>{item.score}<small>/100</small></b></div>)}</div> : <p className="muted">No score breakdown was included.</p>}
    </section>
    {history && <section className="score-history"><div className="snapshot-section-heading"><div><div className="question-count">Change over time</div><h2>Score history</h2></div></div>
      {history.length ? <div className="history-list">{history.map((entry,index)=><div className="history-row" key={`${entry.generatedAt}-${index}`}><strong>{entry.score}<small>/100</small></strong><time dateTime={entry.generatedAt}>{new Date(entry.generatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</time></div>)}</div> : <p className="muted">This is the first recorded score for this report.</p>}
    </section>}
    <div className="paid-category-grid">{categories.map(([title, items])=><DetailList key={title} title={title} items={items}/>)}</div>
    <section className="paid-detail-card risk-register"><h3>Risk register</h3>{details.riskRegister?.length ? <div className="risk-list">{details.riskRegister.map((item:any,index:number)=><article key={`${item.risk}-${index}`}><strong>{item.risk}</strong><div><span>Likelihood: {item.likelihood}</span><span>Impact: {item.impact}</span></div><p>{item.mitigation}</p></article>)}</div> : <p className="muted">No specific risks were listed.</p>}</section>
    {funding && <section className="funding-readiness"><div className="funding-score"><span>Funding readiness</span><strong>{funding.score}<small>/100</small></strong></div><div className="funding-content">
      <DetailList title="Potential investor fit" items={funding.investorFit}/><DetailList title="Relevant programs" items={funding.relevantPrograms}/><DetailList title="Pitch gaps" items={funding.pitchGaps}/><DetailList title="Likely investor questions" items={funding.likelyQuestions}/>
      <div className="valuation-note"><span>Valuation range</span><strong>{funding.valuationRange ?? 'Needs validation'}</strong></div>
    </div></section>}
    {plan && <section className="action-plan"><div className="snapshot-section-heading"><div><div className="question-count">A practical sequence</div><h2>Action plan</h2></div></div><div className="action-plan-grid">
      <DetailList title="This week" items={plan.thisWeek}/><DetailList title="This month" items={plan.thisMonth}/><DetailList title="This quarter" items={plan.thisQuarter}/><DetailList title="Validation experiments" items={plan.validationExperiments}/>
    </div></section>}
  </div>;
}

function AdminDashboard() {
  const [page, setPage] = useState(1);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const pageSize = 10;
  const overview = useGetVerifaiAdminOverview();
  const reports = useGetVerifaiAdminReports({ page, pageSize });
  const detail = useGetVerifaiAdminReport(selectedReportId ?? '', {
    query: {
      enabled: Boolean(selectedReportId),
      queryKey: getGetVerifaiAdminReportQueryKey(selectedReportId ?? ''),
    },
  });
  const statusOf = (error: unknown) => typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;
  const errorStatus = statusOf(overview.error) ?? statusOf(reports.error);
  const retry = () => {
    void overview.refetch();
    void reports.refetch();
  };
  const count = (value: number) => value.toLocaleString('en-IN');
  const dateTime = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? 'Time unavailable'
      : parsed.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (overview.isLoading || reports.isLoading) {
    return <Shell title="Admin"><main className="page admin-page" data-testid="admin-loading">
      <div className="admin-heading-skeleton"><div className="skeleton" style={{height:12,width:120}}/><div className="skeleton" style={{height:46,width:'52%',marginTop:17}}/><div className="skeleton" style={{height:16,width:'36%',marginTop:12}}/></div>
      <div className="admin-metric-skeletons">{[1,2,3,4,5,6].map((item)=><div className="skeleton" key={item} style={{height:118}}/>)}</div>
      <div className="skeleton" style={{height:360,marginTop:36}}/>
    </main></Shell>;
  }

  if (errorStatus === 401 || errorStatus === 403) {
    const unauthenticated = errorStatus === 401;
    return <Shell title="Admin"><main className="page admin-page">
      <section className="admin-access-state" role="alert" data-testid={unauthenticated ? 'status-admin-unauthorized' : 'status-admin-forbidden'}>
        <div className="admin-state-icon"><ShieldAlert size={22}/></div>
        <div className="eyebrow">Access response · {errorStatus}</div>
        <h1>{unauthenticated ? 'Sign in to continue.' : 'This area is not available to this account.'}</h1>
        <p>{unauthenticated ? 'The server did not accept the current session. Sign in and try the page again.' : 'The server has not granted access to this admin data. No reports or metrics are shown.'}</p>
        {unauthenticated
          ? <Link href="/sign-in" className="btn btn-primary" data-testid="link-admin-signin">Go to sign in <ArrowRight size={15}/></Link>
          : <Link href="/dashboard" className="btn btn-outline" data-testid="link-admin-return">Back to workspace <ArrowLeft size={15}/></Link>}
      </section>
    </main></Shell>;
  }

  if (errorStatus === 503) {
    return <Shell title="Admin"><main className="page admin-page">
      <section className="admin-access-state admin-error-state" role="alert" data-testid="status-admin-unavailable">
        <div className="admin-state-icon"><ServerCrash size={22}/></div>
        <div className="eyebrow">Service unavailable · 503</div>
        <h1>Admin access needs setup.</h1>
        <p>The server could not confirm administrator access. If you own this workspace, configure a verified admin email for this environment; otherwise try again later. Access stays closed until verification succeeds.</p>
        <button className="btn btn-primary" onClick={retry} data-testid="button-admin-retry"><RotateCw size={15}/> Try again</button>
      </section>
    </main></Shell>;
  }

  if (overview.isError || reports.isError || !overview.data || !reports.data) {
    return <Shell title="Admin"><main className="page admin-page">
      <section className="admin-access-state admin-error-state" role="alert" data-testid="status-admin-error">
        <div className="admin-state-icon"><ServerCrash size={22}/></div>
        <div className="eyebrow">Connection issue</div>
        <h1>Admin data could not be loaded.</h1>
        <p>The request failed without a confirmed access response. Please retry; no report contents are exposed here.</p>
        <button className="btn btn-primary" onClick={retry} data-testid="button-admin-retry"><RotateCw size={15}/> Retry requests</button>
      </section>
    </main></Shell>;
  }

  const stats = [
    { label: 'Registered users', value: count(overview.data.userCount), note: 'Accounts in VerifAI', icon: <Users size={17}/> },
    { label: 'Generated reports', value: count(overview.data.reportCount), note: 'All report snapshots', icon: <FileText size={17}/> },
    { label: 'Free-only reports', value: count(overview.data.freeOnlyReportCount), note: 'Not unlocked', icon: <LockKeyhole size={17}/> },
    { label: 'Free unlock clicks', value: count(overview.data.unlockClickCount), note: 'Opened the research question', icon: <MousePointerClick size={17}/> },
    { label: 'Free demo unlocks', value: count(overview.data.demoUnlockCount), note: 'Full access; no payment', icon: <Check size={17}/> },
    { label: 'Would pay ₹20', value: count(overview.data.payIntentYesCount), note: 'Yes responses', icon: <ArrowUpRight size={17}/> },
    { label: 'Might pay ₹20', value: count(overview.data.payIntentMaybeCount), note: 'Maybe responses', icon: <ArrowUpRight size={17}/> },
    { label: 'Would not pay ₹20', value: count(overview.data.payIntentNoCount), note: 'No responses', icon: <ArrowUpRight size={17}/> },
    { label: 'Skipped price question', value: count(overview.data.payIntentSkipCount), note: 'Chose free unlock without answering', icon: <MousePointerClick size={17}/> },
    { label: 'Yes share', value: `${overview.data.payIntentYesRate.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`, note: `${count(overview.data.payIntentAnswerCount)} answered · yes / answered`, icon: <ArrowUpRight size={17}/> },
    { label: 'Checkout attempts', value: count(overview.data.checkoutAttemptCount), note: 'Actual payment orders created', icon: <MousePointerClick size={17}/> },
    { label: 'Verified payments', value: count(overview.data.paymentCompletedCount), note: 'Paid status verified by provider', icon: <Check size={17}/> },
    { label: 'Payment conversion', value: overview.data.paymentConversionRate === null ? '—' : `${overview.data.paymentConversionRate.toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`, note: 'Verified payments / checkout attempts', icon: <ArrowUpRight size={17}/> },
  ];
  const currentPage = reports.data.page;
  const totalPages = reports.data.totalPages;

  return <Shell title="Admin"><main className="page admin-page">
    <div className="page-header admin-page-header">
      <div><div className="eyebrow">VerifAI / operations</div><h1>Signal, at a glance.</h1><p className="muted">A server-sourced view of platform activity and generated report metadata.</p></div>
      <div className="admin-live-mark"><span/> Live API data</div>
    </div>
    <section className="admin-metrics" aria-label="Platform metrics">
      {stats.map((stat, index)=><article className={`admin-metric admin-metric-${index + 1}`} key={stat.label} data-testid={`admin-metric-${index + 1}`}>
        <div className="admin-metric-top"><span>{stat.label}</span><i>{stat.icon}</i></div>
        <strong data-testid={`admin-metric-value-${index + 1}`}>{stat.value}</strong>
        <small>{stat.note}</small>
      </article>)}
    </section>
    <section className="admin-reports-section">
      <div className="admin-reports-heading">
        <div><div className="eyebrow">Report index</div><h2>Generated reports</h2><p className="muted">Metadata only. Report contents are not available in this view.</p></div>
        <div className="admin-total" data-testid="admin-report-total"><span>Records</span><strong>{count(reports.data.total)}</strong></div>
      </div>
      {reports.data.items.length === 0 ? <div className="admin-empty" data-testid="admin-reports-empty">
        <div className="admin-state-icon"><FileText size={20}/></div><h3>No generated reports yet.</h3><p>When a report is generated, its metadata will appear here.</p>
      </div> : <>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Idea</th><th>Owner</th><th>Signal</th><th>Generated</th><th>Access</th><th><span className="sr-only">Details</span></th></tr></thead>
            <tbody>{reports.data.items.map((report)=><tr key={report.id} data-testid={`admin-report-row-${report.id}`}>
              <td><div className="report-idea-cell"><strong data-testid={`admin-report-idea-${report.id}`}>{report.ideaName}</strong><span>Idea {report.ideaId}</span></div></td>
              <td><span className="report-owner" data-testid={`admin-report-owner-${report.id}`}>{report.ownerId}</span></td>
              <td><div className="report-signal"><strong data-testid={`admin-report-score-${report.id}`}>{report.score}<small>/100</small></strong><span data-testid={`admin-report-verdict-${report.id}`}>{report.verdict}</span></div></td>
              <td><time dateTime={report.generatedAt} data-testid={`admin-report-generated-${report.id}`}>{dateTime(report.generatedAt)}</time></td>
              <td><span className={`report-access ${report.isFullReport ? 'unlocked' : 'free'}`} data-testid={`admin-report-access-${report.id}`}><i/>{report.isFullReport || report.unlockedAt ? 'Unlocked' : 'Free preview'}</span></td>
              <td><button className="admin-inspect-button" onClick={()=>setSelectedReportId(report.id)} data-testid={`button-admin-open-report-${report.id}`}>Inspect <ArrowUpRight size={13}/></button></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="admin-mobile-report-list">
          {reports.data.items.map((report)=><article className="admin-report-card" key={report.id} data-testid={`admin-report-card-${report.id}`}>
            <div className="admin-card-top"><strong data-testid={`admin-report-idea-mobile-${report.id}`}>{report.ideaName}</strong><span className={`report-access ${report.isFullReport ? 'unlocked' : 'free'}`} data-testid={`admin-report-access-mobile-${report.id}`}>{report.isFullReport || report.unlockedAt ? 'Unlocked' : 'Free preview'}</span></div>
            <div className="admin-card-score"><strong>{report.score}<small>/100</small></strong><span data-testid={`admin-report-verdict-mobile-${report.id}`}>{report.verdict}</span></div>
            <div className="admin-card-meta"><span>Owner <b data-testid={`admin-report-owner-mobile-${report.id}`}>{report.ownerId}</b></span><time dateTime={report.generatedAt} data-testid={`admin-report-generated-mobile-${report.id}`}>{dateTime(report.generatedAt)}</time></div>
            <button className="admin-inspect-button admin-inspect-mobile" onClick={()=>setSelectedReportId(report.id)} data-testid={`button-admin-open-report-mobile-${report.id}`}>Inspect report <ArrowUpRight size={13}/></button>
          </article>)}
        </div>
        <nav className="admin-pagination" aria-label="Report pages" data-testid="admin-pagination">
          <span data-testid="admin-page-summary">Page {currentPage} of {totalPages} <i/> {count(reports.data.total)} reports</span>
          <div>
            <button className="btn btn-outline" onClick={()=>setPage((value)=>Math.max(1,value-1))} disabled={currentPage <= 1} data-testid="button-admin-previous"><ArrowLeft size={14}/> Previous</button>
            <button className="btn btn-outline" onClick={()=>setPage((value)=>Math.min(totalPages,value+1))} disabled={currentPage >= totalPages} data-testid="button-admin-next">Next <ArrowRight size={14}/></button>
          </div>
        </nav>
      </>}
    </section>
    {selectedReportId && <section className="admin-detail-panel" aria-live="polite" data-testid="admin-report-detail">
      <div className="admin-detail-head">
        <div><div className="eyebrow">Report detail / server response</div><h2>{detail.data?.id === selectedReportId ? detail.data.ideaName : 'Opening report detail'}</h2></div>
        <button className="admin-close-detail" onClick={()=>setSelectedReportId(null)} aria-label="Close report detail" data-testid="button-admin-close-report"><X size={17}/></button>
      </div>
      {detail.isLoading && <div className="admin-detail-loading" role="status" data-testid="status-admin-report-loading"><div className="skeleton" style={{height:80}}/><div className="skeleton" style={{height:210}}/></div>}
      {detail.isError && (() => {
        const detailStatus = statusOf(detail.error);
        const accessDenied = detailStatus === 401 || detailStatus === 403;
        const unavailable = detailStatus === 503;
        const stateId = detailStatus === 401 ? 'status-admin-report-unauthorized' : detailStatus === 403 ? 'status-admin-report-forbidden' : unavailable ? 'status-admin-report-unavailable' : 'status-admin-report-error';
        return <div className="admin-detail-error" role="alert" data-testid={stateId}>
          <strong>{accessDenied ? 'The server did not grant access to this report.' : unavailable ? 'Report detail is temporarily unavailable.' : 'Report detail could not be loaded.'}</strong>
          <p>{accessDenied ? 'No report contents are shown.' : 'Retry the request when the service is ready.'}</p>
          <button className="btn btn-outline" onClick={()=>void detail.refetch()} data-testid="button-admin-report-retry"><RotateCw size={14}/> Retry detail</button>
        </div>;
      })()}
      {detail.data && detail.data.id === selectedReportId && !detail.isError && <>
        <div className="admin-detail-overview">
          <div className="admin-detail-score"><strong data-testid="admin-detail-score">{detail.data.score}<small>/100</small></strong><span data-testid="admin-detail-verdict">{detail.data.verdict}</span></div>
          <dl>
            <div><dt>Owner</dt><dd data-testid="admin-detail-owner">{detail.data.ownerId}</dd></div>
            <div><dt>Idea ID</dt><dd data-testid="admin-detail-idea-id">{detail.data.ideaId}</dd></div>
            <div><dt>Generated</dt><dd><time dateTime={detail.data.generatedAt} data-testid="admin-detail-generated">{dateTime(detail.data.generatedAt)}</time></dd></div>
            <div><dt>Access</dt><dd data-testid="admin-detail-access">{detail.data.isFullReport || detail.data.unlockedAt ? 'Unlocked' : 'Free preview'}</dd></div>
          </dl>
        </div>
        {detail.data.headlineSnapshot
          ? <SnapshotReadout snapshot={detail.data.headlineSnapshot} prefix="admin"/>
          : <div className="legacy-report-note" data-testid="admin-legacy-snapshot">Legacy report: no headline snapshot was stored for this record.</div>}
        {detail.data.paidDetails
          ? <PaidDetailsReadout details={detail.data.paidDetails} history={detail.data.scoreHistory ?? []}/>
          : <div className="legacy-report-note" data-testid="admin-legacy-paid-details">{detail.data.isFullReport ? 'Legacy report: detailed analysis is not available for this record.' : 'No paid details are stored for this report.'}</div>}
        <section className="admin-detail-summary">
          <div className="eyebrow">Executive summary</div>
          <p data-testid="admin-detail-summary-text">{detail.data.summary}</p>
        </section>
        <section className="admin-detail-subsection">
          <div className="admin-detail-subheading"><div><div className="eyebrow">Assessment</div><h3>Six lenses, one picture.</h3></div><span data-testid="admin-detail-section-count">{detail.data.sections.length} sections</span></div>
          <div className="admin-detail-sections">
            {detail.data.sections.map((section)=><article className="admin-detail-section" key={section.key} data-testid={`admin-detail-section-${section.key}`}>
              <div className="admin-detail-section-top"><div><span>{section.key.replaceAll('_',' ')}</span><h4>{section.title}</h4></div><strong>{section.score}<small>/100</small></strong></div>
              <p>{section.summary}</p>
              {section.strengths.length > 0 && <div className="detail-list-block"><h5>Strengths</h5><ul>{section.strengths.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
              {section.improvements.length > 0 && <div className="detail-list-block"><h5>Open questions</h5><ul>{section.improvements.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
              {section.evidence.length > 0 && <div className="detail-list-block"><h5>Evidence</h5><ul>{section.evidence.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
            </article>)}
          </div>
        </section>
        <div className="admin-detail-lists">
          <section className="admin-detail-list" data-testid="admin-detail-comparisons"><div className="eyebrow">Context</div><h3>Comparisons</h3>{detail.data.comparisons.length ? <ul>{detail.data.comparisons.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="muted">No comparisons were included.</p>}</section>
          <section className="admin-detail-list" data-testid="admin-detail-next-steps"><div className="eyebrow">Forward motion</div><h3>Next steps</h3>{detail.data.nextSteps.length ? <ol>{detail.data.nextSteps.map((item,index)=><li key={`${index}-${item}`}>{item}</li>)}</ol> : <p className="muted">No next steps were included.</p>}</section>
        </div>
      </>}
    </section>}
  </main></Shell>;
}

const analysisUpdates = [
  'Giving the idea a tiny elevator pitch. No elevator music, thankfully.',
  'Checking who might pay for this before we invite imaginary VCs.',
  'Looking for a small experiment that beats a very large spreadsheet.',
  'Stress-testing the plan. The plan has been warned.',
  'Turning “this could be big” into one useful next move.',
];

function AnalysisWaiting() {
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % analysisUpdates.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);
  return <div className="analysis-wait" role="status" aria-live="polite" data-testid="status-analysis-waiting">
    <div className="analysis-wait-orbit" aria-hidden="true"><Lightbulb size={20}/></div>
    <div><div className="question-count">A quick idea check</div><p>{analysisUpdates[messageIndex]}</p><span className="muted">Reading your inputs and shaping the first-page snapshot. Nothing is being sent to investors.</span></div>
  </div>;
}

function ErrorMessage({ retry, message = 'We could not load this just now.' }: { retry: () => void; message?: string }) {
  return <div className="error-box" role="alert"><span>{message}</span><button className="btn btn-outline" onClick={retry} data-testid="button-retry"><RotateCw size={14}/> Try again</button></div>;
}

function Dashboard() {
  const dashboard = useGetVerifaiDashboard();
  const ideas = useListVerifaiIdeas();
  const list = ideas.data ?? dashboard.data?.recentIdeas ?? [];
  if ((dashboard.isLoading && !dashboard.data) || (ideas.isLoading && !ideas.data)) return <Shell title="Overview"><LoadingPage/></Shell>;
  if (dashboard.isError && ideas.isError) return <Shell title="Overview"><div className="page"><ErrorMessage retry={()=>{void dashboard.refetch();void ideas.refetch();}} message="Your workspace could not be reached. Your ideas are unchanged."/></div></Shell>;
  return <Shell title="Overview"><main className="page">
    <div className="page-header"><div><div className="eyebrow">Founder workspace</div><h1>Make room for proof.</h1><p className="muted">Your ideas, their current shape, and the questions worth asking next.</p></div><Link href="/new" className="btn btn-primary" data-testid="button-new-idea"><Plus size={16}/> New idea</Link></div>
    {dashboard.isError && <div style={{marginBottom:20}}><ErrorMessage retry={()=>void dashboard.refetch()} message="Summary metrics are temporarily unavailable."/></div>}
    <div className="metrics">
      <div className="metric"><div className="metric-label">Ideas in workspace</div><div className="metric-value" data-testid="metric-ideas">{dashboard.data?.ideasCount ?? list.length}</div></div>
      <div className="metric"><div className="metric-label">Snapshots generated</div><div className="metric-value" data-testid="metric-reports">{dashboard.data?.reportsCount ?? '—'}</div></div>
      <div className="metric"><div className="metric-label">Average readiness</div><div className="metric-value" data-testid="metric-score">{dashboard.data?.averageScore == null ? '—' : `${Math.round(dashboard.data.averageScore)} / 100`}</div></div>
    </div>
    <div className="section-title"><span>Recent ideas</span><span className="muted">{list.length} in view</span></div>
    {ideas.isError && <div style={{marginBottom:14}}><ErrorMessage retry={()=>void ideas.refetch()} message="The idea list could not be refreshed."/></div>}
    {list.length === 0 ? <div className="empty-state"><div className="empty-symbol"><Lightbulb size={22}/></div><h3>Nothing on the board yet.</h3><p>Start with the problem you have noticed. It does not need a polished name or a perfect answer.</p><Link href="/new" className="btn btn-primary" data-testid="button-create-first"><Plus size={15}/> Add your first idea</Link></div> :
      <div className="idea-list">{list.map((idea)=> <Link href={`/ideas/${idea.id}/questions`} className="idea-row" key={idea.id} data-testid={`card-idea-${idea.id}`}>
        <div><h3>{idea.name}</h3><div className="muted">{idea.targetMarket || 'India'} · Updated {new Date(idea.updatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div></div>
        <span className="tag">{idea.stage.replaceAll('_',' ')}</span>
        <div className="row-score"><div className="score-small">{idea.readinessScore == null ? '—' : `${idea.readinessScore}`}</div><div className="status-copy">{idea.readinessScore == null ? 'No score yet' : 'Snapshot score'}</div></div>
        <ChevronRight className="row-arrow" size={17}/>
      </Link>)}</div>}
    <p className="muted" style={{marginTop:18,fontSize:11}}>A readiness score is a scoped signal, not a forecast of success.</p>
  </main></Shell>;
}

function NewIdea() {
  const createIdea = useCreateVerifaiIdea();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [values,setValues] = useState({name:'',description:'',problem:'',targetCustomer:'',targetMarket:'India'});
  const [formError,setFormError] = useState('');
  const update = (key: keyof typeof values, value: string) => setValues((current)=>({...current,[key]:value}));
  const submit = (event: FormEvent) => {
    event.preventDefault(); setFormError('');
    if(values.name.trim().length<3 || values.description.trim().length<20) { setFormError('Add a name (at least 3 characters) and a description of at least 20 characters.'); return; }
    createIdea.mutate({data:{...values,name:values.name.trim(),description:values.description.trim()}},{
      onSuccess:(idea)=>{ void queryClient.invalidateQueries({queryKey:getGetVerifaiDashboardQueryKey()}); void queryClient.invalidateQueries({queryKey:getListVerifaiIdeasQueryKey()}); setLocation(`/ideas/${idea.id}/questions`); },
      onError:()=>setFormError('We could not save this idea. Your entries are still here; try again.')
    });
  };
  return <Shell title="New idea"><main className="page">
    <div className="page-header"><div><div className="eyebrow">Start with what you know</div><h1>Put the idea on paper.</h1><p className="muted">A working description is enough. You can refine it as you learn.</p></div><Link href="/dashboard" className="btn btn-outline" data-testid="link-cancel-idea"><ArrowLeft size={15}/> Workspace</Link></div>
    <form className="panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field form-wide"><label htmlFor="idea-name">What are you calling it for now?</label><input id="idea-name" data-testid="input-idea-name" value={values.name} maxLength={120} onChange={(e)=>update('name',e.target.value)} placeholder="A working name is fine" required minLength={3}/></div>
        <div className="field form-wide"><label htmlFor="idea-description">Describe the idea in plain language</label><textarea id="idea-description" data-testid="input-idea-description" value={values.description} maxLength={6000} onChange={(e)=>update('description',e.target.value)} placeholder="What would it do, and for whom?" required minLength={20}/><span className="muted">{values.description.length}/6000 · At least 20 characters</span></div>
        <div className="field"><label htmlFor="idea-problem">What problem have you noticed?</label><textarea id="idea-problem" data-testid="input-idea-problem" value={values.problem} maxLength={2000} onChange={(e)=>update('problem',e.target.value)} placeholder="A specific moment of friction is useful."/></div>
        <div className="field"><label htmlFor="idea-customer">Who experiences it?</label><textarea id="idea-customer" data-testid="input-target-customer" value={values.targetCustomer} maxLength={1000} onChange={(e)=>update('targetCustomer',e.target.value)} placeholder="You can say “not sure yet”."/></div>
        <div className="field"><label htmlFor="idea-market">Where will you start?</label><input id="idea-market" data-testid="input-target-market" value={values.targetMarket} maxLength={120} onChange={(e)=>update('targetMarket',e.target.value)} placeholder="India, a city, or a community"/></div>
        <div className="field"><label htmlFor="idea-stage">Current stage</label><select id="idea-stage" data-testid="select-stage" defaultValue="idea" disabled><option value="idea">Early idea · default</option></select><span className="muted">We begin at idea stage; evidence will refine this picture.</span></div>
      </div>
      {formError && <div className="error-box" role="alert" style={{margin:'10px 0 18px'}}>{formError}</div>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}><span className="muted">No funding details or payment information needed.</span><button className="btn btn-primary" type="submit" disabled={createIdea.isPending} data-testid="button-save-idea">{createIdea.isPending ? 'Saving idea…' : 'Save & explore questions'} <ArrowRight size={15}/></button></div>
    </form>
  </main></Shell>;
}

function Questions() {
  const { ideaId = '' } = useParams<{ideaId:string}>();
  const idea = useGetVerifaiIdea(ideaId,{query:{enabled:!!ideaId,queryKey:getGetVerifaiIdeaQueryKey(ideaId)}});
  const generate = useGenerateVerifaiQuestions();
  const save = useSaveVerifaiAnswers();
  const run = useRunVerifaiAnalysis();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const started = useRef('');
  const [questionSet,setQuestionSet] = useState<any>(null);
  const [answers,setAnswers] = useState<Record<string,string>>({});
  const [position,setPosition] = useState(0);
  const [error,setError] = useState('');
  useEffect(()=>{
    if(idea.data && started.current!==ideaId && !questionSet) {
      started.current=ideaId;
      generate.mutate({ideaId},{onSuccess:(result)=>{setQuestionSet(result); const initial:Record<string,string>={}; result.tiers.forEach((tier:any)=>tier.questions.forEach((q:any)=>{initial[q.id]=q.answer??'';}));setAnswers(initial);},onError:()=>{setError('We could not prepare the question set. Try again when the connection is steady.');}});
    }
  },[idea.data,ideaId,generate,questionSet]);
  const questions = useMemo(()=> questionSet?.tiers?.flatMap((tier:any)=>tier.questions.map((question:any)=>({...question,tierTitle:tier.title,tierDescription:tier.description}))) ?? [],[questionSet]);
  const current = questions[position];
  const answeredCount = Object.values(answers).filter((value)=>value.trim().length>0).length;
  const retry = () => { setError('');started.current=''; if(idea.data) generate.mutate({ideaId},{onSuccess:(result)=>{setQuestionSet(result);const init:Record<string,string>={};result.tiers.forEach((tier:any)=>tier.questions.forEach((q:any)=>{init[q.id]=q.answer??'';}));setAnswers(init);},onError:()=>setError('Question generation failed. Please retry.')}); };
  const finish = () => {
    if(!questionSet) return;
    const answerPayload = questions.map((q:any)=>({questionId:q.id,answer:answers[q.id]?.trim() || 'Not sure yet'}));
    save.mutate({ideaId,data:{answers:answerPayload}},{onSuccess:()=>{
      void queryClient.invalidateQueries({queryKey:getGetVerifaiIdeaQueryKey(ideaId)});
      run.mutate({ideaId},{onSuccess:()=>{void queryClient.invalidateQueries({queryKey:getGetVerifaiReportQueryKey(ideaId)});void queryClient.invalidateQueries({queryKey:getGetVerifaiDashboardQueryKey()});setLocation(`/ideas/${ideaId}/report`);},onError:()=>setError('Answers were saved, but the snapshot could not be generated. You can retry below.')});
    },onError:()=>setError('Answers could not be saved yet. Your responses remain on this page.')});
  };
  if(idea.isLoading || generate.isPending) return <Shell title="Idea questions"><LoadingPage/></Shell>;
  if(idea.isError || !idea.data) return <Shell title="Idea questions"><div className="page"><ErrorMessage retry={()=>void idea.refetch()} message="This idea could not be opened."/></div></Shell>;
  if(!questionSet) return <Shell title="Idea questions"><div className="page"><div className="page-header"><div><div className="eyebrow">Refinement / {idea.data.name}</div><h1>Find the useful unknowns.</h1><p className="muted">We ask in short stages. “Not sure yet” is always a valid answer.</p></div></div>{error && <ErrorMessage retry={retry} message={error}/>}<div className="empty-state"><div className="empty-symbol"><CircleHelp size={22}/></div><h3>Questions are not ready yet.</h3><p>We’ll prepare a focused three-stage question set for this idea.</p><button className="btn btn-primary" onClick={retry} data-testid="button-generate-questions"><RotateCw size={15}/> Prepare questions</button></div></div></Shell>;
  const currentTierIndex=questionSet.tiers.findIndex((tier:any)=>tier.questions.some((q:any)=>q.id===current?.id));
  return <Shell title="Idea questions"><main className="page">
    <div className="page-header"><div><div className="eyebrow">Refining / {idea.data.name}</div><h1>One question at a time.</h1><p className="muted">Give the answer you have. Leave a gap if it is still unknown.</p></div><Link href="/dashboard" className="btn btn-outline" data-testid="link-exit-questions"><ArrowLeft size={15}/> Save for later</Link></div>
    <div className="question-layout">
      <aside className="tier-nav">{questionSet.tiers.map((tier:any,index:number)=>{
        const done=tier.questions.every((q:any)=>answers[q.id]?.trim());
        return <div key={tier.tier} className={`tier-card ${index===currentTierIndex?'active':''} ${done?'done':''}`}><div className="question-count">Stage 0{index+1} {done&&<Check size={12}/>}</div><h3>{tier.title}</h3><div className="muted">{tier.questions.filter((q:any)=>answers[q.id]?.trim()).length}/{tier.questions.length} answered</div></div>;
      })}</aside>
      <section className="panel question-stage">
        <div className="question-count">Question {position+1} of {questions.length} · {current?.tierTitle}</div>
        <div className="progress-track"><div className="progress-fill" style={{width:`${questions.length ? ((position+1)/questions.length)*100 : 0}%`}}/></div>
        <h2>{current?.prompt}</h2><p className="question-rationale">{current?.rationale}</p>
        <textarea className="answer-input" data-testid="input-question-answer" value={answers[current?.id]??''} onChange={(e)=>setAnswers((prev)=>({...prev,[current.id]:e.target.value}))} placeholder="Write what you know, or leave it blank and mark it as not sure yet." maxLength={3000} />
        <div className="answer-actions"><div style={{display:'flex',gap:8}}><button className="btn btn-outline" onClick={()=>setAnswers((prev)=>({...prev,[current.id]:'Not sure yet'}))} data-testid="button-not-sure">Not sure yet</button><button className="btn btn-outline" disabled={position===0} onClick={()=>setPosition((p)=>Math.max(0,p-1))} data-testid="button-previous"><ArrowLeft size={14}/> Back</button></div>
          {position<questions.length-1 ? <button className="btn btn-primary" onClick={()=>setPosition((p)=>p+1)} data-testid="button-next-question">Next <ArrowRight size={14}/></button> : <button className="btn btn-primary" onClick={finish} disabled={save.isPending||run.isPending} data-testid="button-submit-answers">{save.isPending||run.isPending?'Building your snapshot…':'Save & create snapshot'} <ArrowRight size={14}/></button>}
        </div>
        <div className="muted" style={{marginTop:16,fontSize:11}}>{answeredCount} of {questions.length} with a response · You can revisit your answers later.</div>
        {run.isPending && <AnalysisWaiting/>}
        {error && <div className="error-box" style={{marginTop:18}} role="alert"><span>{error}</span><button className="btn btn-outline" onClick={finish} data-testid="button-retry-analysis">Retry</button></div>}
      </section>
    </div>
  </main></Shell>;
}

function Report({finalView=false}:{finalView?:boolean}) {
  const {ideaId=''}=useParams<{ideaId:string}>();
  const report=useGetVerifaiReport(ideaId,{query:{enabled:!!ideaId,queryKey:getGetVerifaiReportQueryKey(ideaId)}});
  const idea=useGetVerifaiIdea(ideaId,{query:{enabled:!!ideaId,queryKey:getGetVerifaiIdeaQueryKey(ideaId)}});
  const run=useRunVerifaiAnalysis();
  const demoUnlock=useDemoUnlockVerifaiReport();
  const trackUnlockClick=useTrackVerifaiUnlockClick();
  const queryClient=useQueryClient();
  const [,setLocation]=useLocation();
  const [demoError,setDemoError]=useState('');
  const [intentDialogOpen,setIntentDialogOpen]=useState(false);
  const [clickTrackingError,setClickTrackingError]=useState('');
  const generate=()=>run.mutate({ideaId},{onSuccess:()=>{void queryClient.invalidateQueries({queryKey:getGetVerifaiReportQueryKey(ideaId)});void queryClient.invalidateQueries({queryKey:getGetVerifaiDashboardQueryKey()});}});
  const openResearchUnlock=()=>{
    setDemoError('');
    setClickTrackingError('');
    setIntentDialogOpen(true);
    trackUnlockClick.mutate({ideaId},{onError:()=>setClickTrackingError('We could not record this click, but you can still unlock the free research preview.')});
  };
  const unlockForDemo=(willingnessToPay:'yes'|'maybe'|'no'|'skip')=>{
    setDemoError('');
    demoUnlock.mutate({ideaId,data:{willingnessToPay}},{onSuccess:async()=>{
      await Promise.all([
        queryClient.invalidateQueries({queryKey:getGetVerifaiReportQueryKey(ideaId)}),
        queryClient.invalidateQueries({queryKey:getGetVerifaiIdeaQueryKey(ideaId)}),
      ]);
      setIntentDialogOpen(false);
      setLocation(`/ideas/${ideaId}/final`);
    },onError:()=>setDemoError('The demo unlock did not go through. Your snapshot is unchanged; try once more.')});
  };
  if(report.isLoading) return <Shell title={finalView?'Final results':'Report preview'}><LoadingPage/></Shell>;
  if(report.isError || !report.data) return <Shell title={finalView?'Final results':'Report preview'}><main className="page"><div className="page-header"><div><div className="eyebrow">Validation snapshot</div><h1>{idea.data?.name ?? 'Your idea'}</h1></div></div>{run.isPending ? <AnalysisWaiting/> : <div className="empty-state"><div className="empty-symbol"><FileText size={22}/></div><h3>No snapshot to show yet.</h3><p>Complete the question set first, then build a scoped free snapshot based on the information available.</p>{run.isError&&<p role="alert">The analysis could not be generated. Please try again.</p>}<button className="btn btn-primary" onClick={generate} data-testid="button-run-analysis">Generate free snapshot <ArrowRight size={15}/></button></div>}</main></Shell>;
  const data=report.data;
  const score=Math.max(0,Math.min(100,data.score));
  const sections=data.sections??[];
  const comparisons=data.comparisons??[];
  const nextSteps=data.nextSteps??[];
  if(finalView&&!data.isFullReport) return <Shell title="Final results"><main className="page"><div className="empty-state"><div className="empty-symbol"><LockKeyhole size={22}/></div><h3>This report is still in preview mode.</h3><p>Use the demo unlock on the preview screen to open the final results. It will not process a payment.</p><Link href={`/ideas/${ideaId}/report`} className="btn btn-primary" data-testid="link-back-to-preview">Back to report preview</Link></div></main></Shell>;
  return <Shell title={finalView?'Final results':'Report preview'}><main className={`page ${data.isFullReport?'report-page-full':'report-page-preview'}`}>
     <div className="page-header"><div><div className="eyebrow">{finalView?'FREE RESEARCH UNLOCK · NO PAYMENT TAKEN':`A first look · Generated ${new Date(data.generatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`}</div><h1>{finalView?'Your full report':data.ideaName}</h1><p className="muted">{finalView?'The complete idea assessment is ready to explore.':'A quick signal on where the idea stands. Unlock the full read when you are ready.'}</p></div>{finalView?<Link href={`/ideas/${ideaId}/report`} className="btn btn-outline" data-testid="link-back-to-preview"><ArrowLeft size={15}/> Back to preview</Link>:<Link href={`/ideas/${ideaId}/questions`} className="btn btn-outline" data-testid="link-review-answers"><Layers3 size={15}/> Review my answers</Link>}</div>
     {finalView&&<div className="notice" role="status" data-testid="status-demo-unlocked"><strong>Research preview.</strong> Full access is free for this test. No payment was taken.</div>}
    <section className="report-score" style={{['--score' as any]:`${score*3.6}deg`}} data-testid="report-score">
      <div className="score-ring"><div className="score-inner"><div className="score-number">{score}</div><div className="score-denom">OUT OF 100</div></div></div>
      <div><div className="verdict">{data.verdict}</div>{data.isFullReport&&<h2>{data.summary || 'A starting point for a better-informed next step.'}</h2>}<p>A directional signal based on what you shared — not a prediction of success.</p></div>
    </section>
    {!data.headlineSnapshot&&<div className="legacy-report-note" data-testid="legacy-snapshot-notice">
      <div><strong>This report predates the headline snapshot.</strong><span>There are no saved market or audience metrics to show. Regenerate to build a fresh snapshot from your current inputs.</span></div>
      <button className="btn btn-outline" onClick={generate} disabled={run.isPending} data-testid="button-regenerate-snapshot"><RotateCw size={14}/>{run.isPending?'Refreshing snapshot…':'Regenerate snapshot'}</button>
    </div>}
    {!data.headlineSnapshot&&run.isError&&<div className="error-box" role="alert" data-testid="error-regenerate-snapshot"><span>The snapshot could not be regenerated. Your existing report is unchanged.</span><button className="btn btn-outline" onClick={generate}>Try again</button></div>}
    {!data.isFullReport&&data.headlineSnapshot&&<SnapshotReadout snapshot={data.headlineSnapshot}/>}
    {!data.isFullReport&&<section className="unlock-offer" data-testid="section-unlock-offer">
      <div className="unlock-offer-heading"><div className="eyebrow">THE FULL PICTURE</div><h2>Ready for the useful details?</h2><p>One unlock opens the complete report and AI founder coach for this idea.</p></div>
      <div className="unlock-benefit-grid">
        <article className="unlock-benefit"><span>01 / SIX EXPERT LENSES</span><h3>See what is strong — and what needs proof.</h3><p>Market, customer & business model, technology, go-to-market, strategic risk, and India compliance.</p></article>
        <article className="unlock-benefit"><span>02 / EVIDENCE & TRADE-OFFS</span><h3>Get the reasoning behind the score.</h3><p>Strengths, gaps, cited evidence, assumptions, and comparisons with current workarounds.</p></article>
        <article className="unlock-benefit"><span>03 / YOUR NEXT MOVE</span><h3>Leave with a sharper plan.</h3><p>AI framing and execution suggestions, prioritized experiments, and founder-coach chat.</p></article>
      </div>
      <div className="unlock-action">
        <div><strong>Full report · ₹20 test price</strong><p>Unlock free in this research preview. No payment is collected.</p></div>
        <button className="btn btn-primary" onClick={openResearchUnlock} disabled={demoUnlock.isPending} data-testid="button-demo-unlock">{demoUnlock.isPending?'Opening your report…':'Try the full report free'} <ArrowRight size={16}/></button>
      </div>
      {demoError&&!intentDialogOpen&&<div className="error-box" role="alert" data-testid="error-demo-unlock">{demoError}</div>}
    </section>}
    {intentDialogOpen&&<div className="research-modal-backdrop">
      <section className="research-modal" role="dialog" aria-modal="true" aria-labelledby="research-modal-title" aria-describedby="research-modal-description">
        <button className="research-modal-close" type="button" aria-label="Close research question" disabled={demoUnlock.isPending} onClick={()=>setIntentDialogOpen(false)}>×</button>
        <div className="eyebrow">OPTIONAL · PRODUCT RESEARCH</div>
        <h2 id="research-modal-title">Would you pay ₹20 for the full report?</h2>
        <p id="research-modal-description">We’ll record your answer for product research. The full report opens free either way, and no payment is taken.</p>
        {clickTrackingError&&<p className="research-modal-tracking-note" role="status">{clickTrackingError}</p>}
        <div className="research-intent-options">
          <button className="btn btn-outline" type="button" onClick={()=>unlockForDemo('yes')} disabled={demoUnlock.isPending} data-testid="button-pay-intent-yes">Yes, at ₹20</button>
          <button className="btn btn-outline" type="button" onClick={()=>unlockForDemo('maybe')} disabled={demoUnlock.isPending} data-testid="button-pay-intent-maybe">Maybe</button>
          <button className="btn btn-outline" type="button" onClick={()=>unlockForDemo('no')} disabled={demoUnlock.isPending} data-testid="button-pay-intent-no">No, not at ₹20</button>
        </div>
        <button className="research-skip-button" type="button" onClick={()=>unlockForDemo('skip')} disabled={demoUnlock.isPending} data-testid="button-pay-intent-skip">{demoUnlock.isPending?'Opening free report…':'Skip question and unlock free'}</button>
        {demoError&&<div className="error-box" role="alert" data-testid="error-demo-unlock-dialog">{demoError}</div>}
      </section>
    </div>}
    {data.isFullReport&&<>
      {data.paidDetails
        ? <PaidDetailsReadout details={data.paidDetails} history={data.scoreHistory ?? []}/>
        : <div className="legacy-report-note" data-testid="legacy-paid-details-notice"><strong>Detailed analysis is not available for this legacy report.</strong><span>The score, sections, and context below remain available; no missing research has been filled in.</span></div>}
      <section className="snapshot-areas" aria-labelledby="snapshot-areas-title">
        <div className="snapshot-section-heading"><div><div className="question-count">The quick read</div><h2 id="snapshot-areas-title">Six lenses on the idea</h2></div><span className="muted">Directional, not definitive</span></div>
        {sections.length>0?<div className="snapshot-area-grid">{sections.map((section:any)=><article className="snapshot-area" key={section.key} data-testid={`section-report-${section.key}`}><span>{section.title}</span><strong>{section.score}</strong><div className="snapshot-area-track"><i style={{width:`${Math.max(0,Math.min(100,section.score))}%`}}/></div><p>{section.summary}</p></article>)}</div>:<div className="empty-state"><h3>Area detail is not available.</h3><p>The snapshot has a headline score but no section data to display.</p></div>}
      </section>
      {nextSteps.length>0&&<section className="ai-refinement" aria-labelledby="ai-refinement-title" data-testid="section-ai-refinement">
        <div className="snapshot-section-heading"><div><div className="question-count">Your AI idea coach</div><h2 id="ai-refinement-title">Make the idea sharper.</h2><p className="muted">Suggestions for framing, execution, and the idea itself — not homework to rewrite your answers.</p></div><span className="refinement-spark" aria-hidden="true"><Lightbulb size={22}/></span></div>
        <div className="refinement-grid">{nextSteps.map((item:string,index:number)=>{
          const tag=item.match(/^(?:\[(FRAME|TEST|SHARPEN)\]|(FRAME|TEST|SHARPEN))\s*:?\s*/i);
          const category=(tag?.[1]??tag?.[2]??['FRAME','TEST','SHARPEN'][index%3]).toUpperCase();
          const titles:Record<string,string>={FRAME:'Frame it clearly',TEST:'Try it in the real world',SHARPEN:'Sharpen the idea'};
          const suggestion=tag?item.slice(tag[0].length):item;
          return <article className="refinement-card" key={`${category}-${index}`} data-testid={`card-refinement-${index}`}><span className="refinement-tag">{category}</span><h3>{titles[category]??'A useful next move'}</h3><p>{suggestion}</p></article>;
        })}</div>
      </section>}
      {sections.length>0&&<section className="full-report-detail" aria-labelledby="full-report-title"><div className="snapshot-section-heading"><div><div className="question-count">Full report</div><h2 id="full-report-title">Evidence behind the snapshot</h2></div></div><div className="report-grid">{sections.map((section:any)=><article className="report-section" key={`detail-${section.key}`}><div className="report-section-top"><h3>{section.title}</h3><span className="section-score">{section.score}/100</span></div><p>{section.summary}</p><div className="report-columns"><div><div className="question-count">Strengths</div><ul>{section.strengths?.map((item:string,index:number)=><li key={index}>{item}</li>)}</ul></div><div><div className="question-count">To improve</div><ul>{section.improvements?.map((item:string,index:number)=><li key={index}>{item}</li>)}</ul></div></div>{section.evidence?.length>0&&<div style={{marginTop:16}}><div className="question-count">Evidence noted</div><ul>{section.evidence.map((item:string,index:number)=><li key={index}>{item}</li>)}</ul></div>}</article>)}</div>{comparisons.length>0&&<article className="report-section report-comparisons"><h3>Comparisons & context</h3><ul>{comparisons.map((item:string,i:number)=><li key={i}>{item}</li>)}</ul></article>}</section>}
      <div className="locked-panel"><div><h3>Keep moving</h3><p>Ask the AI coach to turn one report finding into a concrete test.</p></div><Link href={`/ideas/${ideaId}/chat`} className="btn btn-dark" data-testid="link-chat-gate"><MessageCircle size={15}/> Open AI founder coach <ArrowRight size={14}/></Link></div>
    </>}
    <p className="muted" style={{fontSize:11,marginTop:15}}>Readiness scores are not investment advice, legal advice, or a prediction of startup success.</p>
  </main></Shell>;
}

function ChatGate() {
  const {ideaId=''}=useParams<{ideaId:string}>();
  const idea=useGetVerifaiIdea(ideaId,{query:{enabled:!!ideaId,queryKey:getGetVerifaiIdeaQueryKey(ideaId)}});
  const report=useGetVerifaiReport(ideaId,{query:{enabled:!!ideaId,queryKey:getGetVerifaiReportQueryKey(ideaId)}});
  const history=useGetVerifaiMessages(ideaId,{query:{enabled:!!ideaId&&!!report.data?.isFullReport,queryKey:getGetVerifaiMessagesQueryKey(ideaId)}});
  const send=useSendVerifaiMessage();
  const queryClient=useQueryClient();
  const [draft,setDraft]=useState('');
  const [error,setError]=useState('');
  const prompts=['Help me test the riskiest assumption','Narrow this to a first customer segment','Turn the next step into a 2-week experiment'];
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    const message=draft.trim();
    if(!message||send.isPending) return;
    setError('');
    send.mutate({ideaId,data:{message}},{onSuccess:()=>{setDraft('');void queryClient.invalidateQueries({queryKey:getGetVerifaiMessagesQueryKey(ideaId)});},onError:()=>setError('Your message was not sent. It is still in the box; try again.')});
  };
  return <Shell title="Idea refinement"><main className="page">
    <div className="page-header"><div><div className="eyebrow">Post-report refinement</div><h1>{idea.data?.name??'Your idea'}</h1></div><Link href={`/ideas/${ideaId}/report`} className="btn btn-outline" data-testid="link-back-report"><ArrowLeft size={15}/> Back to snapshot</Link></div>
    {idea.isLoading||report.isLoading ? <LoadingPage/> : idea.isError||report.isError ? <ErrorMessage retry={()=>{void idea.refetch();void report.refetch();}} message="This idea or report could not be loaded."/> :
      !report.data?.isFullReport ? <div className="chat-gate"><div className="empty-symbol"><LockKeyhole size={22}/></div><div className="eyebrow">AI founder coach · full-report feature</div><h1>Unlock the report to keep going.</h1><p className="muted" style={{maxWidth:500,margin:'0 auto 20px'}}>This prototype uses a no-charge demo unlock. Payment checkout will be added later.</p><Link href={`/ideas/${ideaId}/report`} className="btn btn-primary" data-testid="link-return-snapshot">See demo unlock <ArrowLeft size={14}/></Link></div> :
      <div className="chat-panel">
        <div className="notice"><strong>Evidence-first coaching.</strong> The assistant works from your report and answers; it will label assumptions and avoid inventing market or legal facts.</div>
        <div className="chat-thread" aria-live="polite">
          {history.data?.messages.length ? history.data.messages.map((message)=><article className={`chat-message ${message.role==='assistant'?'assistant':'founder'}`} key={message.id}><div className="question-count">{message.role==='assistant'?'VERIFAI':'YOU'}</div><p>{message.content}</p></article>) : <div className="empty-state"><div className="empty-symbol"><MessageCircle size={22}/></div><h3>Start with a useful question.</h3><p>Ask for a test, a sharper segment, or a concrete next step.</p></div>}
          {send.isPending&&<article className="chat-message assistant"><div className="question-count">VERIFAI</div><p>Thinking through the evidence…</p></article>}
        </div>
        {history.isError&&<ErrorMessage retry={()=>void history.refetch()} message="Chat history could not be loaded."/>}
        <div className="suggested-prompts">{prompts.map((prompt)=><button className="btn btn-outline" key={prompt} onClick={()=>setDraft(prompt)}>{prompt}</button>)}</div>
        <form className="chat-composer" onSubmit={submit}><textarea value={draft} onChange={(event)=>setDraft(event.target.value)} maxLength={4000} placeholder="Ask a focused question about your idea…" aria-label="Message VerifAI" required/><button className="btn btn-primary" type="submit" disabled={!draft.trim()||send.isPending} aria-label="Send message"><Send size={16}/> Send</button></form>
        {error&&<div className="error-box" role="alert">{error}</div>}
      </div>}
  </main></Shell>;
}

function Account() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const displayName = user?.fullName || user?.firstName || 'Founder';
  const email = user?.primaryEmailAddress?.emailAddress || 'No email on file';
  return <Shell title="Profile"><main className="page">
    <div className="page-header"><div><div className="eyebrow">Your account</div><h1>A little about you.</h1><p className="muted">Keep your founder workspace grounded in your context.</p></div></div>
    <div className="panel" style={{maxWidth:700}}><div className="field"><label htmlFor="profile-name">Display name</label><input id="profile-name" data-testid="input-profile-name" value={displayName} readOnly/></div><div className="field"><label htmlFor="profile-email">Email</label><input id="profile-email" data-testid="input-profile-email" type="email" value={email} readOnly/><span className="muted">Profile details are managed by your secure sign-in provider.</span></div><div className="divider"/><h3 className="font-display" style={{fontSize:19}}>Your defaults</h3><p className="muted">Market context: India<br/>Currency: INR (₹)</p><div className="notice">Your ideas and reports are private to your signed-in account.</div><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><Link href="/dashboard" className="btn btn-outline" data-testid="link-profile-workspace"><ArrowLeft size={14}/> Back to workspace</Link><button className="btn btn-dark" onClick={()=>void signOut({redirectUrl:`${basePath}/`})} data-testid="button-sign-out"><LogOut size={14}/> Sign out</button></div></div>
  </main></Shell>;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="auth-wrap">
    <section className="auth-aside"><Brand light/><div><div className="eyebrow">A founder's field notebook</div><h1>Build the thing that needs building.</h1><p>Get an honest read on your idea, and a clearer sense of what to learn next.</p></div><div className="font-mono" style={{fontSize:10,color:'#aaa296'}}>VERIFAI · INDIA · INR</div></section>
    <section className="auth-form-side"><div className="auth-card">
      <div className="eyebrow">A secure founder workspace</div>
      <h2>Continue with your account.</h2>
      <p className="muted">VerifAI uses Clerk to protect your ideas and reports.</p>
      {children}
      <Link href="/" className="muted" style={{display:'block',textAlign:'center',marginTop:25}} data-testid="link-auth-home">← Back to the public page</Link>
    </div></section>
  </main>;
}

function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} appearance={clerkAppearance}/></AuthFrame>;
}

function SignUpPage() {
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} appearance={clerkAppearance}/></AuthFrame>;
}

function NotFound() {
  return <main className="app-shell"><header className="landing-nav"><Brand/></header><section className="section"><div className="section-inner"><div className="eyebrow">404 / Not on the map</div><h1 className="font-display" style={{fontSize:64,letterSpacing:'-.07em'}}>That page is missing.</h1><p className="muted">The idea may still be worth exploring.</p><Link href="/" className="btn btn-primary" data-testid="link-not-found-home">Back to VerifAI <ArrowLeft size={15}/></Link></div></section></main>;
}

function Router() {
  const [location]=useLocation();
  return <ErrorBoundary resetKey={location}><Switch>
    <Route path="/"><Show when="signed-in"><Redirect to="/dashboard"/></Show><Show when="signed-out"><Landing/></Show></Route>
    <Route path="/dashboard"><ProtectedPage><Dashboard/></ProtectedPage></Route>
    <Route path="/admin"><ProtectedPage><AdminDashboard/></ProtectedPage></Route>
    <Route path="/new"><ProtectedPage><NewIdea/></ProtectedPage></Route>
    <Route path="/ideas/:ideaId/questions"><ProtectedPage><Questions/></ProtectedPage></Route>
    <Route path="/ideas/:ideaId/report"><ProtectedPage><Report/></ProtectedPage></Route>
    <Route path="/ideas/:ideaId/final"><ProtectedPage><Report finalView/></ProtectedPage></Route>
    <Route path="/ideas/:ideaId/chat"><ProtectedPage><ChatGate/></ProtectedPage></Route>
    <Route path="/account"><ProtectedPage><Account/></ProtectedPage></Route>
    <Route path="/sign-in/*?"><SignInPage/></Route>
    <Route path="/sign-up/*?"><SignUpPage/></Route>
    <Route component={NotFound}/>
  </Switch></ErrorBoundary>;
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return <><Show when="signed-in">{children}</Show><Show when="signed-out"><Redirect to="/sign-in"/></Show></>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const currentQueryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const userId = user?.id ?? null;
    if (previousUserId.current !== undefined && previousUserId.current !== userId) {
      currentQueryClient.clear();
    }
    previousUserId.current = userId;
  }), [addListener, currentQueryClient]);
  return null;
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  return <ClerkProvider
    publishableKey={clerkPubKey}
    proxyUrl={clerkProxyUrl}
    routerPush={(to) => setLocation(stripBase(to))}
    routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`}
    signUpUrl={`${basePath}/sign-up`}
    localization={{
      signIn: {
        start: {
          title: 'Welcome back',
          subtitle: 'Sign in to access your founder workspace',
        },
      },
      signUp: {
        start: {
          title: 'Create your workspace',
          subtitle: 'Start by pressure-testing a real idea',
        },
      },
    }}
  >
    <QueryClientProvider client={queryClient}>
      <ClerkQueryClientCacheInvalidator/>
      <TooltipProvider><Router/><Toaster/></TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}

function App() {
  return <div
    style={{ minHeight: '100vh' }}
    onContextMenu={(event) => {
      const target = event.target;
      const editable = target instanceof Element
        && target.closest('input, textarea, select, [contenteditable="true"], [data-allow-context-menu]');
      if (!editable) event.preventDefault();
    }}
  >
    <WouterRouter base={basePath}><ClerkApp/></WouterRouter>
  </div>;
}

export default App;
