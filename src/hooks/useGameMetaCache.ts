import { useEffect, useRef, useState } from "react";
import { getGameDetail } from "../api/games";
import type { LibraryGame } from "../api/games";

export interface CachedMeta {
  genres: string[];
  developers: string[];
  publishers: string[];
  releaseYear: number | null;
}

export interface UseGameMetaCacheReturn {
  metaByAppId: Record<string, CachedMeta>;
  cacheProgress: { done: number; total: number };
  isWarming: boolean;
}

const CACHE_KEY = "rgl-meta-cache";
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONCURRENT = 3;
const YEAR_RE = /\b(19|20)\d{2}\b/;

type CacheEntry = { data: CachedMeta; fetchedAt: number };
type CacheStore = Record<string, CacheEntry>;

function loadStore(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheStore) : {};
  } catch {
    return {};
  }
}

function saveStore(store: CacheStore): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // quota exceeded — in-memory cache remains valid for this session
  }
}

function parseReleaseYear(releaseDate: string): number | null {
  const match = YEAR_RE.exec(releaseDate);
  return match ? parseInt(match[0], 10) : null;
}

function buildInitialMeta(): Record<string, CachedMeta> {
  const store = loadStore();
  const now = Date.now();
  const result: Record<string, CachedMeta> = {};
  for (const [id, entry] of Object.entries(store)) {
    if (now - entry.fetchedAt < TTL_MS) {
      result[id] = entry.data;
    }
  }
  return result;
}

export function useGameMetaCache(
  games: LibraryGame[],
  steamPaths: string[]
): UseGameMetaCacheReturn {
  const [metaByAppId, setMetaByAppId] = useState<Record<string, CachedMeta>>(buildInitialMeta);
  const [cacheProgress, setCacheProgress] = useState({ done: 0, total: 0 });
  const [isWarming, setIsWarming] = useState(false);

  // Only warm cache for Steam games (Epic doesn't have a detail API)
  const steamGames = games.filter(g => g.platform === "steam" && g.app_id);

  const steamPathsKey = steamPaths.join("\0");
  const gameIdsKey = steamGames.map((g) => g.app_id).join(",");

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, [steamPathsKey, gameIdsKey]);

  useEffect(() => {
    if (steamGames.length === 0) return;

    const store = loadStore();
    const now = Date.now();
    const toFetch = steamGames.filter(
      (g) => !store[g.app_id!] || now - store[g.app_id!].fetchedAt >= TTL_MS
    );

    if (toFetch.length === 0) return;

    let cancelled = false;
    let done = 0;
    let running = 0;
    let cursor = 0;

    setCacheProgress({ done: 0, total: toFetch.length });
    setIsWarming(true);

    const processNext = () => {
      while (running < MAX_CONCURRENT && cursor < toFetch.length) {
        const game = toFetch[cursor++];
        running++;

        getGameDetail(game.app_id!, steamPaths)
          .then((detail) => {
            if (cancelled) return;

            const meta: CachedMeta = {
              genres: detail.genres,
              developers: detail.developers,
              publishers: detail.publishers,
              releaseYear: parseReleaseYear(detail.release_date),
            };

            const freshStore = loadStore();
            freshStore[game.app_id!] = { data: meta, fetchedAt: Date.now() };
            saveStore(freshStore);

            setMetaByAppId((prev) => ({ ...prev, [game.app_id!]: meta }));
          })
          .catch(() => {})
          .finally(() => {
            if (cancelled) return;
            running--;
            done++;
            setCacheProgress({ done, total: toFetch.length });
            if (cursor < toFetch.length) {
              processNext();
            } else if (running === 0) {
              setIsWarming(false);
            }
          });
      }
    };

    processNext();

    return () => {
      cancelled = true;
      setIsWarming(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamPathsKey, gameIdsKey]);

  return { metaByAppId, cacheProgress, isWarming };
}
