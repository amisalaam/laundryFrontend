import { api } from "./api";
import { clearStorageCache, getBranches } from "./storage";

let currentSession = null;

export function getCachedSession() {
  return currentSession;
}

export async function getSession() {
  if (currentSession) return currentSession;
  try {
    const data = await api.get("/auth/me/");
    currentSession = data.session;
    return currentSession;
  } catch {
    currentSession = null;
    return null;
  }
}

export function setSession(session) {
  currentSession = session;
  return currentSession;
}

export async function logout() {
  currentSession = null;
  clearStorageCache();
  await api.post("/auth/logout/");
}

export async function authenticate(email, password, loginType) {
  clearStorageCache();
  const data = await api.post("/auth/login/", { email, password, loginType });
  currentSession = data.session;
  return currentSession;
}

export function can(session, permission) {
  return Boolean(session?.permissions?.includes(permission) || session?.permissions?.includes("manage_platform"));
}

export async function getAccessibleBranches(session) {
  if (!session || session.loginType !== "business") return [];
  return getBranches();
}

export function updateCurrentBranch(branchId) {
  if (!currentSession) return null;
  currentSession = { ...currentSession, currentBranchId: branchId };
  return currentSession;
}
