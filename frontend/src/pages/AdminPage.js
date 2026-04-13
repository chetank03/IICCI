import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchCsrfToken } from "../api/auth";
import { getCookie } from "../api/csrf";
import { API_BASE } from "../api/config";
import { deleteUser, approveUser, rejectUser } from "../api/admin";
import { clearFilterOptionsCache } from "../api/stats";

import { useAdminData } from "../hooks/useAdminData";
import { useToast } from "../hooks/useToast";

import Toast from "../components/Toast";
import UserModal from "../components/admin/UserModal";
import ImportSection from "../components/admin/ImportSection";
import UsersTable from "../components/admin/UsersTable";

import "./AdminPage.css";

export default function AdminPage() {
  const { user } = useAuth();
  const { stats, users, loading, loadData } = useAdminData();
  const { toast, showToast, dismissToast }  = useToast();

  const [modal,         setModal]         = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [importResult,  setImportResult]  = useState(null);
  const [adminTab,      setAdminTab]      = useState("users"); // "users" | "pending"

  const pendingUsers = users.filter(u => u.approval_status === "pending");

  useEffect(() => {
    fetchCsrfToken();
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = async (file, mode) => {
    setImportResult(null);
    const formData  = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);
    const csrfToken = getCookie("csrftoken");

    const res  = await fetch(`${API_BASE}/admin/import-excel/`, {
      method:      "POST",
      credentials: "include",
      headers:     csrfToken ? { "X-CSRFToken": csrfToken } : {},
      body:        formData,
    });
    const data = await res.json();

    if (res.ok) {
      const msg = data.mode === "append"
        ? `Added ${data.imported} records (${data.skipped} skipped).`
        : `Imported ${data.imported} records (${data.deleted} replaced, ${data.skipped} skipped).`;
      setImportResult({ success: true, message: msg });
      clearFilterOptionsCache();
      loadData();
      showToast(data.mode === "append"
        ? `Successfully added ${data.imported} trade records.`
        : `Successfully imported ${data.imported} trade records.`);
    } else {
      const msg = data.detail || "Import failed.";
      setImportResult({ success: false, message: msg });
      showToast(msg, "error");
    }
  };

  const handleApprove = async (u) => {
    try {
      await approveUser(u.id);
      loadData();
      showToast(`User "${u.username}" approved.`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleReject = async (u) => {
    try {
      await rejectUser(u.id);
      loadData();
      showToast(`User "${u.username}" rejected.`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDelete = async (u) => {
    try {
      await deleteUser(u.id);
      setDeleteConfirm(null);
      loadData();
      showToast(`User "${u.username}" deleted.`);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  if (!user?.is_staff) {
    return (
      <div className="admin-page">
        <div className="admin-denied">
          <h2>Access Denied</h2>
          <p>You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <Toast toast={toast} onDismiss={dismissToast} />

      <div className="admin-hero">
        <div className="admin-header">
          <span className="admin-kicker">Operations Console</span>
          <h1>Admin Panel</h1>
          <p>Review access requests, manage users, and control the trade dataset from one place.</p>
        </div>
        <div className="admin-hero-card">
          <span className="admin-hero-card__label">Pending requests</span>
          <span className="admin-hero-card__value">{pendingUsers.length}</span>
          <span className="admin-hero-card__meta">
            {pendingUsers.length === 0 ? "No approvals waiting" : "Needs review from admin"}
          </span>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="admin-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.total_users}</span>
            <span className="stat-label">Total Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.active_users}</span>
            <span className="stat-label">Active Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.staff_users}</span>
            <span className="stat-label">Staff / Admins</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.total_records}</span>
            <span className="stat-label">Trade Records</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.pending_users ?? 0}</span>
            <span className="stat-label">Pending Approvals</span>
          </div>
        </div>
      )}

      <ImportSection
        totalRecords={stats?.total_records}
        onImport={handleImport}
        importResult={importResult}
      />

      {/* Tab switcher */}
      <div className="admin-tabs">
        <button className={`admin-tab${adminTab === "users" ? " active" : ""}`} onClick={() => setAdminTab("users")}>
          Users
        </button>
        <button className={`admin-tab${adminTab === "pending" ? " active" : ""}`} onClick={() => setAdminTab("pending")}>
          Pending Approvals {pendingUsers.length > 0 && <span className="pending-badge">{pendingUsers.length}</span>}
        </button>
      </div>

      {adminTab === "users" && (
        <UsersTable
          users={users.filter(u => u.approval_status !== "pending")}
          currentUserId={user.id}
          loading={loading}
          onEdit={setModal}
          onDelete={setDeleteConfirm}
        />
      )}

      {adminTab === "pending" && (
        <div className="admin-section">
          <div className="section-header section-header--stacked">
            <div>
              <h2>Pending Access Requests</h2>
              <p className="section-subtitle">
                Approve trusted Google signups to grant dashboard access, or reject requests that should remain blocked.
              </p>
            </div>
          </div>
          {loading ? (
            <p className="loading-text">Loading pending requests...</p>
          ) : pendingUsers.length === 0 ? (
            <div className="pending-empty">
              <span className="pending-empty__icon">✓</span>
              <h3>No pending requests</h3>
              <p>New Google signup requests will appear here for review.</p>
            </div>
          ) : (
            <div className="pending-grid">
              {pendingUsers.map((u) => (
                <div key={u.id} className="pending-card">
                  <div className="pending-card__header">
                    <div>
                      <h3>{u.username}</h3>
                      <p>{u.email || "No email provided"}</p>
                    </div>
                    <span className="badge amber">Pending</span>
                  </div>
                  <div className="pending-card__meta">
                    <div>
                      <span className="pending-card__meta-label">Requested</span>
                      <span>{new Date(u.date_joined).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="pending-card__meta-label">Account type</span>
                      <span>Google signup</span>
                    </div>
                  </div>
                  <div className="pending-card__actions">
                    <button className="btn-approve" onClick={() => handleApprove(u)}>Approve Access</button>
                    <button className="btn-sm btn-danger" onClick={() => handleReject(u)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create / Edit user modal */}
      {modal && (
        <UserModal
          user={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => {
            const isEdit = modal !== "create";
            setModal(null);
            loadData();
            showToast(isEdit ? `User "${modal.username}" updated.` : "New user created successfully.");
          }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal confirm" onClick={(e) => e.stopPropagation()}>
            <h2>Delete User</h2>
            <p>Are you sure you want to delete <strong>{deleteConfirm.username}</strong>?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger-fill" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
