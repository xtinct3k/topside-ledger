import { getEvents } from "../server/game.js";
import { fail, json } from "../server/http.js";

// Map event schedule; it moves on, so the CDN keeps it for ten minutes.
export async function GET() {
  try {
    return json({ source: "metaforge.app", events: await getEvents() }, 200, {
      "cache-control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
    });
  } catch {
    return fail(502, "events_unavailable", "MetaForge event data is unavailable right now.");
  }
}
