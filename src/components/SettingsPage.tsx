import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { put } from "../api/client";
import { type LauncherConfig } from "../api/games";
import {
  ACCENT_PRESETS, type ThemeSetting, type UiDensity,
} from "../hooks/useAppearance";
import {
  ArrowLeftIcon, PaletteIcon, LibraryIcon, InfoIcon, RocketIcon,
  SunIcon, MoonIcon, MonitorIcon, CheckIcon, FolderIcon, TrashIcon, PlusIcon,
} from "./Icons";
import styles from "./SettingsPage.module.css";

type Section = "appearance" | "library" | "about";

interface Props {
  config: LauncherConfig;
  themeSetting: ThemeSetting;
  accentId: string;
  uiDensity: UiDensity;
  onThemeChange: (t: ThemeSetting) => void;
  onAccentChange: (id: string) => void;
  onUiDensityChange: (d: UiDensity) => void;
  onSave: (updated: LauncherConfig) => void;
  onClose: () => void;
}

export default function SettingsPage({
  config, themeSetting, accentId, uiDensity,
  onThemeChange, onAccentChange, onUiDensityChange,
  onSave, onClose,
}: Props) {
  const [section, setSection] = useState<Section>("appearance");

  return (
    <div className={styles.page} role="main" aria-label="Settings">
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <button className={styles.backBtn} onClick={onClose} aria-label="Back to library">
          <ArrowLeftIcon size={15} />
          BACK
        </button>

        <nav className={styles.navGroup} aria-label="Settings sections">
          <span className={styles.navLabel}>Settings</span>
          <NavItem
            icon={<PaletteIcon size={16} />}
            label="Appearance"
            active={section === "appearance"}
            onClick={() => setSection("appearance")}
          />
          <NavItem
            icon={<LibraryIcon size={16} />}
            label="Library"
            active={section === "library"}
            onClick={() => setSection("library")}
          />
          <NavItem
            icon={<InfoIcon size={16} />}
            label="About"
            active={section === "about"}
            onClick={() => setSection("about")}
          />
        </nav>

        <div className={styles.sidebarSpacer} />
        <p className={styles.versionBadge}>v2.0.0</p>
      </aside>

      {/* Content */}
      <div className={styles.content}>
        {section === "appearance" && (
          <AppearanceSection
            themeSetting={themeSetting}
            accentId={accentId}
            uiDensity={uiDensity}
            onThemeChange={onThemeChange}
            onAccentChange={onAccentChange}
            onUiDensityChange={onUiDensityChange}
          />
        )}
        {section === "library" && (
          <LibrarySection config={config} onSave={onSave} />
        )}
        {section === "about" && (
          <AboutSection />
        )}
      </div>
    </div>
  );
}

/* ── Nav item ──────────────────────────────────────────────────────────────── */
function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      className={`${styles.navItem} ${active ? styles.active : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </button>
  );
}

/* ── Appearance section ────────────────────────────────────────────────────── */
function AppearanceSection({ themeSetting, accentId, uiDensity, onThemeChange, onAccentChange, onUiDensityChange }: {
  themeSetting: ThemeSetting;
  accentId: string;
  uiDensity: UiDensity;
  onThemeChange: (t: ThemeSetting) => void;
  onAccentChange: (id: string) => void;
  onUiDensityChange: (d: UiDensity) => void;
}) {
  return (
    <>
      <div className={styles.contentHeader}>
        <PaletteIcon size={22} className={styles.contentIcon} />
        <h1 className={styles.contentTitle}>Appearance</h1>
      </div>

      {/* Theme */}
      <div className={styles.group}>
        <span className={styles.groupTitle}>Theme</span>
        <div className={styles.themeCards} role="radiogroup" aria-label="Theme selection">
          <ThemeCard
            label="Dark"
            icon={<MoonIcon size={13} />}
            selected={themeSetting === "dark"}
            onClick={() => onThemeChange("dark")}
          >
            <div className={styles.previewDark}>
              <div className={styles.bar} />
              <div className={styles.card} />
              <div className={styles.dot} />
            </div>
          </ThemeCard>

          <ThemeCard
            label="Light"
            icon={<SunIcon size={13} />}
            selected={themeSetting === "light"}
            onClick={() => onThemeChange("light")}
          >
            <div className={styles.previewLight}>
              <div className={styles.bar} />
              <div className={styles.card} />
              <div className={styles.dot} />
            </div>
          </ThemeCard>

          <ThemeCard
            label="System"
            icon={<MonitorIcon size={13} />}
            selected={themeSetting === "system"}
            onClick={() => onThemeChange("system")}
          >
            <div className={styles.previewSystem}>
              <div className={`${styles.half} ${styles.halfDark}`}>
                <div className={styles.bar} />
                <div className={styles.card} />
              </div>
              <div className={`${styles.half} ${styles.halfLight}`}>
                <div className={styles.bar} />
                <div className={styles.card} />
              </div>
            </div>
          </ThemeCard>
        </div>
      </div>

      {/* Accent color */}
      <div className={styles.group}>
        <span className={styles.groupTitle}>Accent Color</span>
        <div className={styles.swatches} role="radiogroup" aria-label="Accent color">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              className={`${styles.swatch} ${accentId === preset.id ? styles.selected : ""}`}
              style={{ background: preset.color }}
              onClick={() => onAccentChange(preset.id)}
              aria-label={preset.label}
              aria-pressed={accentId === preset.id}
              title={preset.label}
            >
              {accentId === preset.id && <CheckIcon size={13} />}
            </button>
          ))}
        </div>
      </div>

      {/* UI density */}
      <div className={styles.group}>
        <span className={styles.groupTitle}>UI Density</span>
        <div className={styles.densityRow} role="radiogroup" aria-label="UI density">
          <DensityBtn sizeKey="sm" label="Compact" cols={4} rows={2} selected={uiDensity === "compact"} onClick={() => onUiDensityChange("compact")} />
          <DensityBtn sizeKey="md" label="Default" cols={3} rows={2} selected={uiDensity === "default"} onClick={() => onUiDensityChange("default")} />
          <DensityBtn sizeKey="lg" label="Cozy"    cols={2} rows={2} selected={uiDensity === "cozy"}    onClick={() => onUiDensityChange("cozy")} />
        </div>
      </div>
    </>
  );
}

function ThemeCard({ label, icon, selected, onClick, children }: {
  label: string; icon: React.ReactNode;
  selected: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      className={`${styles.themeCard} ${selected ? styles.selected : ""}`}
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      aria-label={`${label} theme`}
    >
      <div className={styles.themePreview}>{children}</div>
      <div className={styles.themeLabel}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {icon} {label}
        </span>
        {selected && <CheckIcon size={13} className={styles.checkMark} />}
      </div>
    </button>
  );
}

function DensityBtn({ label, cols, rows, selected, onClick, sizeKey }: {
  label: string; cols: number; rows: number; sizeKey: "sm" | "md" | "lg";
  selected: boolean; onClick: () => void;
}) {
  const sizeClass = styles[sizeKey];
  return (
    <button
      className={`${styles.densityBtn} ${selected ? styles.selected : ""}`}
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      aria-label={`${label} grid`}
    >
      <div className={`${styles.densityGrid} ${sizeClass}`}>
        {Array.from({ length: cols * rows }).map((_, i) => (
          <div key={i} className={styles.densityCell} />
        ))}
      </div>
      <span className={styles.densityLabel}>{label.toUpperCase()}</span>
    </button>
  );
}

/* ── Library section ───────────────────────────────────────────────────────── */
function LibrarySection({ config, onSave }: { config: LauncherConfig; onSave: (c: LauncherConfig) => void }) {
  const [form, setForm]       = useState<LauncherConfig>({ ...config, steam_paths: [...config.steam_paths], epic_paths: [...config.epic_paths] });
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const browsePath = async (callback: (v: string) => void) => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (typeof selected === "string") callback(selected);
    } catch { /* dialog cancelled or unavailable */ }
  };

  const browseFile = async (callback: (v: string) => void) => {
    try {
      const selected = await open({ directory: false, multiple: false });
      if (typeof selected === "string") callback(selected);
    } catch { /* dialog cancelled or unavailable */ }
  };

  const setSteamPaths = (paths: string[]) => setForm((f) => ({ ...f, steam_paths: paths }));
  const setEpicPaths  = (paths: string[]) => setForm((f) => ({ ...f, epic_paths: paths }));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await put("/config", form);
      onSave(form);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.contentHeader}>
        <LibraryIcon size={22} className={styles.contentIcon} />
        <h1 className={styles.contentTitle}>Library</h1>
      </div>

      <LibSection title="Steam">
        <PathList
          label="Manifests Paths"
          paths={form.steam_paths}
          onChange={setSteamPaths}
          onBrowse={(idx) => browsePath((v) => {
            const next = [...form.steam_paths];
            next[idx] = v;
            setSteamPaths(next);
          })}
        />
        <PathRow
          label="Steam Executable"
          value={form.steam_executable}
          onChange={(v) => setForm((f) => ({ ...f, steam_executable: v }))}
          onBrowse={() => browseFile((v) => setForm((f) => ({ ...f, steam_executable: v })))}
        />
      </LibSection>

      <LibSection title="Epic Games">
        <PathList
          label="Manifests Paths"
          paths={form.epic_paths}
          onChange={setEpicPaths}
          onBrowse={(idx) => browsePath((v) => {
            const next = [...form.epic_paths];
            next[idx] = v;
            setEpicPaths(next);
          })}
        />
        <PathRow
          label="Launcher Executable"
          value={form.epic_executable}
          onChange={(v) => setForm((f) => ({ ...f, epic_executable: v }))}
          onBrowse={() => browseFile((v) => setForm((f) => ({ ...f, epic_executable: v })))}
        />
      </LibSection>

      <div className={styles.librarySaveRow}>
        {saveError && (
          <p className={styles.saveError} role="alert">{saveError}</p>
        )}
        <button className={styles.saveBtn} onClick={save} disabled={saving}>
          {saving ? "SAVING…" : "SAVE CHANGES"}
        </button>
      </div>
    </>
  );
}

function LibSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.librarySection}>
      <div className={styles.librarySectionHeader}>
        <span className={styles.librarySectionTitle}>{title}</span>
      </div>
      <div className={styles.librarySectionBody}>{children}</div>
    </div>
  );
}

function PathList({ label, paths, onChange, onBrowse }: {
  label: string;
  paths: string[];
  onChange: (paths: string[]) => void;
  onBrowse: (idx: number) => void;
}) {
  const add    = () => onChange([...paths, ""]);
  const remove = (idx: number) => onChange(paths.filter((_, i) => i !== idx));
  const update = (idx: number, val: string) => {
    const next = [...paths];
    next[idx] = val;
    onChange(next);
  };

  return (
    <div className={styles.pathListGroup}>
      <div className={styles.pathListHeader}>
        <span className={styles.pathLabel}>{label}</span>
        <button className={styles.addPathBtn} onClick={add} type="button" aria-label={`Add ${label}`}>
          <PlusIcon size={13} /> Add path
        </button>
      </div>
      {paths.length === 0 && (
        <p className={styles.pathListEmpty}>No paths configured. Click "Add path" to add one.</p>
      )}
      {paths.map((p, idx) => (
        <div key={idx} className={styles.pathControls}>
          <input
            className={styles.pathInput}
            value={p}
            onChange={(e) => update(idx, e.target.value)}
            placeholder="Not configured"
            spellCheck={false}
            aria-label={`${label} ${idx + 1}`}
          />
          <button className={styles.browseBtn} onClick={() => onBrowse(idx)} type="button">
            <FolderIcon size={13} /> Browse
          </button>
          <button
            className={styles.clearBtn}
            onClick={() => remove(idx)}
            type="button"
            aria-label={`Remove path ${idx + 1}`}
          >
            <TrashIcon size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

function PathRow({ label, value, onChange, onBrowse }: {
  label: string; value: string; onChange: (v: string) => void; onBrowse: () => void;
}) {
  return (
    <div className={styles.pathRow}>
      <label className={styles.pathLabel}>{label}</label>
      <div className={styles.pathControls}>
        <input
          className={styles.pathInput}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Not configured"
          spellCheck={false}
        />
        <button className={styles.browseBtn} onClick={onBrowse} type="button">
          <FolderIcon size={13} /> Browse
        </button>
        <button
          className={styles.clearBtn}
          onClick={() => onChange("")}
          type="button"
          aria-label={`Clear ${label}`}
        >
          <TrashIcon size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── About section ─────────────────────────────────────────────────────────── */
function AboutSection() {
  return (
    <>
      <div className={styles.contentHeader}>
        <InfoIcon size={22} className={styles.contentIcon} />
        <h1 className={styles.contentTitle}>About</h1>
      </div>

      <div className={styles.aboutCard}>
        <div className={styles.aboutBrand}>
          <RocketIcon size={36} className={styles.aboutLogo} />
          <div>
            <div className={styles.aboutName}>ROCKET</div>
            <div className={styles.aboutVersion}>Game Launcher — Version 2.0.0</div>
          </div>
        </div>

        <div className={styles.aboutDivider} />

        <div className={styles.aboutStack}>
          <div className={styles.aboutStackTitle}>Built with</div>
          {[
            ["Shell",    "Tauri 2"],
            ["Frontend", "React 18 + TypeScript"],
            ["Backend",  "FastAPI (Python)"],
            ["Styling",  "CSS Modules"],
          ].map(([k, v]) => (
            <div key={k} className={styles.stackRow}>
              <span className={styles.stackKey}>{k}</span>
              <span className={styles.stackValue}>{v}</span>
            </div>
          ))}
        </div>

        <div className={styles.aboutDivider} />

        <p className={styles.aboutCredits}>
          Icons by Lucide. Fonts by Google Fonts (Russo One, Chakra Petch).
          Game artwork and metadata courtesy of the Steam Store API.
        </p>
      </div>
    </>
  );
}
