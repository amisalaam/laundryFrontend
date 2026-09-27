import {
  initialBranches,
  initialCustomers,
  initialItemGroups,
  initialLaundries,
  initialOrders,
  initialPaymentReceipts,
  initialServiceItems,
  initialTimeSlots,
  STORAGE_KEYS,
} from "./mock-data";

export function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const savedValue = window.localStorage.getItem(key);
    return savedValue ? JSON.parse(savedValue) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function seedPrototypeData() {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(STORAGE_KEYS.laundries)) {
    writeJson(STORAGE_KEYS.laundries, initialLaundries);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.branches)) {
    writeJson(STORAGE_KEYS.branches, initialBranches);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.customers)) {
    writeJson(STORAGE_KEYS.customers, initialCustomers);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.itemGroups)) {
    writeJson(STORAGE_KEYS.itemGroups, initialItemGroups);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.serviceItems)) {
    writeJson(STORAGE_KEYS.serviceItems, initialServiceItems);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.timeSlots)) {
    writeJson(STORAGE_KEYS.timeSlots, initialTimeSlots);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.orders)) {
    writeJson(STORAGE_KEYS.orders, initialOrders);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.paymentReceipts)) {
    writeJson(STORAGE_KEYS.paymentReceipts, initialPaymentReceipts);
  }
}

export function getLaundries() {
  return readJson(STORAGE_KEYS.laundries, initialLaundries);
}

export function saveLaundries(laundries) {
  writeJson(STORAGE_KEYS.laundries, laundries);
}

export function getBranches() {
  return readJson(STORAGE_KEYS.branches, initialBranches);
}

export function saveBranches(branches) {
  writeJson(STORAGE_KEYS.branches, branches);
}

export function getCustomers() {
  return readJson(STORAGE_KEYS.customers, initialCustomers);
}

export function saveCustomers(customers) {
  writeJson(STORAGE_KEYS.customers, customers);
}

export function getItemGroups() {
  return readJson(STORAGE_KEYS.itemGroups, initialItemGroups);
}

export function saveItemGroups(itemGroups) {
  writeJson(STORAGE_KEYS.itemGroups, itemGroups);
}

export function getServiceItems() {
  return readJson(STORAGE_KEYS.serviceItems, initialServiceItems);
}

export function saveServiceItems(serviceItems) {
  writeJson(STORAGE_KEYS.serviceItems, serviceItems);
}

export function getTimeSlots() {
  return readJson(STORAGE_KEYS.timeSlots, initialTimeSlots);
}

export function saveTimeSlots(timeSlots) {
  writeJson(STORAGE_KEYS.timeSlots, timeSlots);
}

export function getOrders() {
  return readJson(STORAGE_KEYS.orders, initialOrders);
}

export function saveOrders(orders) {
  writeJson(STORAGE_KEYS.orders, orders);
}

export function getPaymentReceipts() {
  return readJson(STORAGE_KEYS.paymentReceipts, initialPaymentReceipts);
}

export function savePaymentReceipts(paymentReceipts) {
  writeJson(STORAGE_KEYS.paymentReceipts, paymentReceipts);
}
