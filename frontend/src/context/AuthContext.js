import { createContext, useContext, useState, useEffect } from "react";
import {
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  firebaseAuth as apiFirebaseAuth,
} from "../api/auth";
import { signOutFromFirebase } from "../lib/firebaseAuth";

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

  const loginWithFirebase = async (idToken) => {
    const data = await apiFirebaseAuth(idToken);
    if (data.authenticated) {
      setUser({ authenticated: true, ...data });
    }
    return data;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      await signOutFromFirebase();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithFirebase, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
