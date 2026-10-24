import { getCatalog } from "../server/catalog.js";
import { fail, json } from "../server/http.js";

// Public game data only, so no password; Vercel's CDN caches it for a day.
export async function GET() {
  try {
    const items = await getCatalog();
    return json({ source: "metaforge.app", items }, 200, {
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    });
  } catch {
    return fail(502, "catalog_unavailable", "MetaForge item data is unavailable right now.");
  }
}
