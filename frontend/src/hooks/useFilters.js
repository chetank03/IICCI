import { useState, useRef } from "react";

export const EMPTY_FILTERS = {
  year: "", sector: "", hs2: "", hs4: "", brochure2: "",
  hs2_description: "", macrosector: "", keyword: "", search: "",
};

function filtersFromUrl() {
  const p = new URLSearchParams(window.location.search);
  const f = { ...EMPTY_FILTERS };
  Object.keys(EMPTY_FILTERS).forEach((k) => { if (p.get(k)) f[k] = p.get(k); });
  return f;
}

function syncFiltersToUrl(f) {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => { if (v) p.set(k, v); });
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

/**
 * Manages filter state, URL sync, and search debounce.
 * Calls onChange(filters) whenever filters change (debounced for "search" key).
 */
export function useFilters({ onChange }) {
  const [filters, setFilters]       = useState(filtersFromUrl);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const debounceRef = useRef(null);

  const handleFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    if (key === "hs2") next.hs4 = "";
    setFilters(next);
    syncFiltersToUrl(next);
    if (key === "search") {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(next), 400);
    } else {
      onChange(next);
    }
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    syncFiltersToUrl(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return { filters, filtersOpen, setFiltersOpen, handleFilter, clearFilters, hasActiveFilters };
}
