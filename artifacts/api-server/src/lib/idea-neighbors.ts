import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { IdeaRecord } from "@workspace/db";
import { logger } from "./logger";

/*
 * Idea Neighbors: Y Combinator companies and Requests for Startups that sit
 * close to a founder's idea.
 *
 * The Replit OpenAI connection has no embeddings endpoint, so retrieval is an
 * LLM shortlist over the in-memory dataset (with a cheap keyword prefilter
 * once the dataset grows), followed by a second LLM call that picks the best
 * five and explains the relationship. Every returned id is checked against the
 * shortlisted set, so the model cannot introduce companies that are not in
 * the dataset.
 */

const MODEL = "gpt-5.6-luna";
const SHORTLIST_SIZE = 15;
const FINAL_SIZE = 5;
const PREFILTER_LIMIT = 120;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const MEMORY_CACHE_LIMIT = 500;

export const RELATIONSHIP_TYPES = [
  "Same problem, different approach",
  "Same approach, different market",
  "Adjacent opportunity",
  "Direct competitor",
  "Aligned with YC RFS",
] as const;

const ycRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  tags: z.array(z.string()).default([]),
  batch: z.string().nullable().default(null),
  status: z.string().nullable().default(null),
  url: z.string().url(),
  type: z.enum(["rfs", "company"]),
});
export type YcRecord = z.infer<typeof ycRecordSchema>;

export type IdeaNeighbor = YcRecord & {
  relationshipType: (typeof RELATIONSHIP_TYPES)[number];
  overlap: string;
  differentiationAngle: string;
  lesson: string | null;
};

export type IdeaNeighborsResult = {
  summary: string;
  neighbors: IdeaNeighbor[];
  generatedAt: string;
};

export class NeighborsRateLimitError extends Error {}
export class NeighborsUnavailableError extends Error {}

/* ---------- Dataset ---------- */

function findDataFile(): string {
  if (process.env.YC_IDEAS_PATH) return path.resolve(process.env.YC_IDEAS_PATH);
  const starts = [process.cwd(), path.dirname(fileURLToPath(import.meta.url))];
  for (const start of starts) {
    let dir = start;
    for (let depth = 0; depth < 6; depth += 1) {
      const candidate = path.join(dir, "data", "yc_ideas.json");
      if (existsSync(candidate)) return candidate;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  throw new NeighborsUnavailableError("The YC dataset file data/yc_ideas.json was not found.");
}

type Dataset = { records: YcRecord[]; byId: Map<string, YcRecord>; version: string; cacheDir: string };
let datasetPromise: Promise<Dataset> | null = null;

async function loadDataset(): Promise<Dataset> {
  const file = findDataFile();
  const raw = await readFile(file, "utf8");
  const parsed = z.array(z.unknown()).parse(JSON.parse(raw));
  const records: YcRecord[] = [];
  for (const item of parsed) {
    const record = ycRecordSchema.safeParse(item);
    if (record.success) records.push(record.data);
    else logger.warn({ issue: record.error.issues[0] }, "Skipping invalid YC dataset record");
  }
  const byId = new Map(records.map((record) => [record.id, record]));
  const version = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  const cacheDir = path.join(path.dirname(path.dirname(file)), ".cache", "idea-neighbors");
  logger.info({ records: records.length, version }, "Loaded YC dataset for Idea Neighbors");
  return { records, byId, version, cacheDir };
}

function getDataset(): Promise<Dataset> {
  datasetPromise ??= loadDataset().catch((error: unknown) => {
    datasetPromise = null;
    throw error;
  });
  return datasetPromise;
}

/* ---------- Idea text and cache ---------- */

export function ideaText(idea: IdeaRecord): string {
  const answers = Object.values(idea.answers ?? {})
    .filter((answer): answer is string => typeof answer === "string" && answer.trim().length > 0)
    .map((answer) => answer.trim());
  return [
    `Name: ${idea.name}`,
    `Description: ${idea.description}`,
    idea.problem ? `Problem: ${idea.problem}` : "",
    idea.targetCustomer ? `Target customer: ${idea.targetCustomer}` : "",
    idea.targetMarket ? `Target market: ${idea.targetMarket}` : "",
    answers.length ? `Founder answers:\n- ${answers.join("\n- ")}` : "",
  ].filter(Boolean).join("\n");
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const memoryCache = new Map<string, IdeaNeighborsResult>();
const inFlight = new Map<string, Promise<IdeaNeighborsResult>>();

function remember(key: string, value: IdeaNeighborsResult) {
  memoryCache.delete(key);
  memoryCache.set(key, value);
  if (memoryCache.size > MEMORY_CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
}

async function readDiskCache(dataset: Dataset, key: string): Promise<IdeaNeighborsResult | null> {
  try {
    const raw = await readFile(path.join(dataset.cacheDir, `${key}.json`), "utf8");
    return JSON.parse(raw) as IdeaNeighborsResult;
  } catch {
    return null;
  }
}

async function writeDiskCache(dataset: Dataset, key: string, value: IdeaNeighborsResult) {
  try {
    await mkdir(dataset.cacheDir, { recursive: true });
    await writeFile(path.join(dataset.cacheDir, `${key}.json`), JSON.stringify(value));
  } catch (error) {
    logger.warn({ err: error }, "Could not write the Idea Neighbors disk cache");
  }
}

/* ---------- Rate limiting (new lookups only; cache hits are free) ---------- */

const lookupsByUser = new Map<string, number[]>();

function consumeRateLimit(userId: string) {
  const now = Date.now();
  const recent = (lookupsByUser.get(userId) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    lookupsByUser.set(userId, recent);
    throw new NeighborsRateLimitError("Too many new Idea Neighbors lookups. Try again in a little while.");
  }
  recent.push(now);
  lookupsByUser.set(userId, recent);
}

/* ---------- Retrieval ---------- */

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as unknown;
}

function keywordPrefilter(records: YcRecord[], text: string): YcRecord[] {
  if (records.length <= PREFILTER_LIMIT) return records;
  const words = new Set(normalize(text).split(/[^a-z0-9]+/).filter((word) => word.length > 3));
  const scored = records.map((record) => {
    const haystack = normalize(`${record.title} ${record.summary} ${record.tags.join(" ")}`).split(/[^a-z0-9]+/);
    const score = haystack.reduce((total, word) => total + (words.has(word) ? 1 : 0), 0) + (record.type === "rfs" ? 0.5 : 0);
    return { record, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, PREFILTER_LIMIT).map((entry) => entry.record);
}

const shortlistSchema = z.object({ ids: z.array(z.string()) });

async function shortlist(dataset: Dataset, text: string): Promise<YcRecord[]> {
  const pool = keywordPrefilter(dataset.records, text);
  if (pool.length <= SHORTLIST_SIZE) return pool;
  const catalogue = pool.map((record) => ({
    id: record.id,
    type: record.type,
    title: record.title,
    tags: record.tags,
    summary: record.summary,
  }));
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You shortlist Y Combinator records related to a founder's startup idea. Return JSON {"ids": [...]} with up to ${SHORTLIST_SIZE} ids copied exactly from the catalogue, most related first. Related means: the same problem solved differently, the same approach in a different market, an adjacent opportunity, a direct competitor, or a YC Request for Startups the idea fits. Include relevant "rfs" records. Use only ids from the catalogue.`,
      },
      { role: "user", content: `Return only valid json.\n\nFounder idea:\n${text}\n\nCatalogue:\n${JSON.stringify(catalogue)}` },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("The shortlist step returned no content.");
  const ids = shortlistSchema.parse(extractJson(content)).ids;
  const picked = [...new Set(ids)].map((id) => dataset.byId.get(id)).filter((record): record is YcRecord => Boolean(record));
  return picked.slice(0, SHORTLIST_SIZE);
}

const pickSchema = z.object({
  neighbors: z.array(z.object({
    id: z.string(),
    relationship_type: z.enum(RELATIONSHIP_TYPES),
    overlap: z.string().min(1).max(600),
    differentiation_angle: z.string().min(1).max(600),
    lesson: z.string().max(600).nullable().optional(),
  })),
});

const lessonStatuses = new Set(["inactive", "acquired"]);

async function pickNeighbors(candidates: YcRecord[], text: string): Promise<IdeaNeighbor[]> {
  if (candidates.length === 0) return [];
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 4096,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You help a founder see who is near their idea and how to stand apart. From the candidate Y Combinator records, pick up to ${FINAL_SIZE} that are CLOSE but not exact duplicates. Return exactly {"neighbors":[{"id":"...","relationship_type":"...","overlap":"...","differentiation_angle":"...","lesson":"..." or null}]}.
relationship_type must be one of: ${RELATIONSHIP_TYPES.map((type) => `"${type}"`).join(", ")}. Use "Aligned with YC RFS" only for records with type "rfs", and always use it for them.
overlap: one or two sentences on what the idea shares with the record, grounded in the record summary and the founder input.
differentiation_angle: one or two concrete sentences on how this founder could stand apart (segment, geography, channel, pricing, wedge, or product scope). For an RFS, say how to frame the idea to fit it.
lesson: only for company records whose status is Inactive or Acquired — one sentence on what a founder can take from that outcome, without inventing facts beyond the record. Otherwise null.
Copy ids exactly. Use only the supplied records and founder input; do not invent funding, revenue, or other facts. Skip records that are not genuinely close.`,
      },
      {
        role: "user",
        content: `Return only valid json.\n\nFounder idea:\n${text}\n\nCandidates:\n${JSON.stringify(candidates.map(({ id, type, title, summary, tags, status, batch }) => ({ id, type, title, summary, tags, status, batch })))}`,
      },
    ],
  });
  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("The neighbor selection step returned no content.");
  const parsed = pickSchema.parse(extractJson(content));
  const allowed = new Map(candidates.map((record) => [record.id, record]));
  const seen = new Set<string>();
  const neighbors: IdeaNeighbor[] = [];
  for (const item of parsed.neighbors) {
    const record = allowed.get(item.id);
    if (!record || seen.has(item.id)) continue; // drop anything outside the retrieved set
    seen.add(item.id);
    let relationshipType = item.relationship_type;
    if (record.type === "rfs") relationshipType = "Aligned with YC RFS";
    else if (relationshipType === "Aligned with YC RFS") relationshipType = "Adjacent opportunity";
    const canHaveLesson = record.type === "company" && lessonStatuses.has((record.status ?? "").toLowerCase());
    neighbors.push({
      ...record,
      relationshipType,
      overlap: item.overlap.trim(),
      differentiationAngle: item.differentiation_angle.trim(),
      lesson: canHaveLesson && item.lesson?.trim() ? item.lesson.trim() : null,
    });
    if (neighbors.length >= FINAL_SIZE) break;
  }
  return neighbors;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function summarizeNeighbors(neighbors: IdeaNeighbor[]): string {
  if (neighbors.length === 0) return "No close YC neighbors in the current dataset";
  const rfs = neighbors.filter((item) => item.relationshipType === "Aligned with YC RFS").length;
  const competitors = neighbors.filter((item) => item.relationshipType === "Direct competitor").length;
  const adjacent = neighbors.length - rfs - competitors;
  return [
    rfs ? plural(rfs, "aligned YC request", "aligned YC requests") : "",
    competitors ? plural(competitors, "close competitor", "close competitors") : "",
    adjacent ? plural(adjacent, "adjacent company", "adjacent companies") : "",
  ].filter(Boolean).join(", ");
}

/* ---------- Public entry point ---------- */

export async function findIdeaNeighbors(idea: IdeaRecord, userId: string): Promise<IdeaNeighborsResult> {
  const dataset = await getDataset();
  const text = ideaText(idea);
  const key = createHash("sha256").update(`${dataset.version}:${normalize(text)}`).digest("hex");

  const cached = memoryCache.get(key) ?? (await readDiskCache(dataset, key));
  if (cached) {
    remember(key, cached);
    return cached;
  }
  const pending = inFlight.get(key);
  if (pending) return pending;

  consumeRateLimit(userId);
  const job = (async () => {
    const candidates = await shortlist(dataset, text);
    const neighbors = await pickNeighbors(candidates, text);
    const result: IdeaNeighborsResult = {
      summary: summarizeNeighbors(neighbors),
      neighbors,
      generatedAt: new Date().toISOString(),
    };
    remember(key, result);
    await writeDiskCache(dataset, key, result);
    return result;
  })();
  inFlight.set(key, job);
  try {
    return await job;
  } finally {
    inFlight.delete(key);
  }
}
