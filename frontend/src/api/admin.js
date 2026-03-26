import { getCookie } from "./csrf";
import { API_BASE } from "./config";

const headers = () => ({
  "Content-Type": "application/json",
  "X-CSRFToken": getCookie("csrftoken"),
});

export async function fetchAdminStats() {
  const res = await fetch(`${API_BASE}/admin/stats/`, { credentials: "include" });
  if (!res.ok) throw new Error("Not authorized");
  return res.json();
}

export async function fetchUsers() {
  const res = await fetch(`${API_BASE}/admin/users/`, { credentials: "include" });
  if (!res.ok) throw new Error("Not authorized");
  const data = await res.json();
  return data.users;
}

export async function createUser(userData) {
  const res = await fetch(`${API_BASE}/admin/users/create/`, {
    method: "POST",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to create user");
  return data;
}

export async function updateUser(userId, userData) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/`, {
    method: "PUT",
    credentials: "include",
    headers: headers(),
    body: JSON.stringify(userData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Failed to update user");
  return data;
}

export async function deleteUser(userId) {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/delete/`, {
    method: "DELETE",
    credentials: "include",
    headers: headers(),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || "Failed to delete user");
  }
}
