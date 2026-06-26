import { useCallback, useEffect, useRef, useState } from "react";
import {
  getConfig, getSteamGames, getEpicGames,
  steamToLibrary, epicToLibrary, gameKey,
  formatPlaytime, formatBytes,
  type LibraryGame, type LauncherConfig,
} from "./api/games";
import { useAppearance } from "./hooks/useAppearance";
import { useLibraryFilter } from "./hooks/useLibraryFilter";
import { useGameMetaCache } from "./hooks/useGameMetaCache";
import { useMetaFilter } from "./hooks/useMetaFilter";
import { usePlaytime } from "./hooks/usePlaytime";
import { useCollections } from "./hooks/useCollections";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { applyMetaFilters } from "./components/MetaFilters";
import GameGrid from "./components/GameGrid";
import GameDetailView from "./components/GameDetailView";
import LibraryToolbar from "./components/LibraryToolbar";
import MetaFilters from "./components/MetaFilters";
import MenuBar, { type AppView } from "./components/MenuBar";
import SettingsPage from "./components/SettingsPage";
import HomeView from "./components/HomeView";
import CreateCollectionModal from "./components/CreateCollectionModal";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import styles from "./App.module.css";

export default function App() {
  const appearance = useAppearance();
  const [config, setConfig]             = useState<LauncherConfig | null>(null);
  const [games, setGames]               = useState<LibraryGame[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey]     = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<LibraryGame | null>(null);
  const [activeView, setActiveView]     = useState<AppView>("home");
  const [configError, setConfigError]   = useState<string | null>(null);
  const [scanError, setScanError]       = useState<string | null>(null);
  const [launchError, setLaunchError]   = useState<string | null>(null);
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const launchErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const playtime = usePlaytime();
  const collections = useCollections();

  const playtimeMap = Object.fromEntries(
    games.map(g => [gameKey(g), playtime.getSecondsPlayed(g)])
  );

  const {
    filtered: tier1Filtered,
    search, setSearch,
    sort, setSort,
    playFilter, setPlayFilter,
    sizeFilters, toggleSizeFilter,
    isFavorite, toggleFavorite,
    viewMode, setViewMode,
    favoritesOnly, setFavoritesOnly,
    platformFilter, setPlatformFilter,
    activeFilterCount,
    clearFilters,
  } = useLibraryFilter(games, playtimeMap);

  const { metaByAppId, cacheProgress, isWarming } = useGameMetaCache(games, config?.steam_paths ?? []);
  const metaFilter = useMetaFilter();

  // Apply collection filter after meta filters
  const metaFiltered = applyMetaFilters(tier1Filtered, metaByAppId, metaFilter.metaFilterState);
  const filtered = collections.activeCollectionIds.length > 0
    ? metaFiltered.filter(game => {
        const key = gameKey(game);
        return collections.activeCollectionIds.some(cid => {
          const c = collections.collections.find(col => col.id === cid);
          return c?.game_ids.includes(key);
        });
      })
    : metaFiltered;

  // Load config once
  useEffect(() => {
    getConfig()
      .then(setConfig)
      .catch((err: unknown) => {
        setConfigError(err instanceof Error ? err.message : "Could not connect to backend.");
        setLoading(false);
      });
  }, []);

  // Load / reload all games when config or refreshKey changes
  useEffect(() => {
    if (!config) return;
    setLoading(true);
    if (refreshKey > 0) setIsRefreshing(true);
    setScanError(null);

    const steamPromise = getSteamGames(config.steam_paths)
      .then(list => list.map(steamToLibrary));

    const epicPromise = (config.epic_paths.length > 0
      ? getEpicGames(config.epic_paths, config.epic_executable)
      : Promise.resolve([]))
      .then(list => list.map(epicToLibrary))
      .catch(() => [] as LibraryGame[]);

    Promise.all([steamPromise, epicPromise])
      .then(([steamGames, epicGames]) => {
        setGames([...steamGames, ...epicGames]);
      })
      .catch((err: unknown) => {
        setScanError(err instanceof Error ? err.message : "Failed to scan libraries.");
        setGames([]);
      })
      .finally(() => {
        setLoading(false);
        setIsRefreshing(false);
      });
  }, [config, refreshKey]);

  const hasEpicGames = games.some(g => g.platform === "epic");

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setRefreshKey(k => k + 1);
  }, [isRefreshing]);

  const handleGameLaunched = useCallback((game: LibraryGame) => {
    playtime.startSession(game);
  }, [playtime]);

  const handleLaunchError = (msg: string) => {
    setLaunchError(msg);
    if (launchErrorTimer.current) clearTimeout(launchErrorTimer.current);
    launchErrorTimer.current = setTimeout(() => setLaunchError(null), 5000);
  };

  const handleSettingsSave = (updated: LauncherConfig) => {
    setConfig(updated);
    setSettingsOpen(false);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => {
      setActiveView("library");
      // Small delay to let the library panel mount if switching from home
      setTimeout(() => searchInputRef.current?.focus(), 50);
    },
    onRefresh: handleRefresh,
    onViewGrid: () => setViewMode("grid"),
    onViewList: () => setViewMode("list"),
    onGoHome: () => setActiveView("home"),
    onGoLibrary: () => setActiveView("library"),
    onShowShortcuts: () => setShortcutsOpen(o => !o),
  });

  const totalActiveFilters = activeFilterCount + metaFilter.activeMetaFilterCount + collections.activeCollectionIds.length;

  const totalPlaytimeSecs = Object.values(playtimeMap).reduce((s, v) => s + v, 0);
  const totalSizeBytes = games.reduce((s, g) => s + (g.size_on_disk ?? 0), 0);
  const favCount = games.filter(g => isFavorite(g.id)).length;

  const gameCountLabel = !loading
    ? totalActiveFilters > 0
      ? `${filtered.length} of ${games.length} ${games.length === 1 ? "game" : "games"}`
      : `${games.length} ${games.length === 1 ? "game" : "games"}`
    : null;

  return (
    <div className={styles.layout}>
      <MenuBar
        theme={appearance.resolvedTheme}
        onToggleTheme={() =>
          appearance.setTheme(appearance.resolvedTheme === "dark" ? "light" : "dark")
        }
        onOpenSettings={() => setSettingsOpen(true)}
        activeSession={playtime.activeSession}
        elapsedSecs={playtime.elapsedSecs}
        onStopSession={playtime.endSession}
        activeView={activeView}
        onViewChange={setActiveView}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      {activeView === "home" ? (
        <HomeView
          games={games}
          playtimeMap={playtimeMap}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          onSelectGame={(game) => {
            setSelectedGame(game);
          }}
          onBrowseLibrary={() => setActiveView("library")}
          steamExecutable={config?.steam_executable ?? ""}
          onGameLaunched={handleGameLaunched}
          onLaunchError={handleLaunchError}
        />
      ) : (
        <div className={styles.body}>
          {/* ── Filter sidebar ── */}
          <aside className={styles.filterSidebar} aria-label="Library filters">
            <MetaFilters
              metaByAppId={metaByAppId}
              games={tier1Filtered}
              filterState={metaFilter.metaFilterState}
              onChange={(s) => {
                metaFilter.setGenres(s.genres);
                metaFilter.setDevelopers(s.developers);
                metaFilter.setPublishers(s.publishers ?? []);
                metaFilter.setYears(s.years);
              }}
              isWarming={isWarming}
              cacheProgress={cacheProgress}
              collections={collections.collections}
              activeCollectionIds={collections.activeCollectionIds}
              onToggleCollection={collections.toggleCollectionFilter}
              onCreateCollection={() => setCreateCollectionOpen(true)}
              onDeleteCollection={collections.deleteCollection}
              onRenameCollection={collections.renameCollection}
            />
          </aside>

          {/* ── Main content ── */}
          <main className={styles.main}>
            <div className={styles.mainInner}>
              {configError && (
                <div className={`${styles.launchError} ${styles.errorCritical}`} role="alert">
                  <span>Backend unavailable — {configError}</span>
                </div>
              )}
              {scanError && (
                <div className={styles.launchError} role="alert">
                  <span>Library scan failed: {scanError}</span>
                  <button onClick={() => setScanError(null)} aria-label="Dismiss" className={styles.launchErrorDismiss}>✕</button>
                </div>
              )}
              {launchError && (
                <div className={styles.launchError} role="alert">
                  <span>Launch failed: {launchError}</span>
                  <button onClick={() => setLaunchError(null)} aria-label="Dismiss" className={styles.launchErrorDismiss}>✕</button>
                </div>
              )}

              <div className={styles.sectionHeader}>
                <h1 className={styles.sectionTitle}>My Library</h1>
                {gameCountLabel && (
                  <span className={styles.gameCount} aria-live="polite">{gameCountLabel}</span>
                )}
              </div>

              {!loading && games.length > 0 && (
                <div className={styles.statsRow} aria-label="Library statistics">
                  <span className={styles.statPill}>{games.length} games</span>
                  {totalPlaytimeSecs > 60 && (
                    <span className={styles.statPill}>{formatPlaytime(totalPlaytimeSecs)} tracked</span>
                  )}
                  {totalSizeBytes > 0 && (
                    <span className={styles.statPill}>{formatBytes(totalSizeBytes)} installed</span>
                  )}
                  {favCount > 0 && (
                    <span className={styles.statPill}>{favCount} {favCount === 1 ? "favorite" : "favorites"}</span>
                  )}
                </div>
              )}

              <LibraryToolbar
                search={search}
                onSearchChange={setSearch}
                searchInputRef={searchInputRef}
                sort={sort}
                onSortChange={setSort}
                playFilter={playFilter}
                onPlayFilterChange={setPlayFilter}
                sizeFilters={sizeFilters}
                onSizeFilterToggle={toggleSizeFilter}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                favoritesOnly={favoritesOnly}
                onFavoritesToggle={() => setFavoritesOnly(prev => !prev)}
                platformFilter={platformFilter}
                onPlatformFilterChange={setPlatformFilter}
                activeFilterCount={totalActiveFilters}
                onClearFilters={() => {
                  clearFilters();
                  metaFilter.clearMetaFilters();
                  collections.clearCollectionFilters();
                }}
                totalGames={games.length}
                filteredCount={filtered.length}
                hasEpicGames={hasEpicGames}
                onSurpriseMe={() => {
                  if (filtered.length === 0) return;
                  const pick = filtered[Math.floor(Math.random() * filtered.length)];
                  setSelectedGame(pick);
                }}
              />

              <GameGrid
                games={filtered}
                loading={loading}
                steamExecutable={config?.steam_executable ?? ""}
                onSelectGame={setSelectedGame}
                viewMode={viewMode}
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                hasActiveFilters={totalActiveFilters > 0}
                onLaunchError={handleLaunchError}
                onGameLaunched={handleGameLaunched}
                getSecondsPlayed={playtime.getSecondsPlayed}
              />
            </div>
          </main>
        </div>
      )}

      {selectedGame && config && (
        <GameDetailView
          game={selectedGame}
          steamExecutable={config.steam_executable}
          steamPaths={config.steam_paths}
          onBack={() => setSelectedGame(null)}
          secondsPlayed={playtime.getSecondsPlayed(selectedGame)}
          collections={collections.collections}
          gameCollections={collections.getGameCollections(selectedGame)}
          onAddToCollection={(cid) => collections.addGameToCollection(cid, selectedGame)}
          onRemoveFromCollection={(cid) => collections.removeGameFromCollection(cid, selectedGame)}
          onGameLaunched={handleGameLaunched}
        />
      )}

      {settingsOpen && config && (
        <SettingsPage
          config={config}
          themeSetting={appearance.themeSetting}
          accentId={appearance.accentId}
          uiDensity={appearance.uiDensity}
          onThemeChange={appearance.setTheme}
          onAccentChange={appearance.setAccent}
          onUiDensityChange={appearance.setUiDensity}
          onSave={handleSettingsSave}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {createCollectionOpen && (
        <CreateCollectionModal
          onConfirm={async (name, color) => {
            await collections.createCollection(name, color);
          }}
          onClose={() => setCreateCollectionOpen(false)}
        />
      )}

      {shortcutsOpen && (
        <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}
