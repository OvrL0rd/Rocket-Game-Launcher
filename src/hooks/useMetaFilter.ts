import { useState } from "react";

export interface MetaFilterState {
  genres: string[];
  developers: string[];
  publishers: string[];
  years: number[];
}

const EMPTY: MetaFilterState = { genres: [], developers: [], publishers: [], years: [] };

export function useMetaFilter() {
  const [metaFilterState, setMetaFilterState] = useState<MetaFilterState>(EMPTY);

  const setGenres = (genres: string[]) =>
    setMetaFilterState((prev) => ({ ...prev, genres }));

  const setDevelopers = (developers: string[]) =>
    setMetaFilterState((prev) => ({ ...prev, developers }));

  const setPublishers = (publishers: string[]) =>
    setMetaFilterState((prev) => ({ ...prev, publishers }));

  const setYears = (years: number[]) =>
    setMetaFilterState((prev) => ({ ...prev, years }));

  const clearMetaFilters = () => setMetaFilterState(EMPTY);

  const activeMetaFilterCount =
    metaFilterState.genres.length +
    metaFilterState.developers.length +
    metaFilterState.publishers.length +
    metaFilterState.years.length;

  return {
    metaFilterState,
    setGenres,
    setDevelopers,
    setPublishers,
    setYears,
    clearMetaFilters,
    activeMetaFilterCount,
  };
}
