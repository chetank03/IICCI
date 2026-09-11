import { useState } from "react";
import { downloadExport } from "../../api/stats";
import { fmtTableValue } from "../../constants/chartColors";
import { ITALY_TO_INDIA_LABEL, INDIA_TO_ITALY_LABEL } from "../../constants/tradeFlows";

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function TradeDataTable({
  rows, total, page, pageSize, loading,
  filters, onPageChange, onRowClick, onExportError,
}) {
  const totalPages = Math.ceil(total / pageSize);

  const [exporting, setExporting] = useState("");

  const runExport = async (format) => {
    setExporting(format);
    try {
      await downloadExport(filters, format);
    } catch (err) {
      onExportError?.(err.message || "Export failed.");
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="data-table-section">
      <div className="data-table-toolbar">
        <span className="data-table-count">{total.toLocaleString()} records</span>
        <div className="export-btn-group">
          <button
            className="csv-export-btn"
            onClick={() => runExport("xlsx")}
            disabled={!!exporting}
            title="Download in the same column layout used for uploads"
          >
            <DownloadIcon />
            {exporting === "xlsx" ? "Preparing..." : "Export Excel"}
          </button>
          <button
            className="csv-export-btn"
            onClick={() => runExport("csv")}
            disabled={!!exporting}
            title="Download in the same column layout used for uploads"
          >
            <DownloadIcon />
            {exporting === "csv" ? "Preparing..." : "Export CSV"}
          </button>
        </div>
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
              <th>Product Category</th>
              <th>Sector</th>
              <th>Specific Products</th>
              <th>{ITALY_TO_INDIA_LABEL} (M EUR)</th>
              <th>{INDIA_TO_ITALY_LABEL} (M EUR)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading ? (
              <tr>
                <td colSpan={10} className="td-empty">No records found for the selected filters.</td>
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
                  <td>{r.keyword || <span className="td-dash">—</span>}</td>
                  <td className="td-value">{fmtTableValue(r.italy_to_india_value)}</td>
                  <td className="td-value">{fmtTableValue(r.india_to_italy_value)}</td>
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
