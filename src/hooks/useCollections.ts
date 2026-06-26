import { useCallback, useEffect, useState } from "react";
import {
  createCollection as apiCreate,
  deleteCollection as apiDelete,
  getCollections,
  updateCollection as apiUpdate,
  type Collection,
} from "../api/collections";
import type { LibraryGame } from "../api/games";
import { gameKey } from "../api/games";

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionIds, setActiveCollectionIds] = useState<string[]>([]);

  useEffect(() => {
    getCollections().then(setCollections).catch(() => {});
  }, []);

  const createCollection = useCallback(async (name: string, color: string) => {
    const c = await apiCreate(name, color);
    setCollections(prev => [...prev, c]);
    return c;
  }, []);

  const deleteCollection = useCallback(async (id: string) => {
    await apiDelete(id);
    setCollections(prev => prev.filter(c => c.id !== id));
    setActiveCollectionIds(prev => prev.filter(cid => cid !== id));
  }, []);

  const renameCollection = useCallback(async (id: string, name: string) => {
    setCollections(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, name };
      apiUpdate(id, { name: updated.name, color: updated.color, game_ids: updated.game_ids })
        .catch(() => {});
      return updated;
    }));
  }, []);

  const addGameToCollection = useCallback(async (collectionId: string, game: LibraryGame) => {
    const key = gameKey(game);
    setCollections(prev => prev.map(c => {
      if (c.id !== collectionId) return c;
      if (c.game_ids.includes(key)) return c;
      const updated = { ...c, game_ids: [...c.game_ids, key] };
      apiUpdate(collectionId, { name: updated.name, color: updated.color, game_ids: updated.game_ids })
        .catch(() => {});
      return updated;
    }));
  }, []);

  const removeGameFromCollection = useCallback(async (collectionId: string, game: LibraryGame) => {
    const key = gameKey(game);
    setCollections(prev => prev.map(c => {
      if (c.id !== collectionId) return c;
      const updated = { ...c, game_ids: c.game_ids.filter(gid => gid !== key) };
      apiUpdate(collectionId, { name: updated.name, color: updated.color, game_ids: updated.game_ids })
        .catch(() => {});
      return updated;
    }));
  }, []);

  const toggleCollectionFilter = useCallback((id: string) => {
    setActiveCollectionIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  }, []);

  const clearCollectionFilters = useCallback(() => {
    setActiveCollectionIds([]);
  }, []);

  const getGameCollections = useCallback((game: LibraryGame): Collection[] => {
    const key = gameKey(game);
    return collections.filter(c => c.game_ids.includes(key));
  }, [collections]);

  const isGameInCollection = useCallback((collectionId: string, game: LibraryGame): boolean => {
    const c = collections.find(col => col.id === collectionId);
    return c?.game_ids.includes(gameKey(game)) ?? false;
  }, [collections]);

  return {
    collections,
    activeCollectionIds,
    createCollection,
    deleteCollection,
    renameCollection,
    addGameToCollection,
    removeGameFromCollection,
    toggleCollectionFilter,
    clearCollectionFilters,
    getGameCollections,
    isGameInCollection,
  };
}
