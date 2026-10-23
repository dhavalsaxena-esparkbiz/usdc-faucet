import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Monorepo root .env (npm start from repo root)
dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });
// backend/.env override
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const pk = process.env.FAUCET_PRIVATE_KEY?.trim();
if (pk && !pk.startsWith("0x") && /^[a-fA-F0-9]{64}$/.test(pk)) {
  process.env.FAUCET_PRIVATE_KEY = `0x${pk}`;
}
