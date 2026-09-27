import { demoUsers, STORAGE_KEYS } from "./mock-data";
import { getBranches, readJson, seedPrototypeData, writeJson } from "./storage";

export function getSession() {
  return readJson(STORAGE_KEYS.session, null);
}

export function setSession(user, currentBranchId = "") {
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    loginType: user.loginType,
    laundryId: user.laundryId || "",
    permissions: user.permissions || [],
    branchIds: user.branchIds || [],
    currentBranchId,
  };
  writeJson(STORAGE_KEYS.session, session);
  return session;
}

export function logout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEYS.session);
}

export function authenticate(email, password, loginType) {
  seedPrototypeData();
  const normalizedEmail = email.trim().toLowerCase();
  return demoUsers.find(
    (user) =>
      user.email.toLowerCase() === normalizedEmail &&
      user.password === password &&
      user.loginType === loginType,
  );
}

export function can(session, permission) {
  return Boolean(session?.permissions?.includes(permission) || session?.permissions?.includes("manage_platform"));
}

export function getAccessibleBranches(session) {
  if (!session) return [];
  const branches = getBranches().filter((branch) => branch.laundryId === session.laundryId);
  if (session.role === "Laundry Owner") return branches;
  return branches.filter((branch) => session.branchIds?.includes(branch.id));
}

export function updateCurrentBranch(branchId) {
  const session = getSession();
  if (!session) return null;
  const nextSession = { ...session, currentBranchId: branchId };
  writeJson(STORAGE_KEYS.session, nextSession);
  writeJson(STORAGE_KEYS.recentBranch, branchId);
  return nextSession;
}
