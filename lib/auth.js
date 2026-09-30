import { api } from "./api";
import { clearStorageCache, getBranches } from "./storage";

let currentSession = null;
const BRANCH_STORAGE_PREFIX = "laundryos.currentBranchId";

function branchStorageKey(session) {
  return session?.id ? `${BRANCH_STORAGE_PREFIX}:${session.id}` : null;
}

function restoreSelectedBranch(session) {
  if (typeof window === "undefined" || !session?.id || session.loginType !== "business") return session;
  const savedBranchId = window.localStorage.getItem(branchStorageKey(session));
  if (!savedBranchId || !session.branchIds?.includes(savedBranchId)) return session;
  return { ...session, currentBranchId: savedBranchId };
}

export function getCachedSession() {
  return currentSession;
}

export async function getSession() {
  if (currentSession) return currentSession;
  try {
    const data = await api.get("/auth/me/");
    currentSession = restoreSelectedBranch(data.session);
    return currentSession;
  } catch {
    currentSession = null;
    return null;
  }
}

export function setSession(session) {
  currentSession = restoreSelectedBranch(session);
  return currentSession;
}

export async function refreshSession() {
  try {
    const data = await api.get("/auth/me/");
    currentSession = restoreSelectedBranch(data.session);
    return currentSession;
  } catch {
    currentSession = null;
    return null;
  }
}

export async function logout() {
  currentSession = null;
  clearStorageCache();
  await api.post("/auth/logout/");
}

export async function authenticate(email, password, loginType) {
  clearStorageCache();
  const data = await api.post("/auth/login/", { email, password, loginType });
  currentSession = restoreSelectedBranch(data.session);
  return currentSession;
}

export function can(session, permission) {
  return Boolean(session?.permissions?.includes(permission) || session?.permissions?.includes("manage_platform") || session?.permissions?.includes("owner"));
}

export async function getAccessibleBranches(session) {
  if (!session || session.loginType !== "business") return [];
  return getBranches();
}

export function updateCurrentBranch(branchId) {
  if (!currentSession) return null;
  currentSession = { ...currentSession, currentBranchId: branchId };
  if (typeof window !== "undefined" && currentSession.loginType === "business" && currentSession.branchIds?.includes(branchId)) {
    window.localStorage.setItem(branchStorageKey(currentSession), branchId);
  }
  return currentSession;
}
