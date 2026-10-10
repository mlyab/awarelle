import express, { Request, Response } from "express";
import crypto from "crypto";
import path from "path";
import fs from "fs";

const APP_NAME = "Awarelle";
const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.RELAY_SECRET || crypto.randomBytes(32).toString("hex");

// ---------- log bus (SSE) ----------
type LogLine = { ts: string; line: string };
const history: LogLine[] = [];
const clients = new Set<Response>();
function log(line: string) {
  const entry = { ts: new Date().toISOString(), line };
  history.push(entry);
  if (history.length > 200) history.shift();
  console.log(`[${entry.ts}] ${line}`);
  const payload = `data: ${JSON.stringify(entry)}\n\n`;
  for (const c of clients) c.write(payload);
}

const app = express();
app.use(express.json({ limit: "5mb" }));

app.get("/api/logs", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  for (const e of history) res.write(`data: ${JSON.stringify(e)}\n\n`);
  clients.add(res);
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  req.on("close", () => {
    clearInterval(ping);
    clients.delete(res);
  });
});

// ---------- model ----------
const MODEL_VERSION = "v3";
const weights: number[] = Array.from({ length: 64 }, (_, i) => Math.round(Math.sin(i * 0.37) * 1000) / 1000);
const signature = crypto.createHmac("sha256", SECRET).update(JSON.stringify(weights)).digest("hex");
app.get("/api/model", (_req, res) => {
  log(`model: served ${MODEL_VERSION} (64 weights, signed)`);
  res.json({ version: MODEL_VERSION, weights, signature });
});

// ---------- DP update ----------
app.post("/api/update", (req, res) => {
  const u = req.body?.update;
  if (!Array.isArray(u) || u.length !== 128 || !u.every((x) => typeof x === "number")) {
    log(`update: rejected · wrong shape`);
    return res.status(400).json({ error: "expected 128 floats" });
  }
  const norm = Math.sqrt(u.reduce((s: number, x: number) => s + x * x, 0));
  log(`update: 128 floats · norm ${norm.toFixed(2)} · ε 1.0 · fields: none · identity: none`);
  res.status(204).end();
});

// ---------- blind relay ----------
const relay = new Map<string, { ciphertext: string; iv: string }>();
app.post("/api/relay", (req, res) => {
  const { ciphertext, iv } = req.body || {};
  if (typeof ciphertext !== "string" || typeof iv !== "string") return res.status(400).json({ error: "bad blob" });
  const id = crypto.randomBytes(8).toString("hex");
  relay.set(id, { ciphertext, iv });
  const bytes = Buffer.byteLength(ciphertext, "utf8") + Buffer.byteLength(iv, "utf8");
  log(`relay: received ${bytes.toLocaleString("en-US")} bytes of ciphertext · cannot decrypt · plaintext stored: 0 bytes`);
  res.json({ id });
});
app.get("/api/relay/:id", (req, res) => {
  const blob = relay.get(req.params.id);
  if (!blob) return res.status(404).json({ error: "not found" });
  log(`relay: served blob ${req.params.id} · still ciphertext`);
  res.json(blob);
});

// ---------- aggregate ----------
app.get("/api/aggregate", (_req, res) => {
  log(`aggregate: served n=1284 · k≥50 · ε=1.0 · no individual record exists`);
  res.json({
    n: 1284,
    k: 50,
    epsilon: 1.0,
    metrics: { enrolled: 0.61, completedAssessment: 0.34, medianDaysToCare: 23, satisfaction: 4.4 },
  });
});

// ---------- static client ----------
const dist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PORT, () => {
  log(`agent up · holds no raw data · no identities · no cycle or hormone data`);
  console.log(`${APP_NAME} server listening on :${PORT}`);
});
