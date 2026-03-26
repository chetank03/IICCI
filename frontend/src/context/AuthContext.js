import { createContext, useContext, useState, useEffect } from "react";
import { fetchCurrentUser, login as apiLogin, logout as apiLogout } from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then((data) => {
        if (data.authenticated) {
          setUser(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const data = await apiLogin(username, password);
    setUser({ authenticated: true, ...data });
    return data;
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
