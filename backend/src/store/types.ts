export type DripStats = {
  walletsFunded: number;
  totalDrips: number;
};

export interface FaucetStore {
  init(): Promise<void>;
  getLastDrip(address: string): Promise<number | null>;
  recordDrip(address: string, txHash: string, at: number): Promise<void>;
  getStats(): Promise<DripStats>;
  close(): Promise<void>;
}