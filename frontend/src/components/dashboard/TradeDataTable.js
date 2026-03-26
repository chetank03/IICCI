import { Link } from "react-router-dom";
import { fetchTradeTable } from "../../api/stats";
import { Icons } from "../../constants/dashboardIcons";

export default function TradeDataTable({
  rows, total, page, pageSize, loading,
  filters, onPageChange, onRowClick,
}) {
  const totalPages = Math.ceil(total / pageSize);

  const exportCsv = async () => {
    const data = await fetchTradeTable(filters, 1, 10000);
    const items = data.items || [];
    const header = ["Year", "HS2", "HS4", "Description", "Sector", "Italy→India (M USD)", "India→Italy (M USD)"];
    const lines  = [header.join(",")];
    for (const r of items) {
      lines.push([
        r.year,
        r.hs2,
        r.hs4 || "",
        `"${(r.description || "").replace(/"/g, '""')}"`,
        `"${(r.sector || "").replace(/"/g, '""')}"`,
        parseFloat(r.italy_to_india_value).toFixed(2),
        parseFloat(r.india_to_italy_value).toFixed(2),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "iicci_trade_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-table-section">
      <div className="data-table-toolbar">
        <span className="data-table-count">{total.toLocaleString()} records</span>
        <button className="csv-export-btn" onClick={exportCsv}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {loading && <div className="loading-bar loading-bar--inline" />}

      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>HS2</th>
              <th>HS4</th>
              <th>Description</th>
              <th>Macrosector</th>
              <th>Sector</th>
              <th>Italy → India (M USD)</th>
              <th>India → Italy (M USD)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={9} className="td-empty">No records found for the selected filters.</td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.year}</td>
                  <td><code>{r.hs2}</code></td>
                  <td>{r.hs4 ? <code>{r.hs4}</code> : <span className="td-dash">—</span>}</td>
                  <td className="td-desc">{r.description}</td>
                  <td className="td-macro">{r.macrosector || <span className="td-dash">—</span>}</td>
                  <td>{r.sector || <span className="td-dash">—</span>}</td>
                  <td className="td-value">{parseFloat(r.italy_to_india_value).toFixed(2)}</td>
                  <td className="td-value">{parseFloat(r.india_to_italy_value).toFixed(2)}</td>
                  <td>
                    <button className="details-btn" onClick={() => onRowClick(r)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8"  x2="12"   y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="table-pagination">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}

export function DataTabLocked() {
  return (
    <div className="data-tab-placeholder">
      <div className="signin-prompt-inline">
        <div className="signin-lock">{Icons.lock}</div>
        <h3>Sign In Required</h3>
        <p>Sign in to access the full trade data table with filtering and CSV export.</p>
        <Link to="/login" className="signin-btn">&#x2192; Sign In</Link>
      </div>
    </div>
  );
}
