import { get, post } from "./client";

// ─── Platform types ────────────────────────────────────────────────────────────

export type Platform = "steam" | "epic";

export interface SteamGame {
  name: string;
  app_id: string;
  cover_url: string;
  last_played: number;
  size_on_disk: number;
}

export interface EpicGame {
  app_name: string;
  name: string;
  executable: string;
  launcher_executable: string;
  install_size: number;
  last_played: number;
}

export interface GameDetail {
  app_id: string;
  name: string;
  cover_url: string;
  header_image: string;
  short_description: string;
  developers: string[];
  publishers: string[];
  genres: string[];
  release_date: string;
  screenshots: string[];
  last_played: number;
  size_on_disk: number;
}

export interface LauncherConfig {
  steam_paths: string[];
  steam_executable: string;
  epic_paths: string[];
  epic_executable: string;
}

// ─── Unified library game ──────────────────────────────────────────────────────

export interface LibraryGame {
  /** platform-namespaced ID: app_id for Steam, AppName for Epic */
  id: string;
  name: string;
  platform: Platform;
  cover_url: string;
  last_played: number;
  size_on_disk: number;
  // Steam-only
  app_id?: string;
  // Epic-only
  executable?: string;
  launcher_executable?: string;
}

/** Stable gradient cover placeholder for Epic games (or missing art). */
export function epicCoverPlaceholder(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = Math.imul(31, hash) + name.charCodeAt(i) | 0;
  }
  const hue = Math.abs(hash) % 360;
  const hue2 = (hue + 55) % 360;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? "")
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="hsl(${hue},45%,18%)"/><stop offset="100%" stop-color="hsl(${hue2},45%,10%)"/></linearGradient></defs><rect width="300" height="450" fill="url(#g)"/><text x="150" y="210" font-family="sans-serif" font-size="80" font-weight="700" fill="hsl(${hue},50%,65%)" text-anchor="middle" dominant-baseline="middle" opacity="0.9">${initials}</text><text x="150" y="290" font-family="sans-serif" font-size="13" font-weight="600" fill="hsl(${hue},30%,55%)" text-anchor="middle" dominant-baseline="middle" letter-spacing="3" opacity="0.7">EPIC GAMES</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function steamToLibrary(g: SteamGame): LibraryGame {
  return {
    id: g.app_id,
    name: g.name,
    platform: "steam",
    cover_url: g.cover_url,
    last_played: g.last_played,
    size_on_disk: g.size_on_disk,
    app_id: g.app_id,
  };
}

export function epicToLibrary(g: EpicGame): LibraryGame {
  return {
    id: g.app_name,
    name: g.name,
    platform: "epic",
    cover_url: epicCoverPlaceholder(g.name),
    last_played: g.last_played,
    size_on_disk: g.install_size,
    executable: g.executable,
    launcher_executable: g.launcher_executable,
  };
}

/** Returns the platform-prefixed key used in playtime and collections. */
export function gameKey(game: LibraryGame): string {
  return `${game.platform}:${game.id}`;
}

// ─── API functions ─────────────────────────────────────────────────────────────

export const getSteamGames = (paths: string[]) =>
  get<SteamGame[]>("/games/steam", { paths });

export const getGameDetail = (app_id: string, paths: string[]) =>
  get<GameDetail>(`/games/steam/${app_id}/detail`, { paths });

export const getEpicGames = (paths: string[], launcher_executable: string) =>
  get<EpicGame[]>("/games/epic", { paths, launcher_executable });

export const launchSteam = (app_id: string, steam_executable: string, name: string) =>
  post("/games/steam/launch", { app_id, steam_executable, name });

export const launchEpic = (executable: string, launcher_executable: string, name: string) =>
  post("/games/epic/launch", { executable, launcher_executable, name });

export const getConfig = () => get<LauncherConfig>("/config");

export const getTheme = () => get<{ theme: string }>("/games/theme");

export const openUrl = (url: string) =>
  post<{ status: string }>("/games/open-url", { url });

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "—";
  const gb = bytes / 1_073_741_824;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1_048_576;
  return `${mb.toFixed(0)} MB`;
}

export function formatLastPlayed(unix: number): string {
  if (!unix) return "Never played";
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function formatPlaytime(seconds: number): string {
  if (!seconds || seconds < 60) return "";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours >= 1) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}
