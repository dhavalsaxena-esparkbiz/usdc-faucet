import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
import { fetchCooldown, fetchInfo, requestDrip, type FaucetInfo } from "./api";
import styles from "./App.module.css";

export default function App() {
  const [info, setInfo] = useState<FaucetInfo | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cooldownText, setCooldownText] = useState<string | null>(null);

  useEffect(() => {
    fetchInfo()
      .then(setInfo)
      .catch(() => setStatus({ type: "err", text: "Faucet API unavailable. Is the server running?" }));
  }, []);

  const refreshCooldown = useCallback(async (addr: string) => {
    if (!isAddress(addr)) {
      setCooldownText(null);
      return;
    }
    const c = await fetchCooldown(addr);
    if (c.canDrip) {
      setCooldownText(null);
    } else if (c.retryAfterSeconds) {
      const h = Math.floor(c.retryAfterSeconds / 3600);
      const m = Math.floor((c.retryAfterSeconds % 3600) / 60);
      setCooldownText(`Next drip available in ${h}h ${m}m`);
    }
  }, []);

  useEffect(() => {
    if (isAddress(address)) void refreshCooldown(address);
    else setCooldownText(null);
  }, [address, refreshCooldown]);

  async function onDrip() {
    setStatus(null);
    if (!isAddress(address)) {
      setStatus({ type: "err", text: "Enter a valid wallet address." });
      return;
    }
    setLoading(true);
    try {
      const { txHash } = await requestDrip(address);
      setStatus({
        type: "ok",
        text: `Sent! Transaction: ${txHash.slice(0, 10)}…${txHash.slice(-8)}`,
      });
      await refreshCooldown(address);
      const updated = await fetchInfo();
      setInfo(updated);
    } catch (e) {
      setStatus({ type: "err", text: e instanceof Error ? e.message : "Drip failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logoMark} aria-hidden />
        <div>
          <h1 className={styles.title}>USDC Faucet</h1>
          <p className={styles.subtitle}>Get test USDC for development and demos</p>
          <p className={styles.credit}>Developed by Dhaval Saxena</p>
        </div>
      </header>

      <main className={styles.card}>
        {info ? (
          <ul className={styles.stats}>
            <li>
              <span className={styles.statLabel}>Per request</span>
              <strong>
                {info.dripAmount} {info.tokenSymbol}
              </strong>
            </li>
            <li>
              <span className={styles.statLabel}>Cooldown</span>
              <strong>{info.cooldownHours}h / wallet</strong>
            </li>
            <li>
              <span className={styles.statLabel}>
                {info.mintMode ? "Total supply" : "Faucet balance"}
              </span>
              <strong>
                {Number(info.faucetTokenBalance).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                {info.tokenSymbol}
              </strong>
            </li>
            <li>
              <span className={styles.statLabel}>Chain ID</span>
              <strong>{info.chainId}</strong>
            </li>
          </ul>
        ) : (
          <p className={styles.muted}>Loading faucet details…</p>
        )}

        <label className={styles.label} htmlFor="wallet">
          Paste your wallet address
        </label>
        <input
          id="wallet"
          className={styles.input}
          placeholder="0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value.trim())}
          spellCheck={false}
          autoComplete="off"
        />

        {cooldownText && <p className={styles.cooldown}>{cooldownText}</p>}

        <button
          type="button"
          className={styles.primary}
          disabled={loading || !info}
          onClick={() => void onDrip()}
        >
          {loading ? "Sending…" : "Request USDC"}
        </button>

        {status && (
          <p className={status.type === "ok" ? styles.success : styles.error} role="status">
            {status.text}
          </p>
        )}

        {info && (
          <footer className={styles.footer}>
            <span className={styles.muted}>Token contract</span>
            <code className={styles.mono}>{info.contractAddress}</code>
          </footer>
        )}
      </main>

      <p className={styles.siteCredit}>Developed by Dhaval Saxena</p>
    </div>
  );
}
