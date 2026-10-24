import { StorageMissing, loadLedger, saveLedger } from "../server/db.js";
import { fail, json, readJson, requireAuth } from "../server/http.js";
import { sanitize } from "../src/state.js";

const storageError = () =>
  fail(500, "storage_missing", "Connect an Upstash Redis database to this project in Vercel (Storage tab), then redeploy.");

export async function GET(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  try {
    return json(await loadLedger());
  } catch (e) {
    if (e instanceof StorageMissing) return storageError();
    throw e;
  }
}

export async function PUT(req: Request) {
  const denied = await requireAuth(req);
  if (denied) return denied;
  let body: { state?: unknown; baseRev?: unknown };
  try {
    body = ((await readJson(req)) ?? {}) as typeof body;
  } catch {
    return fail(400, "bad_request", "Body must be JSON.");
  }
  try {
    const { ok, ledger } = await saveLedger(sanitize(body.state), Number(body.baseRev) || 0);
    return ok ? json(ledger) : json({ error: "conflict", message: "Changed on another device.", ledger }, 409);
  } catch (e) {
    if (e instanceof StorageMissing) return storageError();
    throw e;
  }
}
