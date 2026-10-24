# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- Report chart data (`paidDetails.visuals`) is optional and parsed leniently, so older stored reports still load; the UI hides any chart whose data is missing. All modelled figures are labelled as assumptions, in INR.
- Idea Neighbors (paid report): YC companies/RFS from `data/yc_ideas.json`. The Replit OpenAI connection has no embeddings, so retrieval is an LLM shortlist (keyword prefilter past 120 records) then an LLM pick of 5; ids outside the shortlist are dropped. Results cache by hash of dataset version + normalized idea text (memory + `.cache/idea-neighbors/`); 10 new lookups/user/hour. Views and YC link clicks are logged as `neighbors_viewed` / `neighbors_yc_link_clicked` in the unlock-events table. Refresh the dataset with `pnpm --filter @workspace/scripts run refresh-yc` (`--add slug,slug`, `--rfs`, `--dry-run`); it honours robots.txt.
- The free report shows only a numberless "Who's already near you?" teaser line for Idea Neighbors — never a made-up count.
- The admin link in the workspace menu uses `GET /verifai/admin/access` as a navigation hint only; every admin data route still enforces the server-side allowlist.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- Typography: Sora for body and headlines; DaVinci for accents. DaVinci is a paid font, so Cormorant Garamond stands in via `--app-font-accent` in `artifacts/verifai/src/index.css` — put a licensed DaVinci file first in that variable to switch.
- Logo: a single "V with a dot" mark (xAI-inspired cut strokes), shared from `src/components/brand.tsx` and mirrored in `public/favicon.svg` / `public/logo.svg`.
- No permanent sidebar; navigation lives in a top-bar menu button. Keep layout and proportions close to the existing design when restyling.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
