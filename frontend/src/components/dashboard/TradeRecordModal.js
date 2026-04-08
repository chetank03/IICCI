import { fmtValue } from "../../constants/chartColors";
import { ITALY_TO_INDIA_LABEL, INDIA_TO_ITALY_LABEL } from "../../constants/tradeFlows";

export default function TradeRecordModal({ record, hs2Summary, onClose }) {
  if (!record) return null;

  const italy = parseFloat(record.italy_to_india_value) || 0;
  const india = parseFloat(record.india_to_italy_value) || 0;
  const total = italy + india;
  const italyPct = total > 0 ? (italy / total) * 100 : 0;
  const indiaPct = total > 0 ? (india / total) * 100 : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            Trade Record Details
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-summary-row">
            <div className="modal-summary-item modal-summary-item--blue">
              <span className="modal-summary-label">Period</span>
              <span className="modal-summary-value">{record.year}</span>
            </div>
            <div className="modal-summary-item modal-summary-item--purple">
              <span className="modal-summary-label">HS Code</span>
              <span className="modal-summary-value">{record.hs4 || record.hs2}</span>
              {record.hs4 && <span className="modal-summary-sub">Chapter: {record.hs2}</span>}
            </div>
            <div className="modal-summary-item modal-summary-item--green">
              <span className="modal-summary-label">Total Trade</span>
              <span className="modal-summary-value">{fmtValue(total)}</span>
            </div>
          </div>

          <div className="modal-section">
            <h4 className="modal-section-title">Product Description</h4>
            {record.hs2_description && (
              <div className="modal-desc-row">
                <span className="modal-desc-key">HS2 Description:</span>
                <span className="modal-desc-val">{record.hs2_description}</span>
              </div>
            )}
            <div className="modal-desc-row">
              <span className="modal-desc-key">{record.hs4 ? "HS4 Description:" : "Description:"}</span>
              <span className="modal-desc-val">{record.description}</span>
            </div>
          </div>

          <div className="modal-grid-2">
            <div className="modal-section">
              <h4 className="modal-section-title">Sector Classification</h4>
              {record.sector || record.macrosector ? (
                <>
                  {record.macrosector && (
                    <div className="modal-pill-row">
                      <span className="modal-pill-label">Product Category</span>
                      <span className="modal-pill modal-pill--blue">{record.macrosector}</span>
                    </div>
                  )}
                  {record.sector && (
                    <div className="modal-pill-row">
                      <span className="modal-pill-label">Sector</span>
                      <span className="modal-pill modal-pill--orange">{record.sector}</span>
                    </div>
                  )}
                  {record.keyword && (
                    <div className="modal-pill-row">
                      <span className="modal-pill-label">Specific Products</span>
                      <span className="modal-pill modal-pill--green">{record.keyword}</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="modal-empty-text">No classification data</span>
              )}
            </div>

            <div className="modal-section">
              <h4 className="modal-section-title">Sector Overview</h4>
              {record.sector ? (
                <>
                  <div className="modal-pill-row">
                    <span className="modal-pill-label">Sector</span>
                    <span className="modal-pill modal-pill--orange">{record.sector}</span>
                  </div>
                </>
              ) : (
                <span className="modal-empty-text">No category data</span>
              )}
            </div>
          </div>

          <div className="modal-section">
            <h4 className="modal-section-title">Trade Flow Analysis</h4>
            <div className="modal-flow-item">
              <div className="modal-flow-label">
                <span className="modal-flow-direction modal-flow-direction--green">{ITALY_TO_INDIA_LABEL}</span>
                <span className="modal-flow-value">{fmtValue(italy)}</span>
              </div>
              <div className="modal-flow-bar-wrap">
                <div className="modal-flow-bar modal-flow-bar--green" style={{ width: `${italyPct}%` }} />
              </div>
              <span className="modal-flow-pct">{italyPct.toFixed(1)}% of total trade</span>
            </div>
            <div className="modal-flow-item">
              <div className="modal-flow-label">
                <span className="modal-flow-direction modal-flow-direction--orange">{INDIA_TO_ITALY_LABEL}</span>
                <span className="modal-flow-value">{fmtValue(india)}</span>
              </div>
              <div className="modal-flow-bar-wrap">
                <div className="modal-flow-bar modal-flow-bar--orange" style={{ width: `${indiaPct}%` }} />
              </div>
              <span className="modal-flow-pct">{indiaPct.toFixed(1)}% of total trade</span>
            </div>
          </div>

          {hs2Summary && (
            <div className="modal-section">
              <h4 className="modal-section-title">HS2 Chapter Level (Aggregated · {record.year})</h4>
              <div className="modal-hs2-row">
                <div className="modal-hs2-item">
                  <span className="modal-hs2-label">{ITALY_TO_INDIA_LABEL} (HS2)</span>
                  <span className="modal-hs2-value modal-hs2-value--green">
                    {fmtValue(hs2Summary.india_imports_from_italy)}
                  </span>
                </div>
                <div className="modal-hs2-item">
                  <span className="modal-hs2-label">{INDIA_TO_ITALY_LABEL} (HS2)</span>
                  <span className="modal-hs2-value modal-hs2-value--orange">
                    {fmtValue(hs2Summary.italy_imports_from_india)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
