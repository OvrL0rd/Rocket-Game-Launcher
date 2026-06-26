import { useEffect } from "react";
import { XIcon } from "./Icons";
import styles from "./KeyboardShortcutsModal.module.css";

interface Props {
  onClose: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? "⌘" : "Ctrl";

const SHORTCUTS = [
  {
    group: "Navigation",
    items: [
      { keys: ["H"], label: "Go to Home" },
      { keys: ["B"], label: "Browse Library" },
      { keys: [mod, "F"], label: "Focus search" },
      { keys: ["Esc"], label: "Go back / close" },
    ],
  },
  {
    group: "View",
    items: [
      { keys: ["G"], label: "Grid view" },
      { keys: ["L"], label: "List view" },
      { keys: [mod, "R"], label: "Refresh library" },
    ],
  },
  {
    group: "Other",
    items: [
      { keys: ["?"], label: "Show keyboard shortcuts" },
    ],
  },
];

export default function KeyboardShortcutsModal({ onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "?") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title} id="shortcuts-title">Keyboard Shortcuts</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close shortcuts"
            type="button"
          >
            <XIcon size={16} />
          </button>
        </div>

        <div className={styles.body}>
          {SHORTCUTS.map(({ group, items }) => (
            <div key={group} className={styles.group}>
              <span className={styles.groupLabel}>{group}</span>
              <div className={styles.itemList}>
                {items.map(({ keys, label }) => (
                  <div key={label} className={styles.item}>
                    <span className={styles.itemLabel}>{label}</span>
                    <div className={styles.keysWrap}>
                      {keys.map((k, i) => (
                        <span key={i} className={styles.key}>{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
