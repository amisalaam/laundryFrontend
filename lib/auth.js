import { api } from "./api";

let currentSession = null;

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
  await api.post("/auth/logout/");
}

export async function authenticate(email, password, loginType) {
  const data = await api.post("/auth/login/", { email, password, loginType });
  currentSession = data.session;
  return currentSession;
}

export function can(session, permission) {
  return Boolean(session?.permissions?.includes(permission) || session?.permissions?.includes("manage_platform"));
}

export async function getAccessibleBranches(session) {
  if (!session || session.loginType !== "business") return [];
  const data = await api.get("/branches/");
  return data.branches || [];
}

export function updateCurrentBranch(branchId) {
  if (!currentSession) return null;
  currentSession = { ...currentSession, currentBranchId: branchId };
  return currentSession;
}
