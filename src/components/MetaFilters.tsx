import { useMemo, useState, useRef, useEffect } from "react";
import type { LibraryGame } from "../api/games";
import type { CachedMeta } from "../hooks/useGameMetaCache";
import type { MetaFilterState } from "../hooks/useMetaFilter";
import type { Collection } from "../api/collections";
import { XIcon, SearchIcon, PlusIcon, TrashIcon, MoreVerticalIcon } from "./Icons";
import styles from "./MetaFilters.module.css";

export interface MetaFiltersProps {
  metaByAppId: Record<string, CachedMeta>;
  games: LibraryGame[];
  filterState: MetaFilterState;
  onChange: (state: MetaFilterState) => void;
  isWarming: boolean;
  cacheProgress: { done: number; total: number };
  // Collections
  collections: Collection[];
  activeCollectionIds: string[];
  onToggleCollection: (id: string) => void;
  onCreateCollection: () => void;
  onDeleteCollection: (id: string) => void;
  onRenameCollection: (id: string, name: string) => void;
  // Publisher filter
  onPublishersChange?: (publishers: string[]) => void;
}

export function applyMetaFilters(
  games: LibraryGame[],
  metaByAppId: Record<string, CachedMeta>,
  filterState: MetaFilterState
): LibraryGame[] {
  const { genres, developers, publishers, years } = filterState;
  if (!genres.length && !developers.length && !publishers.length && !years.length) return games;
  return games.filter((game) => {
    const meta = game.app_id ? metaByAppId[game.app_id] : undefined;
    if (!meta) return game.platform === "epic"; // Epic games pass through meta filter
    if (genres.length && !genres.some((g) => meta.genres.includes(g))) return false;
    if (developers.length && !developers.some((d) => meta.developers.includes(d))) return false;
    if (publishers.length && !publishers.some((p) => meta.publishers.includes(p))) return false;
    if (years.length && (meta.releaseYear === null || !years.includes(meta.releaseYear))) return false;
    return true;
  });
}

// ─── Collection chip with context menu ────────────────────────────────────────

function CollectionChip({
  collection, active, onToggle, onDelete, onRename,
}: {
  collection: Collection;
  active: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(collection.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const commitRename = () => {
    const v = nameValue.trim();
    if (v && v !== collection.name) onRename(v);
    setRenaming(false);
  };

  if (renaming) {
    return (
      <div className={styles.collectionRenameWrap}>
        <input
          ref={inputRef}
          className={styles.collectionRenameInput}
          value={nameValue}
          onChange={e => setNameValue(e.target.value)}
          onBlur={commitRename}
          onKeyDown={e => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setNameValue(collection.name); setRenaming(false); }
          }}
          aria-label="Rename collection"
          maxLength={40}
        />
      </div>
    );
  }

  return (
    <div className={`${styles.collectionChipWrap} ${active ? styles.collectionChipWrapActive : ""}`} ref={menuRef}>
      <button
        className={styles.collectionChip}
        style={{ "--c-color": collection.color } as React.CSSProperties}
        onClick={onToggle}
        aria-pressed={active}
        type="button"
      >
        <span className={styles.collectionDot} style={{ background: collection.color }} aria-hidden="true" />
        <span className={styles.collectionName}>{collection.name}</span>
      </button>
      <button
        className={styles.collectionMoreBtn}
        onClick={() => setMenuOpen(o => !o)}
        aria-label={`Options for ${collection.name}`}
        aria-haspopup="true"
        aria-expanded={menuOpen}
        type="button"
      >
        <MoreVerticalIcon size={11} />
      </button>
      {menuOpen && (
        <div className={styles.collectionMenu} role="menu">
          <button
            className={styles.collectionMenuItem}
            role="menuitem"
            onClick={() => { setRenaming(true); setMenuOpen(false); }}
            type="button"
          >
            Rename
          </button>
          <button
            className={`${styles.collectionMenuItem} ${styles.collectionMenuItemDanger}`}
            role="menuitem"
            onClick={() => { onDelete(); setMenuOpen(false); }}
            type="button"
          >
            <TrashIcon size={11} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar section wrapper ───────────────────────────────────────────────────

function SidebarSection({ label, activeCount, onClear, children, action }: {
  label: string; activeCount: number; onClear: () => void;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionLabel}>{label}</span>
        <div className={styles.sectionActions}>
          {action}
          {activeCount > 0 && (
            <button
              className={styles.sectionClear}
              onClick={onClear}
              type="button"
              aria-label={`Clear ${label} filter`}
            >
              <XIcon size={10} />
              {activeCount}
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function MetaFilters({
  metaByAppId, games, filterState, onChange, isWarming, cacheProgress,
  collections, activeCollectionIds, onToggleCollection, onCreateCollection,
  onDeleteCollection, onRenameCollection,
}: MetaFiltersProps) {
  const [devSearch, setDevSearch] = useState("");
  const [pubSearch, setPubSearch] = useState("");

  const hasAnyMeta = Object.keys(metaByAppId).length > 0;
  const noMetaYet  = isWarming && !hasAnyMeta;

  const genreOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const game of games) {
      const meta = game.app_id ? metaByAppId[game.app_id] : undefined;
      if (meta) for (const g of meta.genres) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count }));
  }, [games, metaByAppId]);

  const developerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const game of games) {
      const meta = game.app_id ? metaByAppId[game.app_id] : undefined;
      if (meta) for (const d of meta.developers) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count }));
  }, [games, metaByAppId]);

  const publisherOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const game of games) {
      const meta = game.app_id ? metaByAppId[game.app_id] : undefined;
      if (meta) for (const p of meta.publishers) counts.set(p, (counts.get(p) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, count]) => ({ label, count }));
  }, [games, metaByAppId]);

  const yearOptions = useMemo(() => {
    const counts = new Map<number, number>();
    for (const game of games) {
      const meta = game.app_id ? metaByAppId[game.app_id] : undefined;
      if (meta?.releaseYear != null) counts.set(meta.releaseYear, (counts.get(meta.releaseYear) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => b - a).map(([year, count]) => ({ year, count }));
  }, [games, metaByAppId]);

  const filteredDevs = devSearch.trim()
    ? developerOptions.filter(({ label }) => label.toLowerCase().includes(devSearch.toLowerCase()))
    : developerOptions;

  const filteredPubs = pubSearch.trim()
    ? publisherOptions.filter(({ label }) => label.toLowerCase().includes(pubSearch.toLowerCase()))
    : publisherOptions;

  const toggle = <T,>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <span className={styles.headerLabel}>FILTERS</span>
        {(filterState.genres.length + filterState.developers.length + filterState.publishers.length + filterState.years.length) > 0 && (
          <button
            className={styles.clearAll}
            onClick={() => onChange({ genres: [], developers: [], publishers: [], years: [] })}
            type="button"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Collections ── */}
      <SidebarSection
        label="COLLECTIONS"
        activeCount={activeCollectionIds.length}
        onClear={() => activeCollectionIds.forEach(id => onToggleCollection(id))}
        action={
          <button
            className={styles.addCollectionBtn}
            onClick={onCreateCollection}
            type="button"
            aria-label="Create new collection"
            title="New collection"
          >
            <PlusIcon size={11} />
          </button>
        }
      >
        {collections.length === 0 ? (
          <p className={styles.hint}>
            No collections yet.{" "}
            <button
              className={styles.hintLink}
              onClick={onCreateCollection}
              type="button"
            >
              Create one
            </button>
          </p>
        ) : (
          <div className={styles.collectionList}>
            {collections.map(c => (
              <CollectionChip
                key={c.id}
                collection={c}
                active={activeCollectionIds.includes(c.id)}
                onToggle={() => onToggleCollection(c.id)}
                onDelete={() => onDeleteCollection(c.id)}
                onRename={(name) => onRenameCollection(c.id, name)}
              />
            ))}
          </div>
        )}
      </SidebarSection>

      {/* ── Cache warming progress ── */}
      {noMetaYet && (
        <div className={styles.warming}>
          <div className={styles.warmingBar}>
            <div
              className={styles.warmingFill}
              style={{ width: `${cacheProgress.total > 0 ? (cacheProgress.done / cacheProgress.total) * 100 : 0}%` }}
            />
          </div>
          <span className={styles.warmingText}>
            Loading metadata&hellip; <span className={styles.warmingNum}>{cacheProgress.done}/{cacheProgress.total}</span>
          </span>
        </div>
      )}

      {isWarming && hasAnyMeta && (
        <div className={styles.updatingRow}>
          <span className={styles.updatingDot} />
          <span className={styles.updatingText}>Updating&hellip;</span>
        </div>
      )}

      {/* ── Genre chips ── */}
      {(genreOptions.length > 0 || isWarming) && (
        <SidebarSection
          label="GENRE"
          activeCount={filterState.genres.length}
          onClear={() => onChange({ ...filterState, genres: [] })}
        >
          {genreOptions.length === 0 ? (
            <p className={styles.hint}>Fetching&hellip;</p>
          ) : (
            <div className={styles.chipCloud}>
              {genreOptions.map(({ label, count }) => {
                const active = filterState.genres.includes(label);
                return (
                  <button
                    key={label}
                    className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                    onClick={() => onChange({ ...filterState, genres: toggle(filterState.genres, label) })}
                    aria-pressed={active}
                    title={`${label} (${count})`}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </SidebarSection>
      )}

      {/* ── Release year ── */}
      {(yearOptions.length > 0 || isWarming) && (
        <SidebarSection
          label="RELEASE YEAR"
          activeCount={filterState.years.length}
          onClear={() => onChange({ ...filterState, years: [] })}
        >
          {yearOptions.length === 0 ? (
            <p className={styles.hint}>Fetching&hellip;</p>
          ) : (
            <div className={styles.yearGrid}>
              {yearOptions.map(({ year, count }) => {
                const active = filterState.years.includes(year);
                return (
                  <button
                    key={year}
                    className={`${styles.yearPill} ${active ? styles.yearPillActive : ""}`}
                    onClick={() => onChange({ ...filterState, years: toggle(filterState.years, year) })}
                    aria-pressed={active}
                    title={`${year} (${count} games)`}
                    type="button"
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}
        </SidebarSection>
      )}

      {/* ── Developer ── */}
      {(developerOptions.length > 0 || isWarming) && (
        <SidebarSection
          label="DEVELOPER"
          activeCount={filterState.developers.length}
          onClear={() => onChange({ ...filterState, developers: [] })}
        >
          {developerOptions.length === 0 ? (
            <p className={styles.hint}>Fetching&hellip;</p>
          ) : (
            <>
              {developerOptions.length > 8 && (
                <div className={styles.devSearch}>
                  <SearchIcon size={11} className={styles.devSearchIcon} />
                  <input
                    className={styles.devSearchInput}
                    type="text"
                    placeholder="Search developers…"
                    value={devSearch}
                    onChange={e => setDevSearch(e.target.value)}
                    aria-label="Search developers"
                  />
                  {devSearch && (
                    <button
                      className={styles.devSearchClear}
                      onClick={() => setDevSearch("")}
                      type="button"
                      aria-label="Clear developer search"
                    >
                      <XIcon size={10} />
                    </button>
                  )}
                </div>
              )}
              <div className={styles.devList}>
                {filteredDevs.slice(0, 40).map(({ label, count }) => {
                  const active = filterState.developers.includes(label);
                  return (
                    <label
                      key={label}
                      className={`${styles.devRow} ${active ? styles.devRowActive : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => onChange({ ...filterState, developers: toggle(filterState.developers, label) })}
                        className={styles.devCheckbox}
                        aria-label={label}
                      />
                      <span className={styles.devBox} aria-hidden="true" />
                      <span className={styles.devLabel}>{label}</span>
                      <span className={styles.devCount}>{count}</span>
                    </label>
                  );
                })}
                {filteredDevs.length === 0 && (
                  <p className={styles.hint}>No matches</p>
                )}
              </div>
            </>
          )}
        </SidebarSection>
      )}

      {/* ── Publisher ── */}
      {(publisherOptions.length > 0 || isWarming) && (
        <SidebarSection
          label="PUBLISHER"
          activeCount={filterState.publishers.length}
          onClear={() => onChange({ ...filterState, publishers: [] })}
        >
          {publisherOptions.length === 0 ? (
            <p className={styles.hint}>Fetching&hellip;</p>
          ) : (
            <>
              {publisherOptions.length > 8 && (
                <div className={styles.devSearch}>
                  <SearchIcon size={11} className={styles.devSearchIcon} />
                  <input
                    className={styles.devSearchInput}
                    type="text"
                    placeholder="Search publishers…"
                    value={pubSearch}
                    onChange={e => setPubSearch(e.target.value)}
                    aria-label="Search publishers"
                  />
                  {pubSearch && (
                    <button
                      className={styles.devSearchClear}
                      onClick={() => setPubSearch("")}
                      type="button"
                      aria-label="Clear publisher search"
                    >
                      <XIcon size={10} />
                    </button>
                  )}
                </div>
              )}
              <div className={styles.devList}>
                {filteredPubs.slice(0, 40).map(({ label, count }) => {
                  const active = filterState.publishers.includes(label);
                  return (
                    <label
                      key={label}
                      className={`${styles.devRow} ${active ? styles.devRowActive : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => onChange({ ...filterState, publishers: toggle(filterState.publishers, label) })}
                        className={styles.devCheckbox}
                        aria-label={label}
                      />
                      <span className={styles.devBox} aria-hidden="true" />
                      <span className={styles.devLabel}>{label}</span>
                      <span className={styles.devCount}>{count}</span>
                    </label>
                  );
                })}
                {filteredPubs.length === 0 && (
                  <p className={styles.hint}>No matches</p>
                )}
              </div>
            </>
          )}
        </SidebarSection>
      )}

      {/* Placeholder before metadata loads */}
      {!isWarming && !hasAnyMeta && (
        <p className={styles.noMeta}>
          Genre and developer filters appear as your library loads.
        </p>
      )}
    </div>
  );
}
