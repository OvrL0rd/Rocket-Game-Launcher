import { useEffect, useCallback } from "react";
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";
import styles from "./ScreenshotLightbox.module.css";

interface Props {
  screenshots: string[];
  initialIndex: number;
  gameName: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function ScreenshotLightbox({
  screenshots, initialIndex, gameName, onClose, onNavigate,
}: Props) {
  const total = screenshots.length;
  const index = Math.max(0, Math.min(initialIndex, total - 1));
  const src = screenshots[index];

  const prev = useCallback(() => {
    onNavigate(index > 0 ? index - 1 : total - 1);
  }, [index, total, onNavigate]);

  const next = useCallback(() => {
    onNavigate(index < total - 1 ? index + 1 : 0);
  }, [index, total, onNavigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowLeft") { prev(); return; }
      if (e.key === "ArrowRight") { next(); return; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={`${gameName} screenshot ${index + 1} of ${total}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close */}
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close lightbox" type="button">
        <XIcon size={18} />
      </button>

      {/* Counter */}
      <div className={styles.counter} aria-live="polite" aria-atomic="true">
        {index + 1} / {total}
      </div>

      {/* Prev */}
      {total > 1 && (
        <button
          className={`${styles.navBtn} ${styles.navBtnPrev}`}
          onClick={prev}
          aria-label="Previous screenshot"
          type="button"
        >
          <ChevronLeftIcon size={24} />
        </button>
      )}

      {/* Image */}
      <div className={styles.imageWrap}>
        <img
          key={src}
          className={styles.image}
          src={src}
          alt={`${gameName} screenshot ${index + 1}`}
          draggable={false}
        />
      </div>

      {/* Next */}
      {total > 1 && (
        <button
          className={`${styles.navBtn} ${styles.navBtnNext}`}
          onClick={next}
          aria-label="Next screenshot"
          type="button"
        >
          <ChevronRightIcon size={24} />
        </button>
      )}
    </div>
  );
}
