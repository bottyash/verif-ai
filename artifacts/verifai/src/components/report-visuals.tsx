import { useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { ChevronDown, CircleDot, Clock3, IndianRupee, MapPin, Target, Users } from 'lucide-react';

/* Palette shared with the rest of the report (coral, forest, ochre, slate, sage, ink). */
export const CHART_COLORS = ['#d85f4c', '#557764', '#c49e56', '#4f6f80', '#8fa88f', '#3a342d'];
const INK = '#302a24';
const MUTED = '#8a8175';
const GRID = '#e3d9ca';

const tooltipStyle = {
  contentStyle: { background: '#fffaf1', border: '1px solid #ded5c7', borderRadius: 10, boxShadow: '0 12px 30px rgba(40,30,20,.12)', fontFamily: 'var(--app-font-sans)', fontSize: 12, color: INK },
  labelStyle: { color: MUTED, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' as const, marginBottom: 4 },
  itemStyle: { color: INK, padding: 0 },
  cursor: { fill: 'rgba(216,95,76,.06)' },
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0));
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const formatNumber = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(value);

function SectionHead({ kicker, title, aside }: { kicker: string; title: string; aside?: string }) {
  return <div className="snapshot-section-heading"><div><div className="question-count">{kicker}</div><h2>{title}</h2></div>{aside && <span className="muted">{aside}</span>}</div>;
}

/* ---------- Small building blocks ---------- */

function SegmentMeter({ value, max = 5, tone = 'coral' }: { value: number | null | undefined; max?: number; tone?: 'coral' | 'forest' }) {
  return <div className={`segment-meter tone-${tone}`} role="img" aria-label={value == null ? 'Needs validation' : `${value} out of ${max}`}>
    {Array.from({ length: max }, (_, index) => <i key={index} className={value != null && index < value ? 'on' : ''} />)}
  </div>;
}

/** Shows a short caption up front; the rest of a long list sits behind a toggle. */
export function DetailList({ title, items, visible = 2, icon }: { title: string; items?: string[] | null; visible?: number; icon?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const list = items ?? [];
  const shown = open ? list : list.slice(0, visible);
  const hidden = list.length - shown.length;
  return <section className="paid-detail-card">
    <h3>{icon && <span className="detail-icon" aria-hidden="true">{icon}</span>}{title}</h3>
    {list.length ? <ul>{shown.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul> : <p className="muted">No detail was included for this area.</p>}
    {(hidden > 0 || (open && list.length > visible)) && <button type="button" className="detail-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? 'Show less' : `Show ${hidden} more`}<ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
    </button>}
  </section>;
}

function GaugeArc({ value, label }: { value: number; label: string }) {
  const v = clamp(value);
  const radius = 70;
  const circumference = Math.PI * radius;
  return <div className="gauge" role="img" aria-label={`${label}: ${v} out of 100`}>
    <svg viewBox="0 0 180 104" width="100%">
      <path d="M20 94a70 70 0 0 1 140 0" fill="none" stroke="#cfdccb" strokeWidth="12" strokeLinecap="round" />
      <path d="M20 94a70 70 0 0 1 140 0" fill="none" stroke="#557764" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(v / 100) * circumference} ${circumference}`} />
    </svg>
    <div className="gauge-value"><strong>{v}</strong><small>/100</small></div>
  </div>;
}

/* ---------- Free headline snapshot ---------- */

export function SnapshotReadout({ snapshot, prefix = 'snapshot' }: { snapshot: any; prefix?: string }) {
  const value = (item: unknown) => item == null || item === '' ? 'Needs validation' : String(item);
  const market = snapshot.market ?? {};
  const audience = snapshot.audience ?? {};
  const finance = snapshot.financialSignals ?? {};
  const roiLevel = ({ low: 1, medium: 2, high: 3 } as Record<string, number>)[String(finance.roiRating ?? '').toLowerCase()] ?? 0;
  const stages = ['emerging', 'growing', 'saturated'];
  const ratings = [
    ['Technical feasibility', snapshot.quickRatings?.technicalFeasibility, 'forest'],
    ['Competition pressure', snapshot.quickRatings?.competitionPressure, 'coral'],
    ['Legal complexity', snapshot.quickRatings?.legalComplexity, 'coral'],
    ['Go-to-market difficulty', snapshot.quickRatings?.goToMarketDifficulty, 'coral'],
  ] as const;
  return <section className="snapshot-readout" data-testid={`${prefix}-headline-snapshot`}>
    <SectionHead kicker="Headline snapshot" title="What the current inputs suggest" aside="Directional, not market research" />
    <div className="snapshot-readout-groups">
      <article className="snapshot-readout-group">
        <h3>Market shape</h3>
        <div className="market-rings">
          <svg viewBox="0 0 120 120" aria-hidden="true" className="market-rings-art">
            <circle cx="60" cy="60" r="56" fill="#f1e6d6" stroke="#e2d3bd" />
            <circle cx="60" cy="74" r="38" fill="#ead2c0" stroke="#dfbca6" />
            <circle cx="60" cy="90" r="20" fill="#d85f4c" />
          </svg>
          <dl className="market-ring-legend">
            <div><dt><i style={{ background: '#e2d3bd' }} />Total addressable</dt><dd>{value(market.tam)}</dd></div>
            <div><dt><i style={{ background: '#dfbca6' }} />Serviceable</dt><dd>{value(market.sam)}</dd></div>
            <div><dt><i style={{ background: '#d85f4c' }} />Obtainable</dt><dd>{value(market.som)}</dd></div>
          </dl>
        </div>
        <div className="market-meta">
          <div><span>Growth rate</span><strong>{value(market.cagr)}</strong></div>
          <div><span>Market stage</span><div className="stage-steps">{stages.map((stage) => <i key={stage} className={market.stage === stage ? 'on' : ''}>{stage}</i>)}{market.stage === 'unknown' || !market.stage ? <em>Needs validation</em> : null}</div></div>
        </div>
      </article>
      <article className="snapshot-readout-group">
        <h3>Who it may serve</h3>
        <p className="audience-lead">{value(audience.primarySegment)}</p>
        <dl className="audience-tiles">
          <div><dt><Users size={14} />Age group</dt><dd>{value(audience.ageGroup)}</dd></div>
          <div><dt><Target size={14} />Reachable users</dt><dd>{value(audience.estimatedReachableUsers)}</dd></div>
          <div><dt><MapPin size={14} />Top region</dt><dd>{value(audience.topRegion)}</dd></div>
        </dl>
      </article>
      <article className="snapshot-readout-group">
        <h3>Financial signals</h3>
        <div className="roi-meter" role="img" aria-label={`ROI rating: ${finance.roiRating ?? 'needs validation'}`}>
          <span>ROI rating</span>
          <div className="roi-steps">{['Low', 'Medium', 'High'].map((label, index) => <i key={label} className={roiLevel > index ? 'on' : ''}><b>{label}</b></i>)}</div>
        </div>
        <dl className="finance-rows">
          <div><dt><IndianRupee size={14} />Startup cost range</dt><dd>{value(finance.startupCostRange)}</dd></div>
          <div><dt><Clock3 size={14} />Break-even timeline</dt><dd>{value(finance.breakEvenTimeline)}</dd></div>
        </dl>
      </article>
    </div>
    <article className="snapshot-readout-group quick-ratings"><h3>Quick ratings <span>1–5 · higher means more of the named quality or challenge</span></h3>
      <div className="rating-list">{ratings.map(([label, rating, tone]) => <div className="rating-row" key={label}><span>{label}</span><div className="rating-value"><SegmentMeter value={rating} tone={tone} /><strong>{rating == null ? '—' : `${rating}/5`}</strong></div></div>)}</div>
    </article>
    <div className="teaser-strip" aria-label="Locked report details">
      <div><strong>{snapshot.teasers?.criticalRiskCount ?? '—'}</strong><span>critical risks to review</span></div>
      <div><strong>{snapshot.teasers?.competitorReviewCount ?? '—'}</strong><span>competitor notes</span></div>
      <div><strong>{snapshot.teasers?.legalReviewCount ?? '—'}</strong><span>legal checks</span></div>
      <div><strong>{snapshot.teasers?.fundingReadinessAvailable ? 'Available' : 'Not included'}</strong><span>funding readiness</span></div>
    </div>
  </section>;
}

/* ---------- Six lenses radar ---------- */

export function LensRadar({ sections }: { sections: any[] }) {
  const data = sections.map((section) => ({ lens: section.title, score: clamp(section.score) }));
  if (data.length < 3) return null;
  return <div className="lens-radar" data-testid="chart-lens-radar">
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="lens" tick={{ fill: '#5f584f', fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="score" name="Score" stroke="#d85f4c" fill="#d85f4c" fillOpacity={0.22} strokeWidth={2} dot={{ r: 3, fill: '#d85f4c' }} />
        <Tooltip {...tooltipStyle} />
      </RadarChart>
    </ResponsiveContainer>
  </div>;
}

/* ---------- Full report ---------- */

function ScoreBreakdown({ items }: { items: any[] }) {
  const data = items.map((item) => ({ name: item.title, score: clamp(item.score), weight: clamp(item.weightPercent) }));
  return <section className="paid-breakdown">
    <SectionHead kicker="How the score is weighted" title="Score breakdown" />
    {data.length ? <div className="breakdown-visual">
      <div className="chart-card">
        <div className="chart-caption">Score by area · out of 100</div>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 42)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 34, left: 8, bottom: 4 }} barSize={14}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={128} tick={{ fill: '#4e473f', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}/100`, 'Score']} />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: INK, fontSize: 11 }}>
              {data.map((entry, index) => <Cell key={index} fill={entry.score >= 70 ? '#557764' : entry.score >= 45 ? '#c49e56' : '#d85f4c'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-card">
        <div className="chart-caption">Weight in the overall score</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="weight" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {data.map((_, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, 'Weight']} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="chart-legend">{data.map((entry, index) => <li key={entry.name}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />{entry.name}<b>{entry.weight}%</b></li>)}</ul>
      </div>
    </div> : <p className="muted">No score breakdown was included.</p>}
  </section>;
}

function ScoreHistory({ history }: { history: any[] }) {
  const ordered = [...history].sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
  const data = ordered.map((entry) => ({ date: new Date(entry.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), full: formatDate(entry.generatedAt), score: clamp(entry.score) }));
  return <section className="score-history">
    <SectionHead kicker="Change over time" title="Score history" aside={data.length ? `${data.length} recorded ${data.length === 1 ? 'score' : 'scores'}` : undefined} />
    {data.length >= 2 && <div className="chart-card">
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data} margin={{ top: 14, right: 18, left: -18, bottom: 0 }}>
          <defs><linearGradient id="historyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d85f4c" stopOpacity={0.28} /><stop offset="100%" stopColor="#d85f4c" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ''} formatter={(v: number) => [`${v}/100`, 'Score']} />
          <Area type="monotone" dataKey="score" stroke="#d85f4c" strokeWidth={2} fill="url(#historyFill)" dot={{ r: 4, fill: '#fbf7ee', stroke: '#d85f4c', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>}
    {data.length ? <ol className="timeline">{data.map((entry, index) => <li key={`${entry.full}-${index}`} className={index === data.length - 1 ? 'current' : ''}>
      <span className="timeline-node" /><strong>{entry.score}<small>/100</small></strong><time>{entry.full}</time>
    </li>)}</ol> : <p className="muted">This is the first recorded score for this report.</p>}
  </section>;
}

function MarketPanel({ details, visuals }: { details: any; visuals: any }) {
  const split = (visuals?.marketSplit ?? []).filter((item: any) => item.value > 0);
  const sizing = visuals?.marketSizing;
  const sizingData = sizing ? [
    { name: 'TAM', value: sizing.tam }, { name: 'SAM', value: sizing.sam }, { name: 'SOM', value: sizing.som },
  ].filter((item) => item.value != null && item.value > 0) : [];
  const hasCharts = split.length > 0 || sizingData.length > 0;
  return <section className="visual-panel">
    <SectionHead kicker="Market proportion" title="Where the demand sits" aside={hasCharts ? 'Modelled estimate' : undefined} />
    <div className={`visual-grid ${hasCharts ? '' : 'single'}`}>
      {split.length > 0 && <div className="chart-card" data-testid="chart-market-split">
        <div className="chart-caption">Share of starting market by segment</div>
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie data={split} dataKey="value" nameKey="label" innerRadius="52%" outerRadius="86%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {split.map((_: any, index: number) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${formatNumber(v)}%`, 'Share']} />
          </PieChart>
        </ResponsiveContainer>
        <ul className="chart-legend">{split.map((entry: any, index: number) => <li key={entry.label}><i style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />{entry.label}<b>{formatNumber(entry.value)}%</b></li>)}</ul>
      </div>}
      {sizingData.length > 0 && <div className="chart-card" data-testid="chart-market-sizing">
        <div className="chart-caption">Market size · {sizing.unit}</div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={sizingData} margin={{ top: 20, right: 8, left: -10, bottom: 0 }} barSize={42}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="name" tick={{ fill: '#4e473f', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis scale="sqrt" tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${formatNumber(v)} ${sizing.unit}`, 'Estimate']} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: INK, fontSize: 11, formatter: formatNumber }}>
              {sizingData.map((_, index) => <Cell key={index} fill={['#e2d3bd', '#dfa58f', '#d85f4c'][index]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="chart-note">{sizing.assumption}</p>
      </div>}
      <DetailList title="Market analysis" items={details.marketAnalysis} visible={hasCharts ? 2 : 3} />
    </div>
  </section>;
}

function CompetitionPanel({ details, visuals }: { details: any; visuals: any }) {
  const data = (visuals?.competitorPositioning ?? []).map((item: any) => ({ ...item, value: clamp(item.value) }));
  return <section className="visual-panel">
    <SectionHead kicker="Competitive position" title="How the alternatives compare" aside={data.length ? 'Modelled estimate' : undefined} />
    <div className={`visual-grid ${data.length ? '' : 'single'}`}>
      {data.length > 0 && <div className="chart-card" data-testid="chart-competitors">
        <div className="chart-caption">How well each option solves the job today · 0–100</div>
        <ResponsiveContainer width="100%" height={Math.max(190, data.length * 44)}>
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 34, left: 8, bottom: 4 }} barSize={14}>
            <CartesianGrid horizontal={false} stroke={GRID} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={140} tick={{ fill: '#4e473f', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}/100`, 'Fit']} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: INK, fontSize: 11 }}>
              {data.map((entry: any, index: number) => <Cell key={index} fill={entry.isThisIdea ? '#d85f4c' : '#b9ad9b'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>}
      <DetailList title="Competitor analysis" items={details.competitorAnalysis} visible={data.length ? 2 : 3} />
    </div>
  </section>;
}

function FinancialPanel({ details, visuals }: { details: any; visuals: any }) {
  const scenarios = visuals?.revenueScenarios ?? [];
  const unit = visuals?.revenueUnit || 'INR lakh';
  const data = ['year1', 'year2', 'year3'].map((key, index) => {
    const row: Record<string, string | number> = { year: `Year ${index + 1}` };
    scenarios.forEach((scenario: any) => { row[scenario.label] = scenario[key]; });
    return row;
  });
  return <section className="visual-panel">
    <SectionHead kicker="Financial model" title="Revenue scenarios" aside={scenarios.length ? `Modelled · ${unit}` : undefined} />
    <div className={`visual-grid ${scenarios.length ? '' : 'single'}`}>
      {scenarios.length > 0 && <div className="chart-card" data-testid="chart-revenue">
        <div className="chart-caption">Projected revenue · {unit}</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 10, right: 8, left: -6, bottom: 0 }} barGap={3}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="year" tick={{ fill: '#4e473f', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: MUTED, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatNumber} />
            <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`₹${formatNumber(v)} ${unit.replace(/^INR\s*/i, '')}`, name]} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#5f584f' }} />
            {scenarios.map((scenario: any, index: number) => <Bar key={scenario.label} dataKey={scenario.label} fill={['#b9ad9b', '#557764', '#d85f4c'][index % 3]} radius={[3, 3, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>}
      <DetailList title="Financial model" items={details.financialModel} visible={scenarios.length ? 2 : 3} />
    </div>
  </section>;
}

const LEVELS = ['low', 'medium', 'high'] as const;

function RiskMatrix({ risks }: { risks: any[] }) {
  const numbered = risks.map((risk, index) => ({ ...risk, n: index + 1 }));
  const cellTone = (l: number, i: number) => (l + i >= 3 ? 'hot' : l + i >= 2 ? 'warm' : 'cool');
  return <section className="paid-detail-card risk-register">
    <h3>Risk register</h3>
    {numbered.length ? <div className="risk-layout">
      <div className="risk-matrix" data-testid="chart-risk-matrix" role="img" aria-label="Risks plotted by likelihood and impact">
        <span className="risk-axis-y">Likelihood</span>
        <div className="risk-grid">
          {[2, 1, 0].map((l) => LEVELS.map((impact, i) => <div key={`${l}-${i}`} className={`risk-cell ${cellTone(l, i)}`}>
            {numbered.filter((risk) => LEVELS.indexOf(risk.likelihood) === l && LEVELS.indexOf(risk.impact) === i).map((risk) => <b key={risk.n} title={risk.risk}>{risk.n}</b>)}
          </div>))}
        </div>
        <div className="risk-axis-labels"><span>Low</span><span>Medium</span><span>High</span></div>
        <span className="risk-axis-x">Impact</span>
      </div>
      <ol className="risk-list">{numbered.map((item) => <li key={item.n}>
        <span className="risk-num">{item.n}</span>
        <div><strong>{item.risk}</strong><div className="risk-tags"><span className={`lvl-${item.likelihood}`}>Likelihood · {item.likelihood}</span><span className={`lvl-${item.impact}`}>Impact · {item.impact}</span></div><p>{item.mitigation}</p></div>
      </li>)}</ol>
    </div> : <p className="muted">No specific risks were listed.</p>}
  </section>;
}

function ActionTimeline({ plan, milestones }: { plan: any; milestones: any[] }) {
  const phases = [
    { label: 'This week', items: plan.thisWeek, tone: '#d85f4c' },
    { label: 'This month', items: plan.thisMonth, tone: '#c49e56' },
    { label: 'This quarter', items: plan.thisQuarter, tone: '#557764' },
  ];
  return <section className="action-plan">
    <SectionHead kicker="A practical sequence" title="Action plan" />
    {milestones.length > 0 && <ol className="milestone-track" data-testid="chart-milestones">{milestones.map((milestone, index) => <li key={`${milestone.when}-${index}`}>
      <span className="milestone-dot" /><time>{milestone.when}</time><p>{milestone.title}</p>
    </li>)}</ol>}
    <ol className="phase-timeline">{phases.map((phase) => <li key={phase.label} style={{ ['--tone' as any]: phase.tone }}>
      <div className="phase-head"><span className="phase-node" /><strong>{phase.label}</strong></div>
      {phase.items?.length ? <ul>{phase.items.map((item: string, index: number) => <li key={index}>{item}</li>)}</ul> : <p className="muted">Nothing listed.</p>}
    </li>)}</ol>
    <DetailList title="Validation experiments" items={plan.validationExperiments} visible={4} icon={<CircleDot size={14} />} />
  </section>;
}

export function PaidDetailsReadout({ details, history }: { details: any; history?: any[] }) {
  const visuals = details.visuals ?? null;
  const funding = details.fundingReadiness;
  const plan = details.actionPlan;
  const others = [
    ['Customer analysis', details.customerAnalysis],
    ['Technical plan', details.technicalPlan],
    ['Go-to-market', details.goToMarket],
    ['Legal and compliance', details.legalCompliance],
  ] as const;
  return <div className="paid-details-readout" data-testid="paid-report-details">
    <ScoreBreakdown items={details.scoreBreakdown ?? []} />
    {history && <ScoreHistory history={history} />}
    {visuals?.assumptionNote && <p className="assumption-note" data-testid="text-assumption-note"><b>Modelled figures.</b> {visuals.assumptionNote}</p>}
    <MarketPanel details={details} visuals={visuals} />
    <CompetitionPanel details={details} visuals={visuals} />
    <FinancialPanel details={details} visuals={visuals} />
    <div className="paid-category-grid">{others.map(([title, items]) => <DetailList key={title} title={title} items={items} />)}</div>
    <RiskMatrix risks={details.riskRegister ?? []} />
    {funding && <section className="funding-readiness"><div className="funding-score"><span>Funding readiness</span><GaugeArc value={funding.score} label="Funding readiness" /><div className="valuation-note"><span>Valuation range</span><strong>{funding.valuationRange ?? 'Needs validation'}</strong></div></div><div className="funding-content">
      <DetailList title="Potential investor fit" items={funding.investorFit} /><DetailList title="Relevant programs" items={funding.relevantPrograms} /><DetailList title="Pitch gaps" items={funding.pitchGaps} /><DetailList title="Likely investor questions" items={funding.likelyQuestions} />
    </div></section>}
    {plan && <ActionTimeline plan={plan} milestones={visuals?.milestones ?? []} />}
  </div>;
}
