import { z } from "zod/v4";
import { batchProcess } from "@workspace/integrations-openai-ai-server/batch";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { IdeaRecord } from "@workspace/db";

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
        content:
          "You are the VC-orchestrator for an Indian founder's idea validation report. Return only JSON with verdict, summary, comparisons (at least 2), and nextSteps (exactly 3). Synthesize the analyst findings without inventing external evidence. State that this is an early directional assessment, not investment, legal, or financial advice. Make the comparisons explain the strengths and trade-offs versus the status quo/workarounds, not fabricate named companies. The three nextSteps are AI-generated idea refinement suggestions, not requests for the founder to edit answers: provide one sharper positioning/framing suggestion prefixed 'FRAME:', one concrete execution experiment prefixed 'TEST:', and one product/idea refinement suggestion prefixed 'SHARPEN:'. Ground each in the supplied idea or analyst findings, state assumptions as assumptions, and make the experiment small enough to run in roughly two weeks.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            idea: {
              name: idea.name,
              description: idea.description,
              targetMarket: idea.targetMarket,
            },
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

  return {
    score: aggregateScore,
    verdict: final.verdict,
    summary: final.summary,
    sections,
    comparisons: formatReportBullets(final.comparisons, "comparison"),
    nextSteps: formatReportBullets(final.nextSteps, "next-step"),
  };
}
