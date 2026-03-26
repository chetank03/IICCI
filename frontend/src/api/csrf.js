// In-memory CSRF token store (cross-origin safe)
let _csrfToken = null;

export function setCsrfToken(token) {
  _csrfToken = token;
}

export function getCsrfToken() {
  // Fall back to cookie for same-origin / local dev
  if (_csrfToken) return _csrfToken;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrftoken=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

// Keep getCookie as alias for any existing callers
export function getCookie(name) {
  if (name === "csrftoken") return getCsrfToken();
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}
