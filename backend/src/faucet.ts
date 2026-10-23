import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  parseUnits,
  type Address,
  type Chain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc20Abi } from "./abi/erc20.js";
import type { AppConfig } from "./config.js";

export function buildChain(config: AppConfig): Chain {
  return {
    id: config.CHAIN_ID,
    name: `Chain ${config.CHAIN_ID}`,
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [config.RPC_URL] } },
  };
}

export function createFaucetClients(config: AppConfig) {
  const chain = buildChain(config);
  const account = privateKeyToAccount(config.FAUCET_PRIVATE_KEY as `0x${string}`);
  const transport = http(config.RPC_URL);

  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({
    account,
    chain,
    transport,
  });

  const contract = config.USDC_CONTRACT_ADDRESS as Address;
  const dripAmountWei = parseUnits(
    String(config.DRIP_AMOUNT),
    config.DRIP_DECIMALS
  );

  return {
    publicClient,
    walletClient,
    account,
    contract,
    dripAmountWei,
    config,
  };
}

export async function getFaucetInfo(clients: ReturnType<typeof createFaucetClients>) {
  const { publicClient, account, contract, dripAmountWei, config } = clients;

  const [balance, symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address: contract,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    }),
    publicClient.readContract({
      address: contract,
      abi: erc20Abi,
      functionName: "symbol",
    }),
    publicClient.readContract({
      address: contract,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  ]);

  return {
    chainId: config.CHAIN_ID,
    contractAddress: contract,
    faucetAddress: account.address,
    tokenSymbol: symbol,
    tokenDecimals: decimals,
    dripAmount: config.DRIP_AMOUNT,
    dripAmountFormatted: formatUnits(dripAmountWei, config.DRIP_DECIMALS),
    faucetTokenBalance: formatUnits(balance, decimals),
    mintMode: false,
    cooldownHours: config.COOLDOWN_HOURS,
  };
}

export function formatTransferError(err: unknown): string {
  if (err instanceof BaseError) {
    const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name === "ERC20InsufficientBalance") {
        return "Faucet wallet does not have enough USDC for this drip.";
      }
    }
  }
  const msg = err instanceof Error ? err.message : "Drip failed";
  if (msg.includes("insufficient funds")) {
    return "Faucet wallet needs more native gas (POL/ETH) to send the transfer.";
  }
  return msg;
}

export async function sendDrip(
  clients: ReturnType<typeof createFaucetClients>,
  recipient: Address
) {
  const { walletClient, publicClient, contract, dripAmountWei, account } = clients;

  const balance = await publicClient.readContract({
    address: contract,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (balance < dripAmountWei) {
    throw new Error(
      `Faucet wallet (${account.address}) has insufficient USDC. ` +
        `Need ${formatUnits(dripAmountWei, clients.config.DRIP_DECIMALS)}, ` +
        `have ${formatUnits(balance, clients.config.DRIP_DECIMALS)}.`
    );
  }

  try {
    await publicClient.simulateContract({
      address: contract,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, dripAmountWei],
      account,
    });
  } catch (err) {
    throw new Error(formatTransferError(err));
  }

  let hash: `0x${string}`;
  try {
    hash = await walletClient.writeContract({
      address: contract,
      abi: erc20Abi,
      functionName: "transfer",
      args: [recipient, dripAmountWei],
      account,
    });
  } catch (err) {
    throw new Error(formatTransferError(err));
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error("Transaction reverted");
  }

  return hash;
}
