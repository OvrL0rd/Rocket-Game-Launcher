import type { ActiveSession } from "../hooks/usePlaytime";
import { StopIcon } from "./Icons";
import styles from "./NowPlaying.module.css";

interface Props {
  session: ActiveSession;
  elapsedSecs: number;
  onStop: () => void;
}

function formatElapsed(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function NowPlaying({ session, elapsedSecs, onStop }: Props) {
  return (
    <div className={styles.container} role="status" aria-label={`Now playing: ${session.game.name}`}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.platformBadge} data-platform={session.game.platform}>
        {session.game.platform === "steam" ? "STEAM" : "EPIC"}
      </span>
      <span className={styles.gameName}>{session.game.name}</span>
      <span className={styles.timer} aria-live="off">{formatElapsed(elapsedSecs)}</span>
      <button
        className={styles.stopBtn}
        onClick={onStop}
        aria-label="Stop session and save playtime"
        title="Stop session"
      >
        <StopIcon size={11} />
        STOP
      </button>
    </div>
  );
}
