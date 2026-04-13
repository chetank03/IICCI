import { useState } from "react";

export default function ImportSection({ totalRecords, onImport, importResult }) {
  const [importFile,    setImportFile]    = useState(null);
  const [importConfirm, setImportConfirm] = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [localResult,   setLocalResult]   = useState(null);
  const [importMode,    setImportMode]    = useState("append");

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
      await onImport(importFile, importMode);
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
              Upload an Excel file (`.xlsx` or `.xls`) containing trade records.
              Choose whether to replace the full dataset or append new rows to the existing records.
            </p>
            <div className="import-mode-switch">
              <button
                type="button"
                className={`import-mode-btn import-mode-btn--replace${importMode === "replace" ? " active" : ""}`}
                onClick={() => setImportMode("replace")}
              >
                Replace Dataset
              </button>
              <button
                type="button"
                className={`import-mode-btn${importMode === "append" ? " active" : ""}`}
                onClick={() => setImportMode("append")}
              >
                Add Data
              </button>
            </div>
            <div className="import-notes">
              <div className="import-note">
                <strong>Scope</strong>
                <span>
                  {importMode === "replace"
                    ? "Existing trade records are fully replaced by the uploaded workbook."
                    : "Uploaded rows are appended to the existing trade records."}
                </span>
              </div>
              <div className="import-note">
                <strong>Limit</strong>
                <span>Maximum allowed file size is 50MB.</span>
              </div>
              <div className="import-note">
                <strong>{importMode === "replace" ? "Recommendation" : "Warning"}</strong>
                <span>
                  {importMode === "replace"
                    ? "Replace Dataset deletes the current database before importing the new file. Use it only for a validated full backup export."
                    : "Add Data does not de-duplicate rows. Use it only when the uploaded sheet contains genuinely new records."}
                </span>
              </div>
              {importMode === "replace" && (
                <div className="import-warning-banner">
                  Warning: Replace Dataset removes all existing records first. Keep a verified backup file before continuing.
                </div>
              )}
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
                {importing ? "Importing..." : importMode === "replace" ? "Replace Dataset" : "Add Data"}
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
              {importMode === "replace" ? (
                <>
                  This will <strong>replace all {totalRecords?.toLocaleString()} existing trade records</strong> with
                  the data from <strong>{importFile?.name}</strong>. This cannot be undone. Make sure the uploaded file is your
                  verified backup or full master export.
                </>
              ) : (
                <>
                  This will <strong>add the rows from {importFile?.name}</strong> to the current
                  dataset of <strong>{totalRecords?.toLocaleString()} records</strong>. Existing rows are not removed.
                </>
              )}
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setImportConfirm(false)}>Cancel</button>
              <button className={importMode === "replace" ? "btn-danger-fill" : "btn-primary"} onClick={handleConfirm}>
                {importMode === "replace" ? "Yes, Replace" : "Yes, Add Data"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
