export default function UsersTable({ users, currentUserId, loading, onEdit, onDelete }) {
  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Users</h2>
        <button className="btn-primary" onClick={() => onEdit("create")}>+ Add User</button>
      </div>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : users.length === 0 ? (
        <div className="table-empty-state">
          <h3>No users to show</h3>
          <p>Approved and manually created users will appear here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="td-username">{u.username}</td>
                  <td>{u.email || "—"}</td>
                  <td>
                    {u.is_superuser ? (
                      <span className="badge red">Superuser</span>
                    ) : u.is_staff ? (
                      <span className="badge blue">Admin</span>
                    ) : (
                      <span className="badge gray">User</span>
                    )}
                  </td>
                  <td>
                    {u.is_active
                      ? <span className="badge green">Active</span>
                      : <span className="badge gray">Inactive</span>}
                  </td>
                  <td>{new Date(u.date_joined).toLocaleDateString()}</td>
                  <td className="td-actions">
                    <button className="btn-sm" onClick={() => onEdit(u)}>Edit</button>
                    {u.id !== currentUserId && (
                      <button className="btn-sm btn-danger" onClick={() => onDelete(u)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
