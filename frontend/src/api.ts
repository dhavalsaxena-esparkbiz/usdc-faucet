const base = import.meta.env.VITE_API_URL ?? "";

export type FaucetInfo = {
  chainId: number;
  contractAddress: string;
  faucetAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  dripAmount: number;
  dripAmountFormatted: string;
  faucetTokenBalance: string;
  mintMode?: boolean;
  totalWalletsFunded: number;
  cooldownHours: number;
};

export async function fetchInfo(): Promise<FaucetInfo> {
  const res = await fetch(`${base}/api/info`);
  if (!res.ok) throw new Error("Could not load faucet info");
  return res.json();
}

export async function requestDrip(address: string): Promise<{ txHash: string }> {
  const res = await fetch(`${base}/api/drip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address }),
  });
  const data = (await res.json()) as { txHash?: string; error?: string; retryAfterSeconds?: number };
  if (!res.ok) {
    if (data.retryAfterSeconds) {
      throw new Error(`Cooldown: try again in ${formatDuration(data.retryAfterSeconds)}`);
    }
    throw new Error(data.error ?? "Request failed");
  }
  return { txHash: data.txHash! };
}

export async function fetchCooldown(address: string): Promise<{ canDrip: boolean; retryAfterSeconds?: number }> {
  const res = await fetch(`${base}/api/cooldown/${address}`);
  if (!res.ok) return { canDrip: true };
  return res.json();
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}
