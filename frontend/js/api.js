// api.js — thin fetch wrapper shared by every page.
const API_BASE = window.__API_BASE__ || "http://localhost:4100/api";

const TOKEN_KEY = "hms_token";
const USER_KEY = "hms_user";

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
function getUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
}
function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
function isLoggedIn() { return Boolean(getToken()); }

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function apiRequest(path, { method = "GET", body, params } = {}) {
  let url = `${API_BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection or that the API is running.", 0);
  }

  if (response.status === 204) return null;

  let payload = null;
  try { payload = await response.json(); } catch { /* no JSON body */ }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth/")) {
      clearSession();
      const depth = location.pathname.includes("/pages/") ? "" : "";
      window.location.href = location.pathname.includes("/pages/") ? "../login.html" : "login.html";
    }
    throw new ApiError(payload?.error || "Something went wrong.", response.status, payload?.details);
  }

  return payload;
}

const api = {
  get: (path, params) => apiRequest(path, { method: "GET", params }),
  post: (path, body) => apiRequest(path, { method: "POST", body }),
  put: (path, body) => apiRequest(path, { method: "PUT", body }),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body }),
  del: (path) => apiRequest(path, { method: "DELETE" }),
};
