import { useState } from "react";
import { type LibraryGame, formatPlaytime } from "../api/games";
import { PlayIcon, StarIcon, SpinnerIcon } from "./Icons";
import styles from "./GameCard.module.css";

const FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%231A1A35'/%3E%3Ctext x='50%25' y='50%25' fill='%234B5563' font-family='sans-serif' font-size='14' text-anchor='middle' dominant-baseline='middle'%3ENo Image%3C/text%3E%3C/svg%3E";

interface Props {
  game: LibraryGame;
  onPlay: () => Promise<void>;
  onSelect: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  secondsPlayed?: number;
}

export default function GameCard({ game, onPlay, onSelect, isFavorite, onToggleFavorite, secondsPlayed }: Props) {
  const [launching, setLaunching] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (launching) return;
    setLaunching(true);
    try { await onPlay(); } finally { setLaunching(false); }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(game.id);
  };

  const playtimeLabel = formatPlaytime(secondsPlayed ?? 0);

  return (
    <article
      className={styles.card}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${game.name}`}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <img
        className={styles.cover}
        src={game.cover_url}
        alt={game.name}
        loading="lazy"
        decoding="async"
        width={300}
        height={450}
        onError={(e) => {
          (e.target as HTMLImageElement).src = FALLBACK;
        }}
      />

      {/* Platform badge — top-left */}
      <span
        className={styles.platformBadge}
        data-platform={game.platform}
        aria-label={`${game.platform === "steam" ? "Steam" : "Epic Games"} game`}
      >
        {game.platform === "steam" ? "STEAM" : "EPIC"}
      </span>

      {/* Favorite button — top-right */}
      <button
        className={`${styles.starBtn} ${isFavorite ? styles.starActive : ""}`}
        onClick={handleToggleFavorite}
        aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
        aria-pressed={isFavorite}
      >
        <StarIcon size={14} filled={isFavorite} />
      </button>

      <div className={styles.nameBar}>
        <div className={styles.nameGroup}>
          <span className={styles.gameName}>{game.name}</span>
          {playtimeLabel && (
            <span className={styles.playtime}>{playtimeLabel}</span>
          )}
        </div>
        <button
          className={`${styles.playBtn} ${launching ? styles.playBtnLaunching : ""}`}
          onClick={handlePlay}
          disabled={launching}
          aria-label={launching ? `Launching ${game.name}…` : `Launch ${game.name}`}
          aria-busy={launching}
        >
          {launching ? <SpinnerIcon size={11} className={styles.spinner} /> : <PlayIcon size={11} />}
          {launching ? "LAUNCHING" : "PLAY"}
        </button>
      </div>
    </article>
  );
}
