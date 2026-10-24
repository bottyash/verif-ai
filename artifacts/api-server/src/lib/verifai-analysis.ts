import { z } from "zod/v4";
import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
import { openai } from "@workspace/integrations-openai-ai-server";
import type {
  IdeaRecord,
  PaidReportDetails,
  ReportHeadlineSnapshot,
} from "@workspace/db";

const agentOutputSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.string()).min(1),
  improvements: z.array(z.string()).min(1),
  evidence: z.array(z.string()).min(1),
});

const synthesisSchema = z.object({
  verdict: z.string().min(1),
  summary: z.string().min(1),
  comparisons: z.array(z.unknown()).min(2),
  nextSteps: z.array(z.unknown()).min(2),
  headlineSnapshot: z.object({
    market: z.object({
      tam: z.string().nullable(),
      sam: z.string().nullable(),
      som: z.string().nullable(),
      cagr: z.string().nullable(),
      stage: z.enum(["emerging", "growing", "saturated", "unknown"]),
    }),
    audience: z.object({
      primarySegment: z.string().nullable(),
      ageGroup: z.string().nullable(),
      estimatedReachableUsers: z.string().nullable(),
      topRegion: z.string().nullable(),
    }),
    financialSignals: z.object({
      startupCostRange: z.string().nullable(),
      breakEvenTimeline: z.string().nullable(),
      roiRating: z.enum(["low", "medium", "high"]).nullable(),
    }),
    quickRatings: z.object({
      technicalFeasibility: z.number().int().min(1).max(5),
      competitionPressure: z.number().int().min(1).max(5),
      legalComplexity: z.number().int().min(1).max(5),
      goToMarketDifficulty: z.number().int().min(1).max(5),
    }),
  }),
  paidDetails: z.object({
    marketAnalysis: z.array(z.string().min(1)).min(1).max(6),
    customerAnalysis: z.array(z.string().min(1)).min(1).max(6),
    competitorAnalysis: z.array(z.string().min(1)).max(6),
    financialModel: z.array(z.string().min(1)).min(1).max(6),
    technicalPlan: z.array(z.string().min(1)).min(1).max(6),
    goToMarket: z.array(z.string().min(1)).min(1).max(6),
    riskRegister: z.array(z.object({
      risk: z.string().min(1),
      likelihood: z.enum(["low", "medium", "high"]),
      impact: z.enum(["low", "medium", "high"]),
      mitigation: z.string().min(1),
    })).min(1).max(6),
    legalCompliance: z.array(z.string().min(1)).min(1).max(6),
    fundingReadiness: z.object({
      score: z.number().int().min(0).max(100),
      investorFit: z.array(z.string().min(1)).min(1).max(4),
      relevantPrograms: z.array(z.string().min(1)).min(1).max(4),
      pitchGaps: z.array(z.string().min(1)).min(1).max(4),
      valuationRange: z.string().nullable(),
      likelyQuestions: z.array(z.string().min(1).max(500)).min(1).transform((items) => items.slice(0, 4)),
    }),
    actionPlan: z.object({
      thisWeek: z.array(z.string().min(1)).min(1).max(4),
      thisMonth: z.array(z.string().min(1)).min(1).max(4),
      thisQuarter: z.array(z.string().min(1)).min(1).max(4),
      validationExperiments: z.array(z.string().min(1)).min(1).max(4),
    }),
  }),
});

const agents = [
  {
    key: "market",
    title: "Market & investor fit",
    focus: "customer pain, market shape, realistic TAM/SAM/SOM inputs, funding fit, and business viability",
  },
  {
    key: "technology",
    title: "Technical feasibility",
    focus: "the smallest feasible product, engineering complexity, data dependencies, and major technical risks",
  },
  {
    key: "customers",
    title: "Customer & business model",
    focus: "buyer and user clarity, customer segments, pricing logic, willingness-to-pay evidence, and revenue model",
  },
  {
    key: "go_to_market",
    title: "Go-to-market",
    focus: "a practical first-customer acquisition path in India, distribution channels, and early traction tests",
  },
  {
    key: "risks",
    title: "Risk analysis",
    focus: "market, competition, execution, team, capital, and adoption risks with concrete mitigations",
  },
  {
    key: "legal",
    title: "Legal & compliance",
    focus: "Indian entity, IP, privacy, consumer protection, and sector-regulatory questions that require qualified review",
  },
] as const;

type AgentKey = (typeof agents)[number]["key"];

type AgentSection = {
  key: AgentKey;
  title: string;
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  evidence: string[];
};

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as unknown;
}

const bulletTextKeys = [
  "text",
  "title",
  "summary",
  "description",
  "comparison",
  "alternative",
  "status_quo",
  "statusQuo",
  "workaround",
  "tradeoff",
  "trade_off",
  "rationale",
  "action",
  "recommendation",
  "next_step",
  "nextStep",
  "success_signal",
  "successSignal",
  "timeframe",
] as const;

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !["id", "type", "status"].includes(key.toLowerCase()))
      .flatMap(([, child]) => collectStrings(child));
  }
  return [];
}

function formatReportBullets(items: unknown[], field: string): string[] {
  return items.map((item, index) => {
    if (typeof item === "string" && item.trim()) return item.trim();

    if (item && typeof item === "object" && !Array.isArray(item)) {
      const record = item as Record<string, unknown>;
      const preferred = bulletTextKeys.flatMap((key) => collectStrings(record[key]));
      const parts = [...new Set(preferred.length ? preferred : collectStrings(record))];
      if (parts.length > 0) return parts.join(" — ");
    }

    throw new Error(`The VC synthesis returned an invalid ${field} item at position ${index + 1}.`);
  });
}

const synthesisSystemPrompt = `
You are the synthesis analyst for an Indian founder's idea-validation report.
Return exactly one JSON object with these keys and shapes:
{
  "verdict": "string",
  "summary": "string",
  "comparisons": ["string", "string"],
  "nextSteps": ["FRAME: ...", "TEST: ...", "SHARPEN: ..."],
  "headlineSnapshot": {
    "market": {"tam": "string or null", "sam": "string or null", "som": "string or null", "cagr": "string or null", "stage": "emerging|growing|saturated|unknown"},
    "audience": {"primarySegment": "string or null", "ageGroup": "string or null", "estimatedReachableUsers": "string or null", "topRegion": "string or null"},
    "financialSignals": {"startupCostRange": "string or null", "breakEvenTimeline": "string or null", "roiRating": "low|medium|high|null"},
    "quickRatings": {"technicalFeasibility": 1, "competitionPressure": 1, "legalComplexity": 1, "goToMarketDifficulty": 1}
  },
  "paidDetails": {
    "marketAnalysis": ["string"],
    "customerAnalysis": ["string"],
    "competitorAnalysis": ["string"],
    "financialModel": ["string"],
    "technicalPlan": ["string"],
    "goToMarket": ["string"],
    "riskRegister": [{"risk":"string","likelihood":"low|medium|high","impact":"low|medium|high","mitigation":"string"}],
    "legalCompliance": ["string"],
    "fundingReadiness": {"score": 50, "investorFit": ["string"], "relevantPrograms": ["string"], "pitchGaps": ["string"], "valuationRange": "string or null", "likelyQuestions": ["up to four strings"]},
    "actionPlan": {"thisWeek":["string"],"thisMonth":["string"],"thisQuarter":["string"],"validationExperiments":["string"]}
  }
}
Do not add markdown or extra keys. In the actual response, use JSON null (not the text "null") for unknown nullable fields. Use only the founder's input and supplied analyst sections; no web research is connected. Never invent market sizes, CAGR, reachable-user counts, startup costs, break-even dates, named competitors, funding programs, valuations, customer interviews, or traction. For any headline field that cannot be estimated from supplied evidence and explicit assumptions, return null. If a numeric estimate is possible, show a range, label it as directional, and state its key assumption in the paid details. Market stage may be unknown.

Use 1-6 concise, useful bullets per paid category. Market analysis should cover sizing method and assumptions, bottom-up/top-down only when supported, trends, growth drivers/headwinds, timing, geography, and adjacent opportunities; mark external trend data as research needed. Customer analysis should cover personas, segment characteristics, willingness to pay, pain points/jobs-to-be-done, CAC/LTV, churn, and retention, marking unsupported values as assumptions. Competitor analysis should compare direct/indirect alternatives, differentiation and moat; no named competitors, market shares, or funding history unless present in founder input. Financial model should cover revenue model, pricing, scenario projections, unit economics, burn/runway, break-even, startup costs, funding needs, ROI, and sensitivity; label all modeled figures as assumptions. Technical plan should cover stack and rationale, architecture, MVP vs v2, complexity, timeline/team, build-vs-buy, cost, scalability, and risks. Go-to-market should cover staged growth, channel ranking, first 100 customers, messaging, partnerships, and a 90-day plan; do not invent CAC. Risk register items each need likelihood, impact, and a practical mitigation. Legal and compliance should cover possible entity, licensing, privacy, IP, sector, founder agreement, ESOP, and deadlines as questions for qualified Indian counsel, not legal advice. RelevantPrograms may name only a program supplied by the founder; otherwise say research is needed. ValuationRange must be null unless concrete supporting inputs were supplied. Funding readiness is a cautious directional score based on evidence completeness, not investor endorsement. Action plan should prioritize this week, this month, this quarter, and small validation experiments.

For quick ratings use integers 1-5: technicalFeasibility 5 means easier to build; competitionPressure 5 means more crowded; legalComplexity 5 means more complex; goToMarketDifficulty 5 means harder to acquire customers. When evidence is thin, use neutral 3 and explain uncertainty in paid details. The verdict and summary explain why the idea received its score and are only shown in the paid report. Comparisons should describe trade-offs versus status quo/workarounds without fabricating named companies. The nextSteps are AI-generated founder suggestions, not requests to rewrite answers: exactly three suggestions, one framing prefixed FRAME:, one small execution experiment prefixed TEST:, and one idea/product refinement prefixed SHARPEN:. State that this is an early directional assessment, not investment, legal, or financial advice.
`.trim();

export function ideaContext(idea: IdeaRecord): string {
  return JSON.stringify(
    {
      name: idea.name,
      description: idea.description,
      problem: idea.problem,
      targetCustomer: idea.targetCustomer,
      targetMarket: idea.targetMarket,
      answers: idea.answers,
    },
    null,
    2,
  );
}

async function analyzeSection(
  idea: IdeaRecord,
  agent: (typeof agents)[number],
): Promise<AgentSection> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are an independent startup-validation analyst. Assess only the assigned area. Return one JSON object with score (0-100), summary, strengths (1-3 strings), improvements (1-3 strings), and evidence (1-3 strings). Ground claims only in the supplied founder input. Never invent market statistics, named competitors, legal requirements, customer interviews, or traction. Label missing facts as assumptions to verify. If you identify India-specific legal or regulatory issues, frame them as questions for qualified counsel, not legal advice. Be candid and balanced; do not exaggerate weaknesses to sell a paid report.",
      },
      {
        role: "user",
        content: `Evaluate this idea for ${agent.focus}. Return only valid JSON.\n\nFounder input:\n${ideaContext(idea)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`The ${agent.title} analyst returned no content.`);
  const result = agentOutputSchema.parse(extractJson(content));

  return {
    key: agent.key,
    title: agent.title,
    score: Math.round(result.score),
    summary: result.summary,
    strengths: result.strengths,
    improvements: result.improvements,
    evidence: result.evidence,
  };
}

export async function analyzeStartupIdea(idea: IdeaRecord) {
  const sections = await batchProcess(
    [...agents],
    (agent) => analyzeSection(idea, agent),
    { concurrency: 2, retries: 3 },
  );

  const aggregateScore = Math.round(
    sections.reduce((total, section) => total + section.score, 0) / sections.length,
  );
  const synthesis = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: synthesisSystemPrompt,
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            founderInput: JSON.parse(ideaContext(idea)),
            aggregateScore,
            sections,
          },
          null,
          2,
        ),
      },
    ],
  });

  const content = synthesis.choices[0]?.message?.content;
  if (!content) throw new Error("The VC orchestrator returned no synthesis.");
  const final = synthesisSchema.parse(extractJson(content));
  const paidDetails: PaidReportDetails = {
    ...final.paidDetails,
    scoreBreakdown: sections.map((section) => ({
      key: section.key,
      title: section.title,
      score: section.score,
      weightPercent: 100 / sections.length,
    })),
  };
  const headlineSnapshot: ReportHeadlineSnapshot = {
    ...final.headlineSnapshot,
    teasers: {
      criticalRiskCount: paidDetails.riskRegister.filter(
        (risk) => risk.impact === "high" || risk.likelihood === "high",
      ).length,
      competitorReviewCount: paidDetails.competitorAnalysis.length,
      legalReviewCount: paidDetails.legalCompliance.length,
      fundingReadinessAvailable: true,
    },
  };

  return {
    score: aggregateScore,
    verdict: final.verdict,
    summary: final.summary,
    sections,
    comparisons: formatReportBullets(final.comparisons, "comparison"),
    nextSteps: formatReportBullets(final.nextSteps, "next-step"),
    headlineSnapshot,
    paidDetails,
  };
}
