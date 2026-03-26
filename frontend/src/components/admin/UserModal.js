import { useState } from "react";
import { createUser, updateUser } from "../../api/admin";

export default function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    username:  user?.username  || "",
    email:     user?.email     || "",
    password:  "",
    is_staff:  user?.is_staff  || false,
    is_active: user?.is_active ?? true,
  });
  const [error,  setError]  = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isEdit && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (isEdit) {
        delete payload.username;
        await updateUser(user.id, payload);
      } else {
        await createUser(payload);
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h2>{isEdit ? "Edit User" : "Create User"}</h2>
        {error && <div className="admin-error">{error}</div>}

        {!isEdit && (
          <>
            <label>Username</label>
            <input value={form.username} onChange={(e) => set("username", e.target.value)} required />
          </>
        )}

        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />

        <label>{isEdit ? "New Password (leave blank to keep)" : "Password"}</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
          required={!isEdit}
        />

        <div className="checkbox-row">
          <label>
            <input type="checkbox" checked={form.is_staff} onChange={(e) => set("is_staff", e.target.checked)} />
            Staff / Admin
          </label>
          {isEdit && (
            <label>
              <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
              Active
            </label>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
