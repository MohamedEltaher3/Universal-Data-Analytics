const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const SESSION_KEY = "datasetter_session_id";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function sessionHeaders(extra) {
  return { "X-Session-Id": getSessionId(), ...(extra || {}) };
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "Request failed");
  }
  return data;
}

export function apiGet(path) {
  return fetch(`${API_BASE}${path}`, { headers: sessionHeaders() }).then(handle);
}

export function apiPost(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: sessionHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  }).then(handle);
}

export function apiPut(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: sessionHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body || {}),
  }).then(handle);
}

export function apiDelete(path) {
  return fetch(`${API_BASE}${path}`, { method: "DELETE", headers: sessionHeaders() }).then(handle);
}

export function apiUpload(path, file, clearExisting) {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(`${API_BASE}${path}?clearExisting=${clearExisting}`, {
    method: "POST",
    headers: sessionHeaders(),
    body: fd,
  }).then(handle);
}

export function exportUrl(includeDeleted) {
  return `${API_BASE}/dataset/export?includeDeleted=${includeDeleted}&sessionId=${encodeURIComponent(
    getSessionId()
  )}`;
}

export { API_BASE };
