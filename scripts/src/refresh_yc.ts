/**
 * Refresh data/yc_ideas.json from public Y Combinator pages.
 *
 *   pnpm --filter @workspace/scripts run refresh-yc                     # update batch/status/tags of existing companies
 *   pnpm --filter @workspace/scripts run refresh-yc -- --add stripe,deel # also add these company slugs
 *   pnpm --filter @workspace/scripts run refresh-yc -- --rfs            # also add RFS entries not yet in the file
 *   pnpm --filter @workspace/scripts run refresh-yc -- --dry-run        # print changes without writing
 *
 * Etiquette: reads robots.txt first and skips any disallowed path, fetches one
 * page at a time with a delay, identifies itself in the User-Agent, and only
 * reads individual public company pages and the public /rfs page (never the
 * disallowed /companies?query listings). Summaries you have edited by hand are
 * kept; only batch, status and tags are refreshed for existing records. Review
 * YC's terms of use before running this at any scale.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type YcRecord = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  batch: string | null;
  status: string | null;
  url: string;
  type: "rfs" | "company";
};

const ORIGIN = "https://www.ycombinator.com";
const USER_AGENT = "VerifAI-dataset-refresh/1.0 (manual, low-volume)";
const DELAY_MS = 1500;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dataFile = path.join(repoRoot, "data", "yc_ideas.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const includeRfs = args.includes("--rfs");
const addIndex = args.indexOf("--add");
const addSlugs = addIndex >= 0 ? (args[addIndex + 1] ?? "").split(",").map((slug) => slug.trim()).filter(Boolean) : [];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function decode(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/* ---------- robots.txt ---------- */

async function loadDisallowRules(): Promise<RegExp[]> {
  const response = await fetch(`${ORIGIN}/robots.txt`, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Could not read robots.txt (HTTP ${response.status}); stopping to be safe.`);
  const lines = (await response.text()).split(/\r?\n/);
  const rules: RegExp[] = [];
  let appliesToUs = false;
  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") appliesToUs = value === "*";
    else if (appliesToUs && key === "disallow" && value) {
      const pattern = value.replace(/[.+^${}()|[\]\\?]/g, "\\$&").replace(/\*/g, ".*");
      rules.push(new RegExp(`^${pattern}`));
    }
  }
  return rules;
}

function isAllowed(rules: RegExp[], pathname: string): boolean {
  return !rules.some((rule) => rule.test(pathname));
}

async function politeFetch(rules: RegExp[], pathname: string): Promise<string | null> {
  if (!isAllowed(rules, pathname)) {
    console.warn(`robots.txt disallows ${pathname}; skipping.`);
    return null;
  }
  await sleep(DELAY_MS);
  const response = await fetch(`${ORIGIN}${pathname}`, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) {
    console.warn(`HTTP ${response.status} for ${pathname}; skipping.`);
    return null;
  }
  return decode(await response.text());
}

/* ---------- Parsing ---------- */

function field(html: string, key: string): string | null {
  const match = html.match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`));
  return match ? JSON.parse(`"${match[1]}"`) as string : null;
}

type CompanyFacts = { title: string; oneLiner: string | null; batch: string | null; status: string | null; tags: string[] };

function parseCompany(html: string): CompanyFacts | null {
  const title = field(html, "name");
  if (!title) return null;
  const tagsMatch = html.match(/"tags":\[([^\]]*)\]/);
  let tags: string[] = [];
  try {
    tags = tagsMatch ? (JSON.parse(`[${tagsMatch[1]}]`) as string[]) : [];
  } catch {
    tags = [];
  }
  return { title, oneLiner: field(html, "one_liner"), batch: field(html, "batch_name"), status: field(html, "ycdc_status"), tags };
}

function parseRfs(html: string): { anchor: string; title: string; excerpt: string }[] {
  const items: { anchor: string; title: string; excerpt: string }[] = [];
  const skip = new Set(["the-primer", "footer-heading", "toc-container"]);
  for (const match of html.matchAll(/<div id="([a-z0-9-]+)">/g)) {
    const anchor = match[1];
    if (!anchor || skip.has(anchor)) continue;
    const start = (match.index ?? 0) + match[0].length;
    const heading = html.slice(start, start + 3000).match(/<h3[^>]*>([\s\S]*?)<\/h3>/);
    if (!heading) continue;
    const title = heading[1].replace(/<[^>]+>/g, "").trim();
    const bodyStart = start + (heading.index ?? 0) + heading[0].length;
    const text = html.slice(bodyStart, bodyStart + 3000).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!title) continue;
    items.push({ anchor, title, excerpt: `${text.slice(0, 320).replace(/\s+\S*$/, "")}…` });
  }
  return items;
}

/* ---------- Main ---------- */

async function main() {
  const records = JSON.parse(await readFile(dataFile, "utf8")) as YcRecord[];
  const rules = await loadDisallowRules();
  const changes: string[] = [];

  for (const record of records.filter((item) => item.type === "company")) {
    const url = new URL(record.url);
    if (url.origin !== ORIGIN || !url.pathname.startsWith("/companies/")) continue;
    const html = await politeFetch(rules, url.pathname);
    const facts = html ? parseCompany(html) : null;
    if (!facts) continue;
    for (const key of ["batch", "status"] as const) {
      if (facts[key] && facts[key] !== record[key]) {
        changes.push(`${record.id}: ${key} ${record[key] ?? "—"} → ${facts[key]}`);
        record[key] = facts[key];
      }
    }
    if (facts.tags.length && record.tags.length === 0) record.tags = facts.tags;
  }

  for (const slug of addSlugs) {
    const id = `co-${slug}`;
    if (records.some((record) => record.id === id || record.url.endsWith(`/companies/${slug}`))) continue;
    const html = await politeFetch(rules, `/companies/${slug}`);
    const facts = html ? parseCompany(html) : null;
    if (!facts) continue;
    records.push({
      id,
      title: facts.title,
      summary: facts.oneLiner ?? facts.title,
      tags: facts.tags,
      batch: facts.batch,
      status: facts.status,
      url: `${ORIGIN}/companies/${slug}`,
      type: "company",
    });
    changes.push(`added company ${id}`);
  }

  if (includeRfs) {
    const html = await politeFetch(rules, "/rfs");
    const rfsBatch = html?.match(/Requests for Startups[\s\S]{0,400}?((?:Spring|Summer|Fall|Winter) 20\d\d)/)?.[1];
    for (const item of html ? parseRfs(html) : []) {
      const id = `rfs-${item.anchor}`;
      if (records.some((record) => record.id === id || record.url.endsWith(`#${item.anchor}`))) continue;
      records.push({
        id,
        title: item.title,
        summary: item.excerpt,
        tags: [],
        batch: rfsBatch ? `${rfsBatch} RFS` : null,
        status: "Open",
        url: `${ORIGIN}/rfs#${item.anchor}`,
        type: "rfs",
      });
      changes.push(`added RFS ${id} (add tags and tighten the summary by hand)`);
    }
  }

  console.log(changes.length ? changes.join("\n") : "No changes.");
  if (!dryRun && changes.length) {
    await writeFile(dataFile, `${JSON.stringify(records, null, 2)}\n`);
    console.log(`Wrote ${records.length} records to ${path.relative(repoRoot, dataFile)}. Restart the API server to load them.`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
