import { useEffect } from "react";
import { DropletIcon } from "./Icons";
import styles from "./SuccessCelebration.module.css";

type Props = {
  amount: number;
  symbol: string;
  txHash: string;
  onClose: () => void;
};

export function SuccessCelebration({ amount, symbol, txHash, onClose }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 6500);
    return () => window.clearTimeout(timer);
  }, [onClose]);

  const shortTx = `${txHash.slice(0, 10)}…${txHash.slice(-8)}`;

  return (
    <div className={styles.overlay} role="dialog" aria-modal aria-labelledby="success-title">
      <button type="button" className={styles.backdropBtn} onClick={onClose} aria-label="Close" />
      <div className={styles.modal}>
        <div className={styles.coinField} aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i} className={styles.floatingCoin} data-i={i}>
              <span className={styles.coinFace}>$</span>
            </span>
          ))}
        </div>

        <div className={styles.checkWrap}>
          <div className={styles.checkPulse} aria-hidden />
          <svg className={styles.checkIcon} viewBox="0 0 52 52" aria-hidden>
            <circle className={styles.checkCircle} cx="26" cy="26" r="24" fill="none" />
            <path className={styles.checkMark} fill="none" d="M14 27l8 8 16-18" />
          </svg>
        </div>

        <p className={styles.eyebrow}>Success</p>
        <h2 id="success-title" className={styles.title}>
          You received USDC!
        </h2>
        <p className={styles.amount}>
          <DropletIcon className={styles.amountIcon} />
          <span>
            +{amount.toLocaleString()} {symbol}
          </span>
        </p>
        <p className={styles.sub}>Tokens sent to your wallet. Check your balance in a few seconds.</p>
        <p className={styles.tx}>
          Tx: <code>{shortTx}</code>
        </p>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  );
}