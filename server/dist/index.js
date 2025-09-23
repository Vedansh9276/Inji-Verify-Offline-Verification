"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pino_1 = __importDefault(require("pino"));
const zod_1 = require("zod");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const logger = (0, pino_1.default)();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "1mb" }));
const db = new better_sqlite3_1.default("./data.db");
db.exec(`CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vc_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  created_at INTEGER NOT NULL
);`);
const logSchema = zod_1.z.object({
    vcHash: zod_1.z.string().min(1),
    status: zod_1.z.enum(["success", "failure"]),
    details: zod_1.z.any().optional(),
    timestamp: zod_1.z.number().int().nonnegative(),
    source: zod_1.z.enum(["device", "pwa"]).optional(),
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
    const txn = db.transaction((items) => {
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
    }
    catch (e) {
        logger.error(e);
        res.status(400).json({ error: e.message });
    }
});
app.get("/api/logs", (req, res) => {
    const { q, limit = "100", offset = "0" } = req.query;
    const lim = Math.min(parseInt(String(limit) || "100", 10), 1000);
    const off = parseInt(String(offset) || "0", 10);
    if (q) {
        const rows = db
            .prepare("SELECT * FROM logs WHERE vc_hash LIKE ? OR status LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
            .all(`%${q}%`, `%${q}%`, lim, off);
        return res.json(rows);
    }
    else {
        const rows = db
            .prepare("SELECT * FROM logs ORDER BY created_at DESC LIMIT ? OFFSET ?")
            .all(lim, off);
        return res.json(rows);
    }
});
app.delete("/api/logs", (_req, res) => {
    db.prepare("DELETE FROM logs").run();
    res.json({ ok: true });
});
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => {
    logger.info({ port }, "server started");
});
