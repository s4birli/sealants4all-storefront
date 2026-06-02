import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { runChannelExport } from "../../../channel-sync/run-export";

const SUMMARY = resolve(process.cwd(), "exports", "channel-sync", "summary.json");
const OUTBOX = resolve(process.cwd(), "exports", "channel-sync", "outbox.jsonl");

function readStatus() {
  const summary = existsSync(SUMMARY)
    ? JSON.parse(readFileSync(SUMMARY, "utf8"))
    : null;
  const pending = existsSync(OUTBOX)
    ? readFileSync(OUTBOX, "utf8").split("\n").filter(Boolean).length
    : 0;
  return { summary, pending_outbox_events: pending };
}

/** GET /admin/channel-sync → latest export summary + pending outbox count. */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.json(readStatus());
}

/** POST /admin/channel-sync → regenerate draft feeds from the live catalogue. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const summary = await runChannelExport(req.scope);
    res.json({ ok: true, summary });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
}
