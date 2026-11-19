import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
import { fetchCooldown, fetchInfo, requestDrip, type FaucetInfo } from "./api";
import { SuccessCelebration } from "./SuccessCelebration";
import {
  ArrowRightIcon,
  BoltIcon,
  ClipboardIcon,
  ClockIcon,
  CodeIcon,
  DropletIcon,
  GlobeIcon,
  LinkIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
  WalletIcon,
} from "./Icons";
import styles from "./App.module.css";

function formatCooldown(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `Next drip in ${h}h ${m}m`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `Next drip in ${m}m`;
  return `Next drip in ${s}s`;
}

export default function App() {
  const [info, setInfo] = useState<FaucetInfo | null>(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [cooldownText, setCooldownText] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    amount: number;
    symbol: string;
    txHash: string;
  } | null>(null);

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
      setCooldownText(formatCooldown(c.retryAfterSeconds));
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
    setCelebration(null);
    try {
      const { txHash } = await requestDrip(address);
      setStatus(null);
      setCelebration({
        amount: info!.dripAmount,
        symbol: info!.tokenSymbol,
        txHash,
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

  function pasteFromClipboard() {
    void navigator.clipboard.readText().then((text) => {
      const trimmed = text.trim();
      if (trimmed) setAddress(trimmed);
    });
  }

  const balanceLabel = info
    ? Number(info.faucetTokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : "—";

  return (
    <div className={styles.shell}>
      <div className={styles.bgImage} aria-hidden />
      <div className={styles.bgScrim} aria-hidden />

      <div className={styles.layout}>
        <header className={styles.topBar}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}>
              <DropletIcon />
            </span>
            <div>
              <span className={styles.brandName}>USDC Faucet</span>
              <span className={styles.brandTag}>Testnet</span>
            </div>
          </div>
          <p className={styles.topTagline}>Get test USDC for development and demos</p>
          <span className={styles.creditBadge}>Developed by Dhaval Saxena</span>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroTitleRow}>
            <span className={styles.heroLine} aria-hidden />
            <h1 className={styles.heroTitle}>
              <span className={styles.heroUsdc}>USDC</span>{" "}
              <span className={styles.heroFaucet}>Faucet</span>
            </h1>
            <span className={styles.heroLine} aria-hidden />
          </div>
          <p className={styles.heroSubtitle}>Request free USDC on the faucet and start building!</p>
        </section>

        <main className={styles.glassCard}>
          {info ? (
            <div className={styles.statsRow}>
              <article className={styles.statTile}>
                <span className={`${styles.statIcon} ${styles.statIconBlue}`}>
                  <BoltIcon />
                </span>
                <span className={styles.statLabel}>Per Request</span>
                <strong className={styles.statValue}>
                  {info.dripAmount.toLocaleString()} {info.tokenSymbol}
                </strong>
              </article>
              <article className={styles.statTile}>
                <span className={`${styles.statIcon} ${styles.statIconPurple}`}>
                  <ClockIcon />
                </span>
                <span className={styles.statLabel}>Cooldown</span>
                <strong className={styles.statValue}>{info.cooldownMinutes} min / wallet</strong>
              </article>
              <article className={styles.statTile}>
                <span className={`${styles.statIcon} ${styles.statIconGreen}`}>
                  <WalletIcon />
                </span>
                <span className={styles.statLabel}>Faucet Balance</span>
                <strong className={styles.statValue} title={balanceLabel}>
                  {balanceLabel} {info.tokenSymbol}
                </strong>
              </article>
              <article className={styles.statTile}>
                <span className={`${styles.statIcon} ${styles.statIconOrange}`}>
                  <LinkIcon />
                </span>
                <span className={styles.statLabel}>Chain ID</span>
                <strong className={styles.statValue}>{info.chainId}</strong>
              </article>
              <article className={styles.statTile}>
                <span className={`${styles.statIcon} ${styles.statIconTeal}`}>
                  <UsersIcon />
                </span>
                <span className={styles.statLabel}>Wallets Funded</span>
                <strong className={styles.statValue}>
                  {info.totalWalletsFunded.toLocaleString()}
                </strong>
              </article>
            </div>
          ) : (
            <p className={styles.loadingText}>Loading faucet details…</p>
          )}

          <div className={styles.walletPanel}>
            <div className={styles.walletHeading}>
              <span className={styles.walletHeadingIcon}>
                <WalletIcon />
              </span>
              <div>
                <h2 className={styles.walletTitle}>Your Wallet Address</h2>
                <p className={styles.walletHint}>Paste your wallet address to request USDC</p>
              </div>
            </div>

            <div className={styles.inputWrap}>
              <input
                id="wallet"
                className={styles.input}
                placeholder="0x…"
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                className={styles.inputPasteBtn}
                onClick={() => pasteFromClipboard()}
                title="Paste from clipboard"
                aria-label="Paste from clipboard"
              >
                <ClipboardIcon />
              </button>
            </div>

            {cooldownText && <p className={styles.cooldown}>{cooldownText}</p>}

            <button
              type="button"
              className={styles.cta}
              disabled={loading || !info}
              onClick={() => void onDrip()}
            >
              <DropletIcon className={styles.ctaDrop} />
              <span className={styles.ctaLabel}>{loading ? "Sending…" : "Request USDC"}</span>
              <ArrowRightIcon className={styles.ctaArrow} />
            </button>

            <div className={styles.poweredRow}>
              <span className={styles.poweredLine} aria-hidden />
              <p className={styles.powered}>
                <DropletIcon className={styles.poweredIcon} />
                Powered by USDC
              </p>
              <span className={styles.poweredLine} aria-hidden />
            </div>
          </div>

          {status && (
            <p className={status.type === "ok" ? styles.success : styles.error} role="status">
              {status.text}
            </p>
          )}
        </main>

        <footer className={styles.features}>
          {[
            { Icon: ShieldIcon, label: "Secure & reliable" },
            { Icon: SparkIcon, label: "Fast & free" },
            { Icon: CodeIcon, label: "Developer friendly" },
            { Icon: GlobeIcon, label: "Multi-chain ready" },
          ].map(({ Icon, label }) => (
            <div key={label} className={styles.featurePill}>
              <Icon className={styles.featureIcon} />
              <span>{label}</span>
            </div>
          ))}
        </footer>
      </div>

      {celebration && (
        <SuccessCelebration
          amount={celebration.amount}
          symbol={celebration.symbol}
          txHash={celebration.txHash}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  );
}