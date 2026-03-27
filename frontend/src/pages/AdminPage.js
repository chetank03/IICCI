import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchCsrfToken } from "../api/auth";
import { getCookie } from "../api/csrf";
import { API_BASE } from "../api/config";
import { deleteUser, approveUser, rejectUser } from "../api/admin";

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

  const handleImport = async (file) => {
    setImportResult(null);
    const formData  = new FormData();
    formData.append("file", file);
    const csrfToken = getCookie("csrftoken");

    const res  = await fetch(`${API_BASE}/admin/import-excel/`, {
      method:      "POST",
      credentials: "include",
      headers:     csrfToken ? { "X-CSRFToken": csrfToken } : {},
      body:        formData,
    });
    const data = await res.json();

    if (res.ok) {
      const msg = `Imported ${data.imported} records (${data.deleted} replaced, ${data.skipped} skipped).`;
      setImportResult({ success: true, message: msg });
      loadData();
      showToast(`Successfully imported ${data.imported} trade records.`);
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

      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Manage users and monitor platform data</p>
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
        <div className="pending-table">
          {loading ? (
            <p style={{ padding: "1rem", color: "#64748b" }}>Loading...</p>
          ) : pendingUsers.length === 0 ? (
            <p style={{ padding: "1rem", color: "#64748b" }}>No pending requests.</p>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{new Date(u.date_joined).toLocaleDateString()}</td>
                    <td>
                      <button className="btn-approve" onClick={() => handleApprove(u)}>Approve</button>
                      <button className="btn-danger" onClick={() => handleReject(u)} style={{ marginLeft: "0.5rem" }}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
