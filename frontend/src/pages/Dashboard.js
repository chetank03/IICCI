import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchFilterOptions, fetchSummary } from "../api/stats";

import { useFilters } from "../hooks/useFilters";
import { useTradeData } from "../hooks/useTradeData";
import { useTableData } from "../hooks/useTableData";

import FilterPanel from "../components/dashboard/FilterPanel";
import KPICards from "../components/dashboard/KPICards";
import ChartsSection from "../components/dashboard/ChartsSection";
import TradeDataTable, { DataTabLocked } from "../components/dashboard/TradeDataTable";
import TradeRecordModal from "../components/dashboard/TradeRecordModal";

import { Icons } from "../constants/dashboardIcons";

import "./Dashboard.css";

const EMPTY_OPTIONS = {
  years: [], sectors: [], hs2_options: [], hs4_options: [],
  brochure2_options: [], hs2_desc_options: [], macrosector_options: [], keyword_options: [],
};

export default function Dashboard() {
  const { user } = useAuth();

  const [options,         setOptions]         = useState(EMPTY_OPTIONS);
  const [activeTab,       setActiveTab]        = useState("analytics");
  const [selectedRecord,  setSelectedRecord]   = useState(null);
  const [modalHs2Summary, setModalHs2Summary]  = useState(null);

  const {
    summary, prevSummary, yearwise, sectorWise, topProducts,
    loading, chartError, loadData,
  } = useTradeData();

  const { tableRows, tablePage, tableTotal, tableLoading, loadTable, PAGE_SIZE } = useTableData();

  const { filters, filtersOpen, setFiltersOpen, handleFilter, clearFilters, hasActiveFilters } =
    useFilters({
      onChange: (f) => {
        loadData(f);
        if (activeTab === "data") loadTable(f, 1);
      },
    });

  useEffect(() => {
    fetchFilterOptions().then(setOptions);
    loadData(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedRecord) { setModalHs2Summary(null); return; }
    fetchSummary({ hs2: selectedRecord.hs2, year: selectedRecord.year })
      .then(setModalHs2Summary)
      .catch(() => setModalHs2Summary(null));
  }, [selectedRecord]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dashboard">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-content">
          <div className="hero-icon">{Icons.doc}</div>
          <div className="hero-text">
            <h2>
              <span className="flag-in">IN</span>{" "}
              <span className="flag-it">IT</span>{" "}
              India &ndash; Italy Bilateral Trade Analytics
            </h2>
            <p>Explore import-export dynamics, sector performance, and emerging trends between India and Italy.</p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="search-bar-wrap">
        <span className="search-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          className="search-bar"
          type="text"
          placeholder="Search by HS Code, sector, or description..."
          value={filters.search}
          onChange={(e) => handleFilter("search", e.target.value)}
        />
        {filters.search && (
          <button className="search-clear" onClick={() => handleFilter("search", "")}>✕</button>
        )}
      </div>

      <FilterPanel
        filters={filters}
        options={options}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
        hasActiveFilters={hasActiveFilters}
        onFilterChange={handleFilter}
        onClearFilters={clearFilters}
      />

      {/* Sign In prompt (guests) */}
      {!user && (
        <div className="signin-prompt">
          <div className="signin-blur-bg">
            <div className="signin-overlay">
              <div className="signin-lock">{Icons.lock}</div>
              <h3>Sign In Required</h3>
              <p>Sign in to use advanced search and filtering across all trade data fields.</p>
              <Link to="/login" className="signin-btn">&#x2192; Sign In</Link>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="loading-bar" />}

      {/* Error banner */}
      {chartError && (
        <div className="chart-error-banner">
          <span>{chartError}</span>
          <button className="chart-error-retry" onClick={() => loadData(filters)}>Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      {!chartError && (
        <KPICards
          summary={summary}
          prevSummary={prevSummary}
          productCount={topProducts.length}
          activeYear={filters.year}
        />
      )}

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </button>
        <button
          className={`tab ${activeTab === "data" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("data");
            if (user) loadTable(filters, 1);
          }}
        >
          Data Table
        </button>
      </div>

      {activeTab === "analytics" && (
        <ChartsSection
          yearwise={yearwise}
          sectorWise={sectorWise}
          topProducts={topProducts}
          loading={loading}
        />
      )}

      {activeTab === "data" && (
        user ? (
          <TradeDataTable
            rows={tableRows}
            total={tableTotal}
            page={tablePage}
            pageSize={PAGE_SIZE}
            loading={tableLoading}
            filters={filters}
            onPageChange={(p) => loadTable(filters, p)}
            onRowClick={setSelectedRecord}
          />
        ) : (
          <DataTabLocked />
        )
      )}

      <TradeRecordModal
        record={selectedRecord}
        hs2Summary={modalHs2Summary}
        onClose={() => setSelectedRecord(null)}
      />
    </div>
  );
}
