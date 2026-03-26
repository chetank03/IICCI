import { useState, useCallback } from "react";
import { fetchAdminStats, fetchUsers } from "../api/admin";

export function useAdminData() {
  const [stats,   setStats]   = useState(null);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([fetchAdminStats(), fetchUsers()]);
      setStats(s);
      setUsers(u);
    } catch (_) {
      /* errors thrown by api/admin.js are passed to callers */
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, users, loading, loadData };
}
