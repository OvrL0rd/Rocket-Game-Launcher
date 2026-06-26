import { useState, useMemo } from "react";
import type { LibraryGame, Platform } from "../api/games";
import { gameKey } from "../api/games";

export type SortOption = "name-asc" | "name-desc" | "last-played" | "size-desc" | "size-asc" | "most-played";
export type PlayFilter = "unplayed" | "recent" | null;
export type SizeFilter = "lt1" | "1to5" | "5to20" | "gt20";

const SORT_KEY      = "rgl-sort";
const FAVORITES_KEY = "rgl-favorites";
const VIEW_KEY      = "rgl-view";

const GB = 1_073_741_824;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota exceeded */ }
}

function matchesSize(gb: number, filter: SizeFilter): boolean {
  if (filter === "lt1")   return gb < 1;
  if (filter === "1to5")  return gb >= 1 && gb < 5;
  if (filter === "5to20") return gb >= 5 && gb < 20;
  if (filter === "gt20")  return gb >= 20;
  return false;
}

export function useLibraryFilter(
  games: LibraryGame[],
  playtimeMap?: Record<string, number>
) {
  const [search, setSearch]               = useState("");
  const [sort, setSortState]              = useState<SortOption>(() => readLocal<SortOption>(SORT_KEY, "name-asc"));
  const [playFilter, setPlayFilter]       = useState<PlayFilter>(null);
  const [sizeFilters, setSizeFilters]     = useState<SizeFilter[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites]         = useState<string[]>(() => readLocal<string[]>(FAVORITES_KEY, []));
  const [viewMode, setViewModeState]      = useState<"grid" | "list">(() => readLocal<"grid" | "list">(VIEW_KEY, "grid"));
  const [platformFilter, setPlatformFilter] = useState<Platform | "all">("all");

  const setSort = (v: SortOption) => {
    setSortState(v);
    writeLocal(SORT_KEY, v);
  };

  const setViewMode = (v: "grid" | "list") => {
    setViewModeState(v);
    writeLocal(VIEW_KEY, v);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      writeLocal(FAVORITES_KEY, next);
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const toggleSizeFilter = (v: SizeFilter) => {
    setSizeFilters(prev =>
      prev.includes(v) ? prev.filter(f => f !== v) : [...prev, v]
    );
  };

  const clearFilters = () => {
    setSearch("");
    setPlayFilter(null);
    setSizeFilters([]);
    setFavoritesOnly(false);
    setPlatformFilter("all");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (playFilter !== null) count++;
    count += sizeFilters.length;
    if (favoritesOnly) count++;
    if (platformFilter !== "all") count++;
    return count;
  }, [search, playFilter, sizeFilters, favoritesOnly, platformFilter]);

  const filtered = useMemo(() => {
    let result = [...games];

    if (platformFilter !== "all") {
      result = result.filter(g => g.platform === platformFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(q));
    }

    if (playFilter === "unplayed") {
      result = result.filter(g => g.last_played === 0);
    } else if (playFilter === "recent") {
      const cutoff = Math.floor(Date.now() / 1000) - 90 * 86400;
      result = result.filter(g => g.last_played > cutoff);
    }

    if (sizeFilters.length > 0) {
      result = result.filter(g => {
        const gb = g.size_on_disk / GB;
        return sizeFilters.some(f => matchesSize(gb, f));
      });
    }

    if (favoritesOnly) {
      result = result.filter(g => favorites.includes(g.id));
    }

    result.sort((a, b) => {
      if (sort === "name-asc")     return a.name.localeCompare(b.name);
      if (sort === "name-desc")    return b.name.localeCompare(a.name);
      if (sort === "last-played")  return b.last_played - a.last_played;
      if (sort === "size-desc")    return b.size_on_disk - a.size_on_disk;
      if (sort === "size-asc")     return a.size_on_disk - b.size_on_disk;
      if (sort === "most-played" && playtimeMap) {
        const aTime = playtimeMap[gameKey(a)] ?? 0;
        const bTime = playtimeMap[gameKey(b)] ?? 0;
        return bTime - aTime;
      }
      return 0;
    });

    return result;
  }, [games, search, playFilter, sizeFilters, favoritesOnly, favorites, sort, platformFilter, playtimeMap]);

  return {
    filtered,
    search, setSearch,
    sort, setSort,
    playFilter, setPlayFilter,
    sizeFilters, toggleSizeFilter,
    favorites, toggleFavorite, isFavorite,
    viewMode, setViewMode,
    favoritesOnly, setFavoritesOnly,
    platformFilter, setPlatformFilter,
    activeFilterCount,
    clearFilters,
  };
}
