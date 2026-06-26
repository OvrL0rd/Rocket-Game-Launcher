import { useState } from "react";
import {
  type LibraryGame, launchSteam, launchEpic,
  formatBytes, formatLastPlayed, formatPlaytime,
} from "../api/games";
import { RocketIcon, PlayIcon, StarIcon, SpinnerIcon } from "./Icons";
import GameCard from "./GameCard";
import styles from "./GameGrid.module.css";

const FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='72' viewBox='0 0 48 72'%3E%3Crect width='48' height='72' fill='%231A1A35'/%3E%3C/svg%3E";

interface Props {
  games: LibraryGame[];
  loading: boolean;
  steamExecutable: string;
  onSelectGame: (game: LibraryGame) => void;
  viewMode: "grid" | "list";
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  hasActiveFilters?: boolean;
  onLaunchError?: (msg: string) => void;
  onGameLaunched?: (game: LibraryGame) => void;
  getSecondsPlayed?: (game: LibraryGame) => number;
}

async function launchGame(game: LibraryGame, steamExecutable: string): Promise<void> {
  if (game.platform === "steam") {
    await launchSteam(game.app_id!, steamExecutable, game.name);
  } else {
    await launchEpic(game.executable ?? "", game.launcher_executable ?? "", game.name);
  }
}

/* ── List row ─────────────────────────────────────────────────────────────── */
interface ListRowProps {
  game: LibraryGame;
  steamExecutable: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSelect: () => void;
  onLaunchError?: (msg: string) => void;
  onGameLaunched?: (game: LibraryGame) => void;
  secondsPlayed?: number;
}

function GameListRow({
  game, steamExecutable, isFavorite, onToggleFavorite,
  onSelect, onLaunchError, onGameLaunched, secondsPlayed,
}: ListRowProps) {
  const [launching, setLaunching] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (launching) return;
    setLaunching(true);
    try {
      await launchGame(game, steamExecutable);
      onGameLaunched?.(game);
    } catch (err: unknown) {
      onLaunchError?.(err instanceof Error ? err.message : String(err));
    } finally {
      setLaunching(false);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(game.id);
  };

  const playtimeLabel = formatPlaytime(secondsPlayed ?? 0);

  return (
    <div
      className={styles.listRow}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`View details for ${game.name}`}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      <img
        className={styles.listCover}
        src={game.cover_url}
        alt={game.name}
        loading="lazy"
        decoding="async"
        width={48}
        height={72}
        onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
      />
      <div className={styles.listInfo}>
        <span className={styles.listName}>{game.name}</span>
        <span
          className={styles.listPlatform}
          data-platform={game.platform}
        >
          {game.platform === "steam" ? "Steam" : "Epic Games"}
        </span>
      </div>
      <span className={styles.listMeta}>{formatBytes(game.size_on_disk)}</span>
      <span className={styles.listMeta}>{formatLastPlayed(game.last_played)}</span>
      {playtimeLabel ? (
        <span className={`${styles.listMeta} ${styles.listPlaytime}`}>{playtimeLabel}</span>
      ) : (
        <span className={styles.listMeta}>—</span>
      )}
      <button
        className={`${styles.listStarBtn} ${isFavorite ? styles.listStarActive : ""}`}
        onClick={handleToggleFavorite}
        aria-label={isFavorite ? `Remove ${game.name} from favorites` : `Add ${game.name} to favorites`}
        aria-pressed={isFavorite}
      >
        <StarIcon size={14} filled={isFavorite} />
      </button>
      <button
        className={`${styles.listPlayBtn} ${launching ? styles.listPlayBtnLaunching : ""}`}
        onClick={handlePlay}
        disabled={launching}
        aria-label={launching ? `Launching ${game.name}…` : `Launch ${game.name}`}
        aria-busy={launching}
      >
        {launching ? <SpinnerIcon size={11} className={styles.spinner} /> : <PlayIcon size={11} />}
        {launching ? "LAUNCHING" : "PLAY"}
      </button>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function GameGrid({
  games, loading, steamExecutable, onSelectGame, viewMode,
  isFavorite, onToggleFavorite, hasActiveFilters, onLaunchError,
  onGameLaunched, getSecondsPlayed,
}: Props) {
  if (loading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label="Loading games">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={styles.skeleton} aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className={styles.grid}>
        <div className={styles.empty} role="status">
          <RocketIcon size={40} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>
            {hasActiveFilters ? "NO MATCHES" : "NO GAMES FOUND"}
          </p>
          <p className={styles.emptyHint}>
            {hasActiveFilters
              ? "No games match your current filters. Try clearing some filters to see more results."
              : "Open Settings and point to your Steam steamapps folder to get started."}
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className={styles.list}>
        {games.map((game) => (
          <GameListRow
            key={`${game.platform}:${game.id}`}
            game={game}
            steamExecutable={steamExecutable}
            isFavorite={isFavorite(game.id)}
            onToggleFavorite={onToggleFavorite}
            onSelect={() => onSelectGame(game)}
            onLaunchError={onLaunchError}
            onGameLaunched={onGameLaunched}
            secondsPlayed={getSecondsPlayed?.(game)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {games.map((game) => (
        <GameCard
          key={`${game.platform}:${game.id}`}
          game={game}
          onPlay={async () => {
            try {
              await launchGame(game, steamExecutable);
              onGameLaunched?.(game);
            } catch (err: unknown) {
              onLaunchError?.(err instanceof Error ? err.message : String(err));
            }
          }}
          onSelect={() => onSelectGame(game)}
          isFavorite={isFavorite(game.id)}
          onToggleFavorite={onToggleFavorite}
          secondsPlayed={getSecondsPlayed?.(game)}
        />
      ))}
    </div>
  );
}
