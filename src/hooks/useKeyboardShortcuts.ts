import { useEffect, useRef } from "react";

export interface ShortcutHandlers {
  onFocusSearch: () => void;
  onRefresh: () => void;
  onViewGrid: () => void;
  onViewList: () => void;
  onGoHome: () => void;
  onGoLibrary: () => void;
  onShowShortcuts: () => void;
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement;
  return (
    t.tagName === "INPUT" ||
    t.tagName === "TEXTAREA" ||
    t.isContentEditable
  );
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  // Stable ref so the effect never needs to re-run when handlers change
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Ctrl/Cmd shortcuts — always active
      if (meta && e.key === "f") {
        e.preventDefault();
        ref.current.onFocusSearch();
        return;
      }
      if (meta && e.key === "r") {
        e.preventDefault();
        ref.current.onRefresh();
        return;
      }

      // Single-key shortcuts — skip when user is typing in an input
      if (isTypingTarget(e) || e.altKey || e.metaKey || e.ctrlKey) return;

      switch (e.key) {
        case "g":
        case "G":
          ref.current.onViewGrid();
          break;
        case "l":
        case "L":
          ref.current.onViewList();
          break;
        case "h":
        case "H":
          ref.current.onGoHome();
          break;
        case "b":
        case "B":
          ref.current.onGoLibrary();
          break;
        case "?":
          ref.current.onShowShortcuts();
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
