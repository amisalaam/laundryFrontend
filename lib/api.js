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
  if (!response.ok || payload?.ok === false) {
    const error = payload?.error || {};
    throw new ApiError(error.message || "Request failed.", response.status, error.fields || {}, error.code || "error");
  }
  return payload?.data || {};
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
