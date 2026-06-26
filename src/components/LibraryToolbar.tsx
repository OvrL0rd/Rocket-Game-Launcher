import { useState, useRef, useEffect } from "react";
import { XIcon, LayoutGridIcon, StarIcon, SearchIcon, ListViewIcon, ChevronDownIcon, ShuffleIcon } from "./Icons";
import type { SortOption, PlayFilter, SizeFilter } from "../hooks/useLibraryFilter";
import type { Platform } from "../api/games";
import styles from "./LibraryToolbar.module.css";

export interface LibraryToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  playFilter: PlayFilter;
  onPlayFilterChange: (v: PlayFilter) => void;
  sizeFilters: SizeFilter[];
  onSizeFilterToggle: (v: SizeFilter) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (v: "grid" | "list") => void;
  favoritesOnly: boolean;
  onFavoritesToggle: () => void;
  platformFilter: Platform | "all";
  onPlatformFilterChange: (v: Platform | "all") => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  totalGames: number;
  filteredCount: number;
  hasEpicGames: boolean;
  onSurpriseMe?: () => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name-asc",    label: "Name A → Z"      },
  { value: "name-desc",   label: "Name Z → A"      },
  { value: "last-played", label: "Last Played"      },
  { value: "most-played", label: "Most Played"      },
  { value: "size-desc",   label: "Size — Largest"   },
  { value: "size-asc",    label: "Size — Smallest"  },
];

const SIZE_CHIPS: { value: SizeFilter; label: string }[] = [
  { value: "lt1",   label: "< 1 GB"  },
  { value: "1to5",  label: "1–5 GB"  },
  { value: "5to20", label: "5–20 GB" },
  { value: "gt20",  label: "> 20 GB" },
];

function SortDropdown({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = SORT_OPTIONS.find(o => o.value === value)!;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div className={styles.sortWrap} ref={ref}>
      <button
        className={styles.sortTrigger}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        type="button"
      >
        <span className={styles.sortLabel}>{current.label}</span>
        <ChevronDownIcon size={12} className={`${styles.sortChevron} ${open ? styles.sortChevronOpen : ""}`} />
      </button>

      {open && (
        <div className={styles.sortMenu} role="listbox" aria-label="Sort order">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`${styles.sortOption} ${o.value === value ? styles.sortOptionActive : ""}`}
              role="option"
              aria-selected={o.value === value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              type="button"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryToolbar({
  search, onSearchChange, searchInputRef,
  sort, onSortChange,
  playFilter, onPlayFilterChange,
  sizeFilters, onSizeFilterToggle,
  viewMode, onViewModeChange,
  favoritesOnly, onFavoritesToggle,
  platformFilter, onPlatformFilterChange,
  activeFilterCount, onClearFilters,
  totalGames, filteredCount,
  hasEpicGames, onSurpriseMe,
}: LibraryToolbarProps) {
  const hasChipFilters = playFilter !== null || sizeFilters.length > 0 || favoritesOnly || platformFilter !== "all";

  return (
    <div className={styles.toolbar}>
      {/* ── Top row: search + controls ── */}
      <div className={styles.topRow}>
        <div className={styles.searchWrapper}>
          <SearchIcon size={14} className={styles.searchIcon} />
          <input
            ref={searchInputRef}
            className={styles.searchInput}
            type="search"
            placeholder="Search games…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            aria-label="Search games"
          />
          {search && (
            <button
              className={styles.clearSearch}
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              type="button"
            >
              <XIcon size={12} />
            </button>
          )}
        </div>

        <div className={styles.controls}>
          <SortDropdown value={sort} onChange={onSortChange} />

          {onSurpriseMe && filteredCount > 0 && (
            <button
              className={styles.surpriseBtn}
              onClick={onSurpriseMe}
              aria-label="Open a random game from the current list"
              title="Surprise Me"
              type="button"
            >
              <ShuffleIcon size={14} />
              Surprise Me
            </button>
          )}

          <div className={styles.viewToggle} role="group" aria-label="View mode">
            <button
              className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
              onClick={() => onViewModeChange("grid")}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              type="button"
            >
              <LayoutGridIcon size={15} />
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
              onClick={() => onViewModeChange("list")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              type="button"
            >
              <ListViewIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Chips row: quick filters ── */}
      <div className={styles.chipsRow} role="group" aria-label="Quick filters">

        {/* Platform tabs — only shown when Epic games are present */}
        {hasEpicGames && (
          <>
            <div className={styles.platformTabs} role="group" aria-label="Platform filter">
              {(["all", "steam", "epic"] as const).map(p => (
                <button
                  key={p}
                  className={`${styles.platformTab} ${platformFilter === p ? styles.platformTabActive : ""}`}
                  data-platform={p}
                  onClick={() => onPlatformFilterChange(p)}
                  aria-pressed={platformFilter === p}
                  type="button"
                >
                  {p === "all" ? "All" : p === "steam" ? "Steam" : "Epic"}
                </button>
              ))}
            </div>
            <span className={styles.chipDivider} aria-hidden="true" />
          </>
        )}

        <button
          className={`${styles.chip} ${playFilter === "unplayed" ? styles.chipActive : ""}`}
          onClick={() => onPlayFilterChange(playFilter === "unplayed" ? null : "unplayed")}
          aria-pressed={playFilter === "unplayed"}
          type="button"
        >
          Unplayed
        </button>
        <button
          className={`${styles.chip} ${playFilter === "recent" ? styles.chipActive : ""}`}
          onClick={() => onPlayFilterChange(playFilter === "recent" ? null : "recent")}
          aria-pressed={playFilter === "recent"}
          type="button"
        >
          Recent
        </button>

        <span className={styles.chipDivider} aria-hidden="true" />

        {SIZE_CHIPS.map(({ value, label }) => (
          <button
            key={value}
            className={`${styles.chip} ${sizeFilters.includes(value) ? styles.chipActive : ""}`}
            onClick={() => onSizeFilterToggle(value)}
            aria-pressed={sizeFilters.includes(value)}
            type="button"
          >
            {label}
          </button>
        ))}

        <span className={styles.chipDivider} aria-hidden="true" />

        <button
          className={`${styles.chip} ${styles.chipStar} ${favoritesOnly ? styles.chipStarActive : ""}`}
          onClick={onFavoritesToggle}
          aria-pressed={favoritesOnly}
          type="button"
        >
          <StarIcon size={11} filled={favoritesOnly} />
          Favorites
        </button>

        {(activeFilterCount > 0 || hasChipFilters) && (
          <button className={styles.clearAll} onClick={onClearFilters} type="button">
            <XIcon size={10} /> Clear all
          </button>
        )}

        {activeFilterCount > 0 && (
          <span className={styles.filterCount} aria-live="polite">
            {filteredCount} / {totalGames}
          </span>
        )}
      </div>
    </div>
  );
}
