import { getCookie, setCsrfToken } from "./csrf";
import { API_BASE } from "./config";

export async function fetchCsrfToken() {
  const res = await fetch(`${API_BASE}/auth/csrf/`, { credentials: "include" });
  if (res.ok) {
    const data = await res.json();
    if (data.csrfToken) setCsrfToken(data.csrfToken);
  }
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Login failed");
  return data;
}

export async function logout() {
  const res = await fetch(`${API_BASE}/auth/logout/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-CSRFToken": getCookie("csrftoken"),
    },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Logout failed");
  }
}

export async function fetchCurrentUser() {
  const res = await fetch(`${API_BASE}/auth/me/`, { credentials: "include" });
  return res.json();
}

export async function firebaseAuth(idToken) {
  const res = await fetch(`${API_BASE}/auth/firebase/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
    body: JSON.stringify({ idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Firebase authentication failed");
  return data;
}
