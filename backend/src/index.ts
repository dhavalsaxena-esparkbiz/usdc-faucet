import "./env.js";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isAddress } from "viem";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { getLastDrip, openDb, recordDrip } from "./db.js";
import { createFaucetClients, getFaucetInfo, sendDrip } from "./faucet.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = loadConfig();
const clients = createFaucetClients(config);
const db = openDb();

const app = express();
app.use(express.json());

const corsOrigins =
  config.CORS_ORIGIN === "*"
    ? true
    : config.CORS_ORIGIN.split(",").map((o) => o.trim());

app.use(cors({ origin: corsOrigins }));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const staticDir = path.join(__dirname, "..", "public");
app.use(express.static(staticDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/info", async (_req, res) => {
  try {
    const info = await getFaucetInfo(clients);
    res.json(info);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load faucet info" });
  }
});

const dripBodySchema = z.object({
  address: z.string(),
});

app.post("/api/drip", async (req, res) => {
  const parsed = dripBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { address } = parsed.data;
  if (!isAddress(address)) {
    res.status(400).json({ error: "Invalid Ethereum address" });
    return;
  }

  const normalized = address.toLowerCase();
  const cooldownMs = config.COOLDOWN_HOURS * 60 * 60 * 1000;
  const last = getLastDrip(db, normalized);
  const now = Date.now();

  if (last !== null && now - last < cooldownMs) {
    const retryAfterMs = cooldownMs - (now - last);
    res.status(429).json({
      error: "Cooldown active for this address",
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    });
    return;
  }

  try {
    const txHash = await sendDrip(clients, address);
    recordDrip(db, normalized, txHash, now);
    res.json({ txHash, explorerNote: "Check your chain block explorer for confirmation." });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Drip failed";
    res.status(500).json({ error: message });
  }
});

app.get("/api/cooldown/:address", (req, res) => {
  const { address } = req.params;
  if (!isAddress(address)) {
    res.status(400).json({ error: "Invalid address" });
    return;
  }
  const last = getLastDrip(db, address);
  if (last === null) {
    res.json({ canDrip: true });
    return;
  }
  const cooldownMs = config.COOLDOWN_HOURS * 60 * 60 * 1000;
  const elapsed = Date.now() - last;
  if (elapsed >= cooldownMs) {
    res.json({ canDrip: true });
    return;
  }
  res.json({
    canDrip: false,
    retryAfterSeconds: Math.ceil((cooldownMs - elapsed) / 1000),
  });
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(staticDir, "index.html"), (err) => {
    if (err) next();
  });
});

app.listen(config.PORT, () => {
  console.log(`USDC faucet listening on http://localhost:${config.PORT}`);
});
