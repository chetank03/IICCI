export default function FilterPanel({
  filters, options, filtersOpen, setFiltersOpen,
  hasActiveFilters, onFilterChange, onClearFilters,
}) {
  const filteredHs4 = filters.hs2
    ? options.hs4_options.filter((h) => h.hs4.startsWith(filters.hs2))
    : options.hs4_options;

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <span className="filter-panel-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filters
          {hasActiveFilters && <span className="filter-active-dot" />}
        </span>
        <div className="filter-panel-actions">
          {hasActiveFilters && (
            <button className="filter-clear-btn" onClick={onClearFilters}>Clear all</button>
          )}
          <button className="filter-collapse-btn" onClick={() => setFiltersOpen((o) => !o)}>
            {filtersOpen ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="filter-grid">
          <div className="filter-field">
            <label>Calendar Year</label>
            <select value={filters.year} onChange={(e) => onFilterChange("year", e.target.value)}>
              <option value="">All Years</option>
              {options.years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="filter-field">
            <label>HS Code 2</label>
            <select value={filters.hs2} onChange={(e) => onFilterChange("hs2", e.target.value)}>
              <option value="">All HS2 Codes</option>
              {options.hs2_options.map((h) => (
                <option key={h.hs2} value={h.hs2}>
                  {h.hs2} — {h.description.split(" - ").slice(1).join(" - ") || h.description}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>HS Code 4</label>
            <select value={filters.hs4} onChange={(e) => onFilterChange("hs4", e.target.value)}>
              <option value="">All HS4 Codes</option>
              {filteredHs4.map((h) => (
                <option key={h.hs4} value={h.hs4}>
                  {h.hs4} — {(h.description.split(" - ").slice(1).join(" - ") || h.description).slice(0, 50)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Sector (IICCI Brochure 1)</label>
            <select value={filters.sector} onChange={(e) => onFilterChange("sector", e.target.value)}>
              <option value="">All Sectors</option>
              {options.sectors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="filter-field">
            <label>IICCI Brochure 2</label>
            <select value={filters.brochure2} onChange={(e) => onFilterChange("brochure2", e.target.value)}>
              <option value="">All Brochures</option>
              {options.brochure2_options.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div className="filter-field">
            <label>HS Code 2 Description</label>
            <select value={filters.hs2_description} onChange={(e) => onFilterChange("hs2_description", e.target.value)}>
              <option value="">All Descriptions</option>
              {options.hs2_desc_options.map((h) => (
                <option key={h.hs2} value={h.hs2_description}>
                  {h.hs2_description.length > 60 ? h.hs2_description.slice(0, 57) + "..." : h.hs2_description}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Macrosector</label>
            <select value={filters.macrosector} onChange={(e) => onFilterChange("macrosector", e.target.value)}>
              <option value="">All Macrosectors</option>
              {options.macrosector_options.map((m) => (
                <option key={m} value={m}>{m.length > 60 ? m.slice(0, 57) + "..." : m}</option>
              ))}
            </select>
          </div>

          <div className="filter-field">
            <label>Keyword (IICCI Subsector)</label>
            <select value={filters.keyword} onChange={(e) => onFilterChange("keyword", e.target.value)}>
              <option value="">All Keywords</option>
              {options.keyword_options.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
