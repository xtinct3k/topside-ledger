# Topside Ledger

A private ARC Raiders stash manager. It tells you what to keep, what to sell, what to recycle and what you still need to find, using the full game database: every item, workshop station level, quest, trader and ARC.

**Stack:** Vite · React 18 · TypeScript · Zustand, with Vercel Functions (`api/`) for sync and game data.

## Screens

| Screen | What it does |
|---|---|
| Stash | Every item you hold or need, with a verdict: **Short**, **Keep**, **Sell**, **Recycle** or **Gear**, and why. |
| Workshop | All 9 stations and every level's parts. **Build** raises the level and takes the parts out of your stash. |
| Quests | All trader quests with objectives, hand-ins, rewards and unlock chains. **Turn in** takes the items out of your stash. |
| Database | All items: value, rarity, recipe, recycle output and value, drops, traders, stats. |
| Traders | Each trader's stock and prices. |
| ARCs | Every ARC and what it drops, with drops you still need marked. |
| Events | Map conditions live now and coming up. |
| Raids | Log raids; extracted loot goes into your stash. |

Click any item anywhere for the detail panel. Press `/` to search all items.

### How the advice works

"Needed" adds up every unbuilt station level (or only each station's next level, if you switch the plan), every unfinished quest's hand-ins (optional), and your **Always keep** amounts.

- **Short**: you have less than that.
- **Keep**: all of it is spoken for.
- **Recycle**: spare units whose recycle parts you're short on, or whose parts are worth more than the item.
- **Sell**: other spare units.
- **Gear**: weapons, shields, quick-use items, keys, mods and blueprints. They show their value, but the call is yours.

**Copy for Claude** (sidebar) copies a plain-text snapshot of your progress and the advice. Paste it into a Claude chat to ask questions. No API key needed.

## How it fits together

| Part | Where | Notes |
|---|---|---|
| Your progress | Upstash Redis (one key) | Behind `APP_PASSWORD`. Browser keeps a cached copy; edits sync automatically. |
| Game data | [MetaForge](https://metaforge.app/arc-raiders) via `api/game` | Items, stations, quests, ARCs, traders. Trimmed to one bundle, cached 6 h on Vercel's CDN. |
| Event schedule | MetaForge via `api/events` | Cached 10 min. |

No game-account access of any kind: nothing reads your Embark session.

## Deploy on Vercel

1. **Import** the GitHub repo (Add New → Project). Keep the defaults.
2. **Storage:** project → Storage → Create Database → **Upstash for Redis** (free plan) → connect it to this project. It adds the `KV_REST_API_*` variables.
3. **Environment variable** (Settings → Environment Variables): `APP_PASSWORD`, the password you'll unlock the site with. Make it long.
4. **Redeploy** (Deployments → ⋯ → Redeploy) so the new variables take effect.

Until `APP_PASSWORD` and the database are set, the site shows a setup message and serves no data.

## Run locally

Needs Node 20+.

```bash
npm install
echo APP_PASSWORD=devpass > .env.local
npm run dev        # http://localhost:5173, API included
npm run typecheck
npm test           # advisor and save-migration checks, no network
```

Without Redis variables, local dev keeps the ledger in memory.

## Data

Live game data comes from MetaForge (`server/game.ts`). `src/data.ts` holds what it doesn't cover: save migration from older versions, the raid map list, and hand-written farming tips. Saves from before this version are converted on load: station levels move to MetaForge's ids, and the old Stockpile job becomes **Always keep** amounts. Use the sidebar for **Export / Import** backups (JSON).
