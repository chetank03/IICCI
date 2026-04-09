import { useState } from "react";

export default function ImportSection({ totalRecords, onImport, importResult }) {
  const [importFile,    setImportFile]    = useState(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [localResult,   setLocalResult]   = useState(null);

  const result = localResult || importResult;

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setLocalResult(null);
    if (f && f.size > 50 * 1024 * 1024) {
      setLocalResult({ success: false, message: "File too large. Maximum allowed size is 50MB." });
      e.target.value = "";
      return;
    }
    setImportFile(f || null);
  };

  const handleConfirm = async () => {
    setImportConfirm(false);
    setImporting(true);
    setLocalResult(null);
    try {
      await onImport(importFile);
      setImportFile(null);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="admin-section admin-section--settings">
        <div className="section-header section-header--stacked">
          <div>
            <h2>Settings & Data Import</h2>
            <p className="section-subtitle">
              Replace the full trade dataset from a verified Excel export. Use this panel whenever the source workbook is refreshed.
            </p>
          </div>
          <div className="settings-summary">
            <span className="settings-summary__label">Current records</span>
            <span className="settings-summary__value">{totalRecords?.toLocaleString() || 0}</span>
          </div>
        </div>
        <div className="import-layout">
          <div className="import-box">
            <p className="import-kicker">Dataset refresh</p>
            <p className="import-desc">
              Upload an Excel file (`.xlsx` or `.xls`) containing the complete trade dataset, including historical and new records.
              The import replaces the existing dataset in one controlled action.
            </p>
            <div className="import-notes">
              <div className="import-note">
                <strong>Scope</strong>
                <span>Existing trade records are fully replaced by the uploaded workbook.</span>
              </div>
              <div className="import-note">
                <strong>Limit</strong>
                <span>Maximum allowed file size is 50MB.</span>
              </div>
              <div className="import-note">
                <strong>Recommendation</strong>
                <span>Use a validated full export instead of a partial or manually edited subset.</span>
              </div>
            </div>
          </div>

          <div className="import-box import-box--action">
            <p className="import-kicker">Upload file</p>
            <div className="import-file-card">
              <span className="import-file-card__label">Selected file</span>
              <span className={`import-file-card__value${importFile ? "" : " is-empty"}`}>
                {importFile ? importFile.name : "No file selected yet"}
              </span>
            </div>
            <div className="import-row">
              <label className="file-label">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="file-input"
                  onChange={handleFileChange}
                />
                <span className="file-btn">Choose File</span>
              </label>
              <button
                className="btn-primary"
                onClick={() => setImportConfirm(true)}
                disabled={!importFile || importing}
              >
                {importing ? "Importing..." : "Replace Dataset"}
              </button>
            </div>
            {result && (
              <div className={`import-result ${result.success ? "import-result--ok" : "import-result--err"}`}>
                {result.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {importConfirm && (
        <div className="modal-backdrop" onClick={() => setImportConfirm(false)}>
          <div className="modal confirm" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Import</h2>
            <p>
              This will <strong>replace all {totalRecords?.toLocaleString()} existing trade records</strong> with
              the data from <strong>{importFile?.name}</strong>. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setImportConfirm(false)}>Cancel</button>
              <button className="btn-danger-fill" onClick={handleConfirm}>Yes, Import</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
