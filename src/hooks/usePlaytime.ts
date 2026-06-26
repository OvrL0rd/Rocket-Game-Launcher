import { useCallback, useEffect, useRef, useState } from "react";
import { getPlaytime, recordSession } from "../api/playtime";
import type { LibraryGame } from "../api/games";
import { gameKey } from "../api/games";

export interface ActiveSession {
  game: LibraryGame;
  startedAt: number; // unix ms
}

export function usePlaytime() {
  const [playtimeMap, setPlaytimeMap] = useState<Record<string, number>>({});
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  // Elapsed seconds (ticks every second when a session is active)
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getPlaytime().then(setPlaytimeMap).catch(() => {});
  }, []);

  // Start ticking when session becomes active
  useEffect(() => {
    if (activeSession) {
      setElapsedSecs(0);
      tickRef.current = setInterval(() => {
        setElapsedSecs(Math.floor((Date.now() - activeSession.startedAt) / 1000));
      }, 1000);
    } else {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      setElapsedSecs(0);
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [activeSession]);

  const startSession = useCallback((game: LibraryGame) => {
    // If another session is active, end it first
    setActiveSession(prev => {
      if (prev) {
        const duration = Math.floor((Date.now() - prev.startedAt) / 1000);
        if (duration >= 60) {
          recordSession({
            game_id: prev.game.id,
            platform: prev.game.platform,
            game_name: prev.game.name,
            started_at: Math.floor(prev.startedAt / 1000),
            duration,
          }).catch(() => {});
        }
      }
      return { game, startedAt: Date.now() };
    });
  }, []);

  const endSession = useCallback(() => {
    setActiveSession(prev => {
      if (!prev) return null;
      const duration = Math.floor((Date.now() - prev.startedAt) / 1000);
      if (duration >= 60) {
        const session = {
          game_id: prev.game.id,
          platform: prev.game.platform,
          game_name: prev.game.name,
          started_at: Math.floor(prev.startedAt / 1000),
          duration,
        };
        recordSession(session)
          .then(() => getPlaytime())
          .then(setPlaytimeMap)
          .catch(() => {});
      }
      return null;
    });
  }, []);

  const getSecondsPlayed = useCallback((game: LibraryGame): number => {
    return playtimeMap[gameKey(game)] ?? 0;
  }, [playtimeMap]);

  return { activeSession, elapsedSecs, startSession, endSession, getSecondsPlayed };
}
