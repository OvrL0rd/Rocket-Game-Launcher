import { useEffect, useRef, useState } from "react";
import {
  getGameDetail, launchSteam, launchEpic, openUrl,
  formatBytes, formatLastPlayed, formatPlaytime,
  type GameDetail, type LibraryGame,
} from "../api/games";
import type { Collection } from "../api/collections";
import {
  ArrowLeftIcon, PlayIcon, SpinnerIcon, UserIcon, CalendarIcon,
  HardDriveIcon, ClockIcon, GamepadIcon, TagIcon, PlusIcon, XIcon,
  SteamLogoIcon, EpicLogoIcon,
} from "./Icons";
import ScreenshotLightbox from "./ScreenshotLightbox";
import styles from "./GameDetailView.module.css";

interface Props {
  game: LibraryGame;
  steamExecutable: string;
  steamPaths: string[];
  onBack: () => void;
  secondsPlayed?: number;
  collections: Collection[];
  onAddToCollection: (collectionId: string) => void;
  onRemoveFromCollection: (collectionId: string) => void;
  gameCollections: Collection[];
  onGameLaunched?: (game: LibraryGame) => void;
}

export default function GameDetailView({
  game, steamExecutable, steamPaths, onBack,
  secondsPlayed, collections, onAddToCollection,
  onRemoveFromCollection, gameCollections, onGameLaunched,
}: Props) {
  const [detail, setDetail] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const launchErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isEpic = game.platform === "epic";

  useEffect(() => {
    if (isEpic) {
      // Epic games don't have a Steam detail API — build from local data
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setDetail(null);
    getGameDetail(game.app_id!, steamPaths)
      .then(setDetail)
      .catch(() => {
        setDetail({
          app_id: game.app_id!,
          name: game.name,
          cover_url: game.cover_url,
          header_image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.app_id}/header.jpg`,
          short_description: "",
          developers: [],
          publishers: [],
          genres: [],
          release_date: "",
          screenshots: [],
          last_played: game.last_played,
          size_on_disk: game.size_on_disk,
        });
      })
      .finally(() => setLoading(false));
  }, [game.id, game.platform]);

  // Escape to go back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !collectionPickerOpen) onBack(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack, collectionPickerOpen]);

  // Close collection picker on outside click
  useEffect(() => {
    if (!collectionPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setCollectionPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [collectionPickerOpen]);

  const handlePlay = async () => {
    if (launching) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      if (isEpic) {
        await launchEpic(game.executable ?? "", game.launcher_executable ?? "", game.name);
      } else {
        await launchSteam(game.app_id!, steamExecutable, game.name);
      }
      onGameLaunched?.(game);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLaunchError(msg);
      if (launchErrorTimer.current) clearTimeout(launchErrorTimer.current);
      launchErrorTimer.current = setTimeout(() => setLaunchError(null), 5000);
    } finally {
      setLaunching(false);
    }
  };

  const playtimeLabel = formatPlaytime(secondsPlayed ?? 0);

  const heroSrc = isEpic
    ? game.cover_url
    : (detail?.header_image || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.app_id}/header.jpg`);

  const genres = detail?.genres ?? [];

  return (
    <div className={styles.view} role="main" aria-label={`${game.name} details`}>
      {/* Floating back button */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Back to library">
          <ArrowLeftIcon size={16} />
          LIBRARY
        </button>
      </div>

      <div className={styles.body}>
        {/* Hero */}
        <div className={styles.hero}>
          <img
            className={`${styles.heroBg} ${isEpic ? styles.heroBgEpic : ""}`}
            src={heroSrc}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
          />
          <div className={styles.heroOverlay} />
          <div className={styles.heroContent}>
            <img
              className={styles.cover}
              src={game.cover_url}
              alt={game.name}
              width={160}
              height={240}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className={styles.heroText}>
              <div className={styles.platformBadge} data-platform={game.platform}>
                {game.platform === "steam" ? "STEAM" : "EPIC GAMES"}
              </div>
              <h1 className={styles.gameTitle}>{game.name}</h1>
              {genres.length > 0 && (
                <div className={styles.genrePills}>
                  {genres.map((g) => (
                    <span key={g} className={styles.pill}>{g}</span>
                  ))}
                </div>
              )}
              <div className={styles.playRow}>
                <button
                  className={`${styles.playBtn} ${launching ? styles.playBtnLaunching : ""}`}
                  onClick={handlePlay}
                  disabled={launching}
                  aria-label={launching ? `Launching ${game.name}…` : `Launch ${game.name}`}
                  aria-busy={launching}
                >
                  {launching ? <SpinnerIcon size={14} className={styles.spinner} /> : <PlayIcon size={14} />}
                  {launching ? "LAUNCHING…" : "PLAY NOW"}
                </button>

                <button
                  className={styles.storeLink}
                  data-platform={game.platform}
                  onClick={() => {
                    const url = isEpic
                      ? "https://store.epicgames.com/"
                      : `https://store.steampowered.com/app/${game.app_id}/`;
                    openUrl(url).catch(() => {});
                  }}
                  type="button"
                  aria-label={isEpic ? "View on Epic Games Store" : "View on Steam Store"}
                >
                  {isEpic
                    ? <EpicLogoIcon size={13} />
                    : <SteamLogoIcon size={13} />
                  }
                  {isEpic ? "Epic Store" : "Steam Store"}
                </button>
              </div>
              {launchError && (
                <p className={styles.launchError} role="alert">{launchError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Content below hero */}
        <div className={styles.content}>
          {/* Meta cards */}
          <div className={styles.metaGrid}>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={styles.metaCard}>
                  <div className={styles.skelLine} style={{ width: "60%", marginBottom: 8 }} />
                  <div className={styles.skelLine} style={{ width: "80%" }} />
                </div>
              ))
            ) : (
              <>
                {(detail?.developers?.length ?? 0) > 0 && (
                  <MetaCard icon={<UserIcon size={13} />} label="Developer" value={detail!.developers.join(", ")} />
                )}
                {isEpic && (
                  <MetaCard icon={<UserIcon size={13} />} label="Platform" value="Epic Games" />
                )}
                {detail?.release_date && (
                  <MetaCard icon={<CalendarIcon size={13} />} label="Release Date" value={detail.release_date} />
                )}
                {(game.size_on_disk ?? 0) > 0 && (
                  <MetaCard icon={<HardDriveIcon size={13} />} label="Install Size" value={formatBytes(game.size_on_disk)} />
                )}
                <MetaCard icon={<ClockIcon size={13} />} label="Last Played" value={formatLastPlayed(game.last_played)} />
                {playtimeLabel && (
                  <MetaCard
                    icon={<GamepadIcon size={13} />}
                    label="Time Played"
                    value={playtimeLabel}
                    accent
                  />
                )}
              </>
            )}
          </div>

          {/* Description */}
          {!loading && !isEpic && detail?.short_description && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>About</span>
              <p className={styles.description}>{detail.short_description}</p>
            </div>
          )}

          {/* Collections */}
          <div className={styles.section}>
            <div className={styles.collectionHeader}>
              <span className={styles.sectionLabel}>Collections</span>
              <div className={styles.collectionPickerWrap} ref={pickerRef}>
                <button
                  className={styles.addToCollectionBtn}
                  onClick={() => setCollectionPickerOpen(o => !o)}
                  aria-label="Add to collection"
                  aria-haspopup="true"
                  aria-expanded={collectionPickerOpen}
                  type="button"
                >
                  <PlusIcon size={11} />
                  Add to collection
                </button>
                {collectionPickerOpen && (
                  <div className={styles.collectionPicker} role="menu">
                    {collections.length === 0 ? (
                      <p className={styles.pickerEmpty}>No collections yet.</p>
                    ) : (
                      collections.map(c => {
                        const inCollection = gameCollections.some(gc => gc.id === c.id);
                        return (
                          <button
                            key={c.id}
                            className={`${styles.pickerItem} ${inCollection ? styles.pickerItemActive : ""}`}
                            onClick={() => {
                              if (inCollection) onRemoveFromCollection(c.id);
                              else onAddToCollection(c.id);
                            }}
                            role="menuitemcheckbox"
                            aria-checked={inCollection}
                            type="button"
                          >
                            <span className={styles.pickerDot} style={{ background: c.color }} />
                            <span className={styles.pickerName}>{c.name}</span>
                            {inCollection && <XIcon size={10} className={styles.pickerRemove} />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            {gameCollections.length > 0 ? (
              <div className={styles.collectionTags}>
                {gameCollections.map(c => (
                  <span key={c.id} className={styles.collectionTag} style={{ borderColor: c.color, color: c.color }}>
                    <TagIcon size={10} />
                    {c.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className={styles.noCollections}>Not in any collections.</p>
            )}
          </div>

          {/* Screenshots */}
          {!loading && !isEpic && (detail?.screenshots?.length ?? 0) > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Screenshots</span>
              <div className={styles.screenshots} role="list" aria-label="Game screenshots">
                {detail!.screenshots.map((src, i) => (
                  <button
                    key={i}
                    className={styles.screenshotBtn}
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`View screenshot ${i + 1} of ${detail!.screenshots.length} in fullscreen`}
                    type="button"
                    role="listitem"
                  >
                    <img
                      className={styles.screenshot}
                      src={src}
                      alt={`${game.name} screenshot ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      width={240}
                      height={135}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Screenshot lightbox */}
      {lightboxIndex !== null && detail?.screenshots && (
        <ScreenshotLightbox
          screenshots={detail.screenshots}
          initialIndex={lightboxIndex}
          gameName={game.name}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}

function MetaCard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent?: boolean;
}) {
  return (
    <div className={`${styles.metaCard} ${accent ? styles.metaCardAccent : ""}`}>
      <span className={styles.metaLabel}>
        {icon}
        {label}
      </span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}
