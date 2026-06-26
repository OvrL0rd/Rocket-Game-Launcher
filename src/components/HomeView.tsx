import { useEffect, useMemo, useRef, useState } from "react";
import {
  type LibraryGame, gameKey, formatPlaytime,
  launchSteam, launchEpic,
} from "../api/games";
import { useColorExtraction } from "../hooks/useColorExtraction";
import {
  PlayIcon, SpinnerIcon, StarIcon, TrendingUpIcon, ClockIcon,
  ChevronRightIcon, ChevronLeftIcon,
  SteamLogoIcon, EpicLogoIcon,
} from "./Icons";
import styles from "./HomeView.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  games: LibraryGame[];
  playtimeMap: Record<string, number>;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onSelectGame: (game: LibraryGame) => void;
  onBrowseLibrary: () => void;
  steamExecutable: string;
  onGameLaunched?: (game: LibraryGame) => void;
  onLaunchError?: (msg: string) => void;
}

// ── Launch helper ─────────────────────────────────────────────────────────────

async function launchGame(
  game: LibraryGame,
  steamExecutable: string,
  onGameLaunched?: (g: LibraryGame) => void,
  onLaunchError?: (msg: string) => void,
): Promise<void> {
  try {
    if (game.platform === "steam") {
      await launchSteam(game.app_id!, steamExecutable, game.name);
    } else {
      await launchEpic(game.executable ?? "", game.launcher_executable ?? "", game.name);
    }
    onGameLaunched?.(game);
  } catch (err: unknown) {
    onLaunchError?.(err instanceof Error ? err.message : String(err));
  }
}

// ── Hero banner ───────────────────────────────────────────────────────────────

const HERO_COUNT = 8;
const AUTO_ADVANCE_MS = 6000;

function HeroBanner({
  games, playtimeMap, steamExecutable,
  onSelectGame, onGameLaunched, onLaunchError,
}: {
  games: LibraryGame[];
  playtimeMap: Record<string, number>;
  steamExecutable: string;
  onSelectGame: (game: LibraryGame) => void;
  onGameLaunched?: (game: LibraryGame) => void;
  onLaunchError?: (msg: string) => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [launching, setLaunching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const game = games[activeIdx];
  const secs = playtimeMap[gameKey(game)] ?? 0;
  const color = useColorExtraction(game?.cover_url);
  const r = color?.r ?? 80, g = color?.g ?? 60, b = color?.b ?? 200;

  // Auto-advance — resets whenever activeIdx or hover changes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isHovering || games.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIdx(i => (i + 1) % games.length);
    }, AUTO_ADVANCE_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeIdx, isHovering, games.length]);

  const pick = (idx: number) => setActiveIdx(idx);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (launching) return;
    setLaunching(true);
    await launchGame(game, steamExecutable, onGameLaunched, onLaunchError);
    setLaunching(false);
  };

  if (!game) return null;

  return (
    <div
      className={styles.heroBanner}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      style={{ "--hc-r": r, "--hc-g": g, "--hc-b": b } as React.CSSProperties}
    >
      {/* ── Blurred ambient backgrounds (crossfade) */}
      <div className={styles.heroBgs} aria-hidden="true">
        {games.map((g, i) => (
          <img
            key={gameKey(g) + "-bg"}
            className={`${styles.heroBgImg} ${i === activeIdx ? styles.heroBgImgActive : ""}`}
            src={g.cover_url}
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ))}
      </div>

      {/* ── Gradient overlays */}
      <div className={styles.heroOverlayLeft}  aria-hidden="true" />
      <div className={styles.heroOverlayBottom} aria-hidden="true" />

      {/* ── Cover art panel (right side, crossfade) */}
      <div className={styles.heroCovers} aria-hidden="true">
        {games.map((g, i) => (
          <img
            key={gameKey(g) + "-cover"}
            className={`${styles.heroCoverImg} ${i === activeIdx ? styles.heroCoverImgActive : ""}`}
            src={g.cover_url}
            alt=""
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
          />
        ))}
        {/* Inner border ring */}
        <div className={styles.heroCoverRing} aria-hidden="true" />
      </div>

      {/* ── Content layer */}
      <div className={styles.heroContent}>
        {/* Game info */}
        <div className={styles.heroInfo}>
          <div className={styles.heroPlatformBadge} data-platform={game.platform}>
            {game.platform === "steam"
              ? <><SteamLogoIcon size={10} /> Steam</>
              : <><EpicLogoIcon size={10} /> Epic Games</>
            }
          </div>
          <h1 className={styles.heroTitle}>{game.name}</h1>
          {secs > 0 && (
            <p className={styles.heroMeta}>
              <ClockIcon size={11} />
              {formatPlaytime(secs)} played
            </p>
          )}
        </div>

        {/* Bottom row: thumbnails + actions */}
        <div className={styles.heroBottom}>
          {/* Thumbnail strip (Steam-style navigation) */}
          {games.length > 1 && (
            <div className={styles.heroThumbs} role="tablist" aria-label="Featured games">
              {games.map((g, i) => (
                <button
                  key={gameKey(g)}
                  className={`${styles.heroThumb} ${i === activeIdx ? styles.heroThumbActive : ""}`}
                  onClick={() => pick(i)}
                  role="tab"
                  aria-selected={i === activeIdx}
                  aria-label={g.name}
                  tabIndex={i === activeIdx ? 0 : -1}
                  title={g.name}
                >
                  <img src={g.cover_url} alt="" loading="lazy" decoding="async" />
                  {/* Animated progress bar on active thumb */}
                  {i === activeIdx && (
                    <span
                      key={`prog-${activeIdx}`}
                      className={styles.heroThumbProgress}
                      style={{
                        animationDuration: `${AUTO_ADVANCE_MS}ms`,
                        animationPlayState: isHovering ? "paused" : "running",
                      }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className={styles.heroActions}>
            <button
              className={`${styles.heroPlayBtn} ${launching ? styles.heroPlayBtnLoading : ""}`}
              onClick={handlePlay}
              disabled={launching}
              aria-label={launching ? `Launching ${game.name}…` : `Launch ${game.name}`}
              aria-busy={launching}
            >
              {launching
                ? <SpinnerIcon size={13} className={styles.spinner} />
                : <PlayIcon size={13} />
              }
              {launching ? "LAUNCHING…" : "PLAY"}
            </button>
            <button
              className={styles.heroDetailsBtn}
              onClick={() => onSelectGame(game)}
              type="button"
              aria-label={`View details for ${game.name}`}
            >
              Details
            </button>
          </div>
        </div>
      </div>

      {/* ── Prev / Next arrows (appear on hover) */}
      {games.length > 1 && (
        <>
          <button
            className={`${styles.heroArrow} ${styles.heroArrowLeft}`}
            onClick={() => pick((activeIdx - 1 + games.length) % games.length)}
            aria-label="Previous featured game"
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            className={`${styles.heroArrow} ${styles.heroArrowRight}`}
            onClick={() => pick((activeIdx + 1) % games.length)}
            aria-label="Next featured game"
          >
            <ChevronRightIcon size={18} />
          </button>
        </>
      )}
    </div>
  );
}

// ── Empty hero ────────────────────────────────────────────────────────────────

function EmptyHero({ onBrowseLibrary }: { onBrowseLibrary: () => void }) {
  return (
    <div className={styles.heroEmpty}>
      <div className={styles.heroEmptyInner}>
        <h1 className={styles.heroEmptyTitle}>Welcome to Rocket</h1>
        <p className={styles.heroEmptyHint}>
          Open Settings and add your Steam or Epic paths to get started.
        </p>
        <button className={styles.heroEmptyBtn} onClick={onBrowseLibrary} type="button">
          Open Library
        </button>
      </div>
    </div>
  );
}

// ── Game card (sections) ───────────────────────────────────────────────────────

function GameCard({
  game, secondsPlayed, isFavorite, steamExecutable,
  onSelect, onGameLaunched, onLaunchError, compact = false, cardIndex = 0,
}: {
  game: LibraryGame;
  secondsPlayed?: number;
  isFavorite: boolean;
  steamExecutable: string;
  onSelect: () => void;
  onGameLaunched?: (game: LibraryGame) => void;
  onLaunchError?: (msg: string) => void;
  compact?: boolean;
  cardIndex?: number;
}) {
  const [launching, setLaunching] = useState(false);

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (launching) return;
    setLaunching(true);
    await launchGame(game, steamExecutable, onGameLaunched, onLaunchError);
    setLaunching(false);
  };

  const playtimeLabel = secondsPlayed ? formatPlaytime(secondsPlayed) : null;

  return (
    <article
      className={`${styles.card} ${compact ? styles.cardCompact : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`${game.name}${playtimeLabel ? ` — ${playtimeLabel}` : ""}`}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      style={{ "--card-index": Math.min(cardIndex, 5) } as React.CSSProperties}
    >
      <div className={styles.cardImgWrap}>
        <img
          className={styles.cardImg}
          src={game.cover_url}
          alt={game.name}
          loading="lazy"
          decoding="async"
          width={140}
          height={210}
        />
        {isFavorite && (
          <span className={styles.cardFavBadge} aria-label="Favorited">
            <StarIcon size={9} filled />
          </span>
        )}
        <div className={styles.cardPlatformBadge} data-platform={game.platform} aria-hidden="true">
          {game.platform === "steam" ? <SteamLogoIcon size={9} /> : <EpicLogoIcon size={9} />}
        </div>
        {/* Dark backdrop on hover */}
        <div className={styles.cardOverlay} aria-hidden="true" />

        {/* Bottom: name/playtime + play button — slides up on hover */}
        <div className={styles.cardBottomInfo}>
          <div className={styles.cardNameGroup} aria-hidden="true">
            <span className={styles.cardName}>{game.name}</span>
            {playtimeLabel && <span className={styles.cardPlaytime}>{playtimeLabel}</span>}
          </div>
          <button
            className={`${styles.cardPlayBtn} ${launching ? styles.cardPlayBtnLaunching : ""}`}
            onClick={handlePlay}
            disabled={launching}
            aria-label={launching ? `Launching ${game.name}…` : `Launch ${game.name}`}
            aria-busy={launching}
          >
            {launching
              ? <SpinnerIcon size={10} className={styles.spinner} />
              : <PlayIcon size={10} />
            }
            {launching ? "LAUNCHING…" : "PLAY"}
          </button>
        </div>
      </div>
    </article>
  );
}

// ── Spotlight card ────────────────────────────────────────────────────────────

function SpotlightCard({ game, secondsPlayed, steamExecutable, onSelect, onGameLaunched, onLaunchError }: {
  game: LibraryGame;
  secondsPlayed?: number;
  steamExecutable: string;
  onSelect: () => void;
  onGameLaunched?: (game: LibraryGame) => void;
  onLaunchError?: (msg: string) => void;
}) {
  const [launching, setLaunching] = useState(false);
  const color = useColorExtraction(game.cover_url);
  const r = color?.r ?? 80, g = color?.g ?? 80, b = color?.b ?? 200;

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (launching) return;
    setLaunching(true);
    await launchGame(game, steamExecutable, onGameLaunched, onLaunchError);
    setLaunching(false);
  };

  const playtimeLabel = secondsPlayed ? formatPlaytime(secondsPlayed) : null;

  return (
    <article
      className={styles.spotlightCard}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`View ${game.name}`}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      style={{ "--sc-r": r, "--sc-g": g, "--sc-b": b } as React.CSSProperties}
    >
      <img className={styles.spotlightImg} src={game.cover_url} alt={game.name} loading="lazy" decoding="async" />
      <div className={styles.spotlightOverlay} />
      <div className={styles.spotlightPlayOverlay}>
        <button
          className={`${styles.spotlightPlayBtn} ${launching ? styles.spotlightPlayBtnLaunching : ""}`}
          onClick={handlePlay}
          disabled={launching}
          aria-label={launching ? `Launching ${game.name}…` : `Launch ${game.name}`}
          type="button"
        >
          {launching
            ? <SpinnerIcon size={12} className={styles.spinner} />
            : <PlayIcon size={12} />
          }
          {launching ? "LAUNCHING…" : "PLAY"}
        </button>
      </div>
      <div className={styles.spotlightContent}>
        <span className={styles.spotlightTitle}>{game.name}</span>
        {playtimeLabel && <span className={styles.spotlightMeta}>{playtimeLabel}</span>}
      </div>
    </article>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, onSeeAll }: {
  icon: React.ReactNode; label: string; onSeeAll?: () => void;
}) {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionIcon} aria-hidden="true">{icon}</span>
      <h2 className={styles.sectionLabel}>{label}</h2>
      {onSeeAll && (
        <button className={styles.seeAllBtn} onClick={onSeeAll} type="button">
          See all <ChevronRightIcon size={12} />
        </button>
      )}
    </div>
  );
}

// ── Carousel section ──────────────────────────────────────────────────────────

function CarouselSection({ label, icon, games, playtimeMap, isFavorite, steamExecutable, onSelectGame, onGameLaunched, onLaunchError, onSeeAll }: {
  label: string; icon: React.ReactNode; games: LibraryGame[];
  playtimeMap: Record<string, number>; isFavorite: (id: string) => boolean;
  steamExecutable: string; onSelectGame: (game: LibraryGame) => void;
  onGameLaunched?: (game: LibraryGame) => void; onLaunchError?: (msg: string) => void;
  onSeeAll?: () => void;
}) {
  if (games.length === 0) return null;
  return (
    <section className={styles.section}>
      <SectionHeader icon={icon} label={label} onSeeAll={onSeeAll} />
      <div className={styles.carouselWrap}>
        <div className={styles.carousel} role="list" aria-label={label}>
          {games.map((game, i) => (
            <div key={gameKey(game)} role="listitem">
              <GameCard
                game={game}
                secondsPlayed={playtimeMap[gameKey(game)]}
                isFavorite={isFavorite(game.id)}
                steamExecutable={steamExecutable}
                onSelect={() => onSelectGame(game)}
                onGameLaunched={onGameLaunched}
                onLaunchError={onLaunchError}
                cardIndex={i}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Spotlight section ─────────────────────────────────────────────────────────

function SpotlightSection({ label, icon, games, playtimeMap, isFavorite, steamExecutable, onSelectGame, onGameLaunched, onLaunchError, onSeeAll }: {
  label: string; icon: React.ReactNode; games: LibraryGame[];
  playtimeMap: Record<string, number>; isFavorite: (id: string) => boolean;
  steamExecutable: string; onSelectGame: (game: LibraryGame) => void;
  onGameLaunched?: (game: LibraryGame) => void; onLaunchError?: (msg: string) => void;
  onSeeAll?: () => void;
}) {
  if (games.length === 0) return null;
  if (games.length < 3) {
    return (
      <CarouselSection
        label={label} icon={icon} games={games} playtimeMap={playtimeMap}
        isFavorite={isFavorite} steamExecutable={steamExecutable}
        onSelectGame={onSelectGame} onGameLaunched={onGameLaunched}
        onLaunchError={onLaunchError} onSeeAll={onSeeAll}
      />
    );
  }

  const [featured, ...rest] = games;
  return (
    <section className={styles.section}>
      <SectionHeader icon={icon} label={label} onSeeAll={onSeeAll} />
      <div className={styles.spotlight}>
        <SpotlightCard
          game={featured}
          secondsPlayed={playtimeMap[gameKey(featured)]}
          steamExecutable={steamExecutable}
          onSelect={() => onSelectGame(featured)}
          onGameLaunched={onGameLaunched}
          onLaunchError={onLaunchError}
        />
        <div className={styles.spotlightGrid} role="list" aria-label={`More in ${label}`}>
          {rest.slice(0, 4).map((game, i) => (
            <div key={gameKey(game)} role="listitem">
              <GameCard
                game={game}
                secondsPlayed={playtimeMap[gameKey(game)]}
                isFavorite={isFavorite(game.id)}
                steamExecutable={steamExecutable}
                onSelect={() => onSelectGame(game)}
                onGameLaunched={onGameLaunched}
                onLaunchError={onLaunchError}
                compact
                cardIndex={i + 1}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Main HomeView ─────────────────────────────────────────────────────────────

const TOP_N = 12;

export default function HomeView({
  games, playtimeMap, isFavorite, onToggleFavorite, onSelectGame,
  onBrowseLibrary, steamExecutable, onGameLaunched, onLaunchError,
}: Props) {
  void onToggleFavorite;

  const recentlyPlayed = useMemo(() =>
    [...games]
      .filter(g => g.last_played > 0)
      .sort((a, b) => b.last_played - a.last_played)
      .slice(0, TOP_N),
    [games]
  );

  const mostPlayed = useMemo(() =>
    [...games]
      .filter(g => (playtimeMap[gameKey(g)] ?? 0) > 0)
      .sort((a, b) => (playtimeMap[gameKey(b)] ?? 0) - (playtimeMap[gameKey(a)] ?? 0))
      .slice(0, TOP_N),
    [games, playtimeMap]
  );

  const favorites = useMemo(() =>
    games.filter(g => isFavorite(g.id)).slice(0, TOP_N),
    [games, isFavorite]
  );

  const heroGames = useMemo(() =>
    (recentlyPlayed.length > 0 ? recentlyPlayed : games).slice(0, HERO_COUNT),
    [recentlyPlayed, games]
  );

  const hasContent = recentlyPlayed.length > 0 || mostPlayed.length > 0 || favorites.length > 0;

  return (
    <div className={styles.root}>
      {heroGames.length > 0 ? (
        <HeroBanner
          games={heroGames}
          playtimeMap={playtimeMap}
          steamExecutable={steamExecutable}
          onSelectGame={onSelectGame}
          onGameLaunched={onGameLaunched}
          onLaunchError={onLaunchError}
        />
      ) : (
        <EmptyHero onBrowseLibrary={onBrowseLibrary} />
      )}

      {hasContent && (
        <div className={styles.sections}>
          <CarouselSection
            label="Continue Playing"
            icon={<ClockIcon size={14} />}
            games={recentlyPlayed}
            playtimeMap={playtimeMap}
            isFavorite={isFavorite}
            steamExecutable={steamExecutable}
            onSelectGame={onSelectGame}
            onGameLaunched={onGameLaunched}
            onLaunchError={onLaunchError}
            onSeeAll={onBrowseLibrary}
          />

          <SpotlightSection
            label="Most Played"
            icon={<TrendingUpIcon size={14} />}
            games={mostPlayed}
            playtimeMap={playtimeMap}
            isFavorite={isFavorite}
            steamExecutable={steamExecutable}
            onSelectGame={onSelectGame}
            onGameLaunched={onGameLaunched}
            onLaunchError={onLaunchError}
            onSeeAll={onBrowseLibrary}
          />

          <CarouselSection
            label="Favorites"
            icon={<StarIcon size={14} filled />}
            games={favorites}
            playtimeMap={playtimeMap}
            isFavorite={isFavorite}
            steamExecutable={steamExecutable}
            onSelectGame={onSelectGame}
            onGameLaunched={onGameLaunched}
            onLaunchError={onLaunchError}
          />
        </div>
      )}
    </div>
  );
}
