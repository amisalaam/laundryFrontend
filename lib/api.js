const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(message, status, fields = {}, code = "error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
    this.code = code;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload || {};
    const fields = Object.fromEntries(
      Object.entries(error)
        .filter(([field]) => field !== "detail")
        .map(([field, detail]) => [field, Array.isArray(detail) ? detail.join(" ") : detail]),
    );
    throw new ApiError(error.detail || "Please correct the highlighted fields.", response.status, fields);
  }
  return payload || {};
}

export function get(path) {
  return request(path);
}

export function post(path, body = {}) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

export function patch(path, body = {}) {
  return request(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function del(path) {
  return request(path, { method: "DELETE" });
}

export const api = { get, post, patch, del };
