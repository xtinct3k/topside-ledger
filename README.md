# Topside Ledger

A private ARC Raiders progress tracker: workshop station levels, upgrade jobs, the parts you still need, and a raid log, with an optional Claude assistant that can update everything from a plain-language message.

**Stack:** Vite · React 18 · TypeScript · Framer Motion · Zustand, with Vercel Functions (`api/`) for sync, item data and the assistant.

## How it fits together

| Part | Where | Notes |
|---|---|---|
| Your progress | Upstash Redis (one key) | Behind `APP_PASSWORD`. Browser keeps a cached copy; edits sync automatically. |
| Item data and icons | [MetaForge](https://metaforge.app/arc-raiders) via `api/catalog` | Public game data, cached a day on Vercel's CDN. Attribution is in the footer. |
| Assistant | `api/chat` → Claude API | Haiku 5.5 for "log in words", Sonnet 5.5 for questions. Off until `ANTHROPIC_API_KEY` is set. |

No game-account access of any kind: nothing reads your Embark session.

## Deploy on Vercel

1. **Import** the GitHub repo (Add New → Project). Keep the defaults.
2. **Storage:** project → Storage → Create Database → **Upstash for Redis** (free plan) → connect it to this project. It adds the `KV_REST_API_*` variables.
3. **Environment variables** (Settings → Environment Variables):
   - `APP_PASSWORD`: the password you'll unlock the site with. Make it long.
   - `ANTHROPIC_API_KEY`: optional, from console.anthropic.com. Set a monthly spend limit there.
4. **Redeploy** (Deployments → ⋯ → Redeploy) so the new variables take effect.

Until `APP_PASSWORD` and the database are set, the site shows a setup message and serves no data.

## Run locally

Needs Node 20+.

```bash
npm install
echo APP_PASSWORD=devpass > .env.local   # add ANTHROPIC_API_KEY=... to try the assistant
npm run dev                              # http://localhost:5173, API included
npm run typecheck
npm test                                 # assistant tool-loop checks, no API calls
```

Without Redis variables, local dev keeps the ledger in memory.

## Data

Jobs, tracked items and stations are in `src/data.ts`, keyed by MetaForge item ids. Use the ⋯ menu for **Export / Import backup** (JSON).
