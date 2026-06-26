import type { ActiveSession } from "../hooks/usePlaytime";
import { RocketIcon, SunIcon, MoonIcon, SettingsIcon, HomeIcon, LibraryIcon, RefreshIcon, KeyboardIcon } from "./Icons";
import NowPlaying from "./NowPlaying";
import styles from "./MenuBar.module.css";

export type AppView = "home" | "library";

interface Props {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  activeSession: ActiveSession | null;
  elapsedSecs: number;
  onStopSession: () => void;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onShowShortcuts: () => void;
}

export default function MenuBar({
  theme, onToggleTheme, onOpenSettings,
  activeSession, elapsedSecs, onStopSession,
  activeView, onViewChange,
  onRefresh, isRefreshing,
  onShowShortcuts,
}: Props) {
  return (
    <header className={styles.bar}>
      {/* ── Brand + Nav ── */}
      <div className={styles.brandNav}>
        <div className={styles.brand}>
          <RocketIcon size={22} className={styles.brandIcon} />
          <span className={styles.brandName}>ROCKET</span>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          <button
            className={`${styles.navTab} ${activeView === "home" ? styles.navTabActive : ""}`}
            onClick={() => onViewChange("home")}
            aria-current={activeView === "home" ? "page" : undefined}
            type="button"
          >
            <HomeIcon size={14} />
            Home
          </button>
          <button
            className={`${styles.navTab} ${activeView === "library" ? styles.navTabActive : ""}`}
            onClick={() => onViewChange("library")}
            aria-current={activeView === "library" ? "page" : undefined}
            type="button"
          >
            <LibraryIcon size={14} />
            Library
          </button>
        </nav>
      </div>

      {/* ── NowPlaying (center) ── */}
      <div className={styles.center}>
        {activeSession && (
          <NowPlaying
            session={activeSession}
            elapsedSecs={elapsedSecs}
            onStop={onStopSession}
          />
        )}
      </div>

      {/* ── Actions ── */}
      <div className={styles.actions}>
        <button
          className={`${styles.iconBtn} ${isRefreshing ? styles.iconBtnSpinning : ""}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label={isRefreshing ? "Refreshing library…" : "Refresh library (Ctrl+R)"}
          title="Refresh library"
        >
          <RefreshIcon size={16} className={isRefreshing ? styles.spinIcon : undefined} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={onShowShortcuts}
          aria-label="Keyboard shortcuts (?)"
          title="Keyboard shortcuts"
        >
          <KeyboardIcon size={16} />
        </button>
        <button
          className={styles.iconBtn}
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
        <button
          className={`${styles.iconBtn} ${styles.settings}`}
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <SettingsIcon size={18} />
        </button>
      </div>
    </header>
  );
}
