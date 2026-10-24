import { getGame } from "../server/game.js";
import { fail, json } from "../server/http.js";

// Public game data only, so no password; Vercel's CDN caches it for six hours.
export async function GET() {
  try {
    return json({ source: "metaforge.app", ...(await getGame()) }, 200, {
      "cache-control": "public, max-age=1800, s-maxage=21600, stale-while-revalidate=604800",
    });
  } catch {
    return fail(502, "game_unavailable", "MetaForge game data is unavailable right now.");
  }
}
