import express from "express";
import cors from "cors";
import pino from "pino";
import { z } from "zod";
import Database from "better-sqlite3";

const logger = pino();
export const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const db = new Database("./data.db");
db.exec(`CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vc_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL
);`);

type LogRow = { id: number; vc_hash: string; status: string; details: string | null; created_at: number };

const logSchema = z.object({
  vcHash: z.string().min(1),
  status: z.enum(["success","failure"]),
  details: z.any().optional(),
  timestamp: z.number().int().nonnegative(),
  source: z.enum(["device","pwa"]).optional(),
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/logs", (req, res) => {
  const body = req.body;
  if (!Array.isArray(body)) {
    return res.status(400).json({ error: "Expected array" });
  }
  const insert = db.prepare("INSERT INTO logs (vc_hash,status,details,created_at) VALUES (?,?,?,?)");
  const txn = db.transaction((items: unknown[]) => {
    for (const item of items) {
      const parsed = logSchema.safeParse(item);
      if (!parsed.success) {
        throw new Error("Invalid log: " + parsed.error.message);
      }
      const { vcHash, status, details, timestamp } = parsed.data;
      insert.run(vcHash, status, JSON.stringify(details ?? null), timestamp);
    }
  });
  try {
    txn(body);
    res.json({ stored: body.length });
  } catch (e: any) {
    logger.error(e);
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/logs", (req, res) => {
  const { q, limit = "100", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(String(limit) || "100", 10), 1000);
  const off = parseInt(String(offset) || "0", 10);
  if (q) {
    const rows = db
      .prepare<unknown[]>(
        "SELECT * FROM logs WHERE vc_hash LIKE ? OR status LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .all(`%${q}%`, `%${q}%`, lim, off) as LogRow[];
    return res.json(rows);
  } else {
    const rows = db
      .prepare<unknown[]>("SELECT * FROM logs ORDER BY created_at DESC LIMIT ? OFFSET ?")
      .all(lim, off) as LogRow[];
    return res.json(rows);
  }
});

app.delete("/api/logs", (_req, res) => {
  db.prepare("DELETE FROM logs").run();
  res.json({ ok: true });
});

export function start(port = process.env.PORT ? Number(process.env.PORT) : 4000) {
  return app.listen(port, () => {
    logger.info({ port }, "server started");
  });
}

if (require.main === module) {
  start();
}
