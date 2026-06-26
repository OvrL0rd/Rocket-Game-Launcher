import { useEffect, useRef, useState } from "react";
import { XIcon, CheckIcon } from "./Icons";
import styles from "./CreateCollectionModal.module.css";

const COLOR_PRESETS = [
  { id: "purple", color: "#7C3AED", label: "Purple" },
  { id: "blue",   color: "#2563EB", label: "Blue"   },
  { id: "cyan",   color: "#0891B2", label: "Cyan"   },
  { id: "teal",   color: "#0D9488", label: "Teal"   },
  { id: "green",  color: "#16A34A", label: "Green"  },
  { id: "orange", color: "#EA580C", label: "Orange" },
  { id: "red",    color: "#DC2626", label: "Red"    },
  { id: "pink",   color: "#DB2777", label: "Pink"   },
];

interface Props {
  onConfirm: (name: string, color: string) => Promise<void>;
  onClose: () => void;
}

export default function CreateCollectionModal({ onConfirm, onClose }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0].color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input and trap Escape
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Collection name is required.");
      inputRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(trimmed, color);
      onClose();
    } catch {
      setError("Failed to create collection. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title} id="modal-title">New Collection</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="collection-name">Name</label>
            <input
              id="collection-name"
              ref={inputRef}
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(null); }}
              placeholder="e.g. Backlog, Playing, Completed…"
              maxLength={40}
              aria-describedby={error ? "name-error" : undefined}
              aria-invalid={!!error}
            />
            {error && (
              <p id="name-error" className={styles.error} role="alert">{error}</p>
            )}
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Color</span>
            <div className={styles.swatches} role="radiogroup" aria-label="Collection color">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  className={`${styles.swatch} ${color === preset.color ? styles.swatchActive : ""}`}
                  style={{ background: preset.color }}
                  onClick={() => setColor(preset.color)}
                  aria-label={preset.label}
                  aria-pressed={color === preset.color}
                  title={preset.label}
                >
                  {color === preset.color && <CheckIcon size={12} />}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.createBtn}
              style={{ background: color }}
              disabled={saving || !name.trim()}
              aria-busy={saving}
            >
              {saving ? "Creating…" : "Create Collection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
