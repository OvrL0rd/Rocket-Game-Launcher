import { useEffect, useState } from "react";
import { getTheme } from "../api/games";

export interface AccentPreset {
  id: string;
  label: string;
  color: string;
  hover: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: "purple", label: "Purple", color: "#7C3AED", hover: "#8B5CF6" },
  { id: "blue",   label: "Blue",   color: "#2563EB", hover: "#3B82F6" },
  { id: "cyan",   label: "Cyan",   color: "#0891B2", hover: "#06B6D4" },
  { id: "teal",   label: "Teal",   color: "#0D9488", hover: "#14B8A6" },
  { id: "green",  label: "Green",  color: "#16A34A", hover: "#22C55E" },
  { id: "orange", label: "Orange", color: "#EA580C", hover: "#F97316" },
  { id: "red",    label: "Red",    color: "#DC2626", hover: "#EF4444" },
  { id: "pink",   label: "Pink",   color: "#DB2777", hover: "#EC4899" },
];

export type UiDensity = "compact" | "default" | "cozy";
export type ThemeSetting = "dark" | "light" | "system";

// Kept as alias for any remaining consumers
export type GridDensity = UiDensity;

const DENSITY_CARD_WIDTHS: Record<UiDensity, string> = {
  compact: "150px",
  default: "190px",
  cozy:    "240px",
};

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function applyAccent(preset: AccentPreset, isDark: boolean) {
  const [r, g, b] = hexToRgb(preset.color);
  const s = document.documentElement.style;
  s.setProperty("--accent",            preset.color);
  s.setProperty("--accent-hover",      preset.hover);
  s.setProperty("--accent-glow",       `rgba(${r},${g},${b},0.35)`);
  s.setProperty("--border",            `rgba(${r},${g},${b},${isDark ? "0.25" : "0.2"})`);
  s.setProperty("--border-hover",      `rgba(${r},${g},${b},${isDark ? "0.6"  : "0.5"})`);
  s.setProperty("--glass-border",      `rgba(${r},${g},${b},0.2)`);
  s.setProperty("--shadow-card-hover",
    `0 8px 40px rgba(${r},${g},${b},0.25), 0 0 0 1px rgba(${r},${g},${b},0.4)`);
  s.setProperty("--shadow-modal",
    `0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(${r},${g},${b},0.15)`);
}

function applyUiDensity(density: UiDensity) {
  document.documentElement.setAttribute("data-density", density);
  document.documentElement.style.setProperty("--card-min-width", DENSITY_CARD_WIDTHS[density]);
}

function migrateOldDensity(): UiDensity {
  const newKey = localStorage.getItem("rgl-ui-density") as UiDensity | null;
  if (newKey) return newKey;
  const old = localStorage.getItem("rgl-density");
  return old === "small" ? "compact" : old === "large" ? "cozy" : "default";
}

export function useAppearance() {
  const [themeSetting,  setThemeSettingState] = useState<ThemeSetting>(
    () => (localStorage.getItem("rgl-theme") as ThemeSetting) || "system"
  );
  const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark");
  const [accentId,      setAccentIdState] = useState(
    () => localStorage.getItem("rgl-accent") || "purple"
  );
  const [uiDensity,     setUiDensityState] = useState<UiDensity>(migrateOldDensity);

  useEffect(() => {
    const saved = (localStorage.getItem("rgl-theme") as ThemeSetting) || "system";
    const resolveAndApply = async () => {
      let resolved: "dark" | "light";
      if (saved === "system") {
        const t = await getTheme().catch(() => ({ theme: "dark" }));
        resolved = t.theme as "dark" | "light";
      } else {
        resolved = saved;
      }
      setResolvedTheme(resolved);
    };
    resolveAndApply();
    applyUiDensity(migrateOldDensity());
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
    const preset = ACCENT_PRESETS.find(p => p.id === accentId) ?? ACCENT_PRESETS[0];
    applyAccent(preset, resolvedTheme === "dark");
  }, [resolvedTheme, accentId]);

  const setTheme = async (t: ThemeSetting) => {
    setThemeSettingState(t);
    localStorage.setItem("rgl-theme", t);
    let resolved: "dark" | "light";
    if (t === "system") {
      const os = await getTheme().catch(() => ({ theme: "dark" }));
      resolved = os.theme as "dark" | "light";
    } else {
      resolved = t;
    }
    setResolvedTheme(resolved);
  };

  const setAccent = (id: string) => {
    setAccentIdState(id);
    localStorage.setItem("rgl-accent", id);
    const preset = ACCENT_PRESETS.find(p => p.id === id) ?? ACCENT_PRESETS[0];
    applyAccent(preset, resolvedTheme === "dark");
  };

  const setUiDensity = (d: UiDensity) => {
    setUiDensityState(d);
    localStorage.setItem("rgl-ui-density", d);
    applyUiDensity(d);
  };

  // Alias kept for any remaining consumers that reference gridDensity
  const gridDensity = uiDensity;
  const setGridDensity = setUiDensity;

  return {
    themeSetting, resolvedTheme, accentId,
    uiDensity, gridDensity,
    setTheme, setAccent, setUiDensity, setGridDensity,
  };
}
