const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText || "Request failed");
  }
  return data;
}

export function apiGet(path) {
  return fetch(`${API_BASE}${path}`).then(handle);
}

export function apiPost(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  }).then(handle);
}

export function apiPut(path, body) {
  return fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  }).then(handle);
}

export function apiDelete(path) {
  return fetch(`${API_BASE}${path}`, { method: "DELETE" }).then(handle);
}

export function apiUpload(path, file, clearExisting) {
  const fd = new FormData();
  fd.append("file", file);
  return fetch(`${API_BASE}${path}?clearExisting=${clearExisting}`, {
    method: "POST",
    body: fd,
  }).then(handle);
}

export function exportUrl(includeDeleted) {
  return `${API_BASE}/dataset/export?includeDeleted=${includeDeleted}`;
}

export { API_BASE };
