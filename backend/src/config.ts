import { z } from "zod";

const envSchema = z.object({
  RPC_URL: z.string().url(),
  CHAIN_ID: z.coerce.number().int().positive(),
  USDC_CONTRACT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  FAUCET_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  DRIP_AMOUNT: z.coerce.number().positive(),
  DRIP_DECIMALS: z.coerce.number().int().min(0).max(18).default(6),
  COOLDOWN_HOURS: z.coerce.number().positive().default(24),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default("*"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${msg}`);
  }
  return parsed.data;
}
