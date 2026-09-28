import { api } from "./api";

let cache = {
  laundries: [],
  branches: [],
  customers: [],
  itemGroups: [],
  serviceItems: [],
  timeSlots: [],
  orders: [],
  paymentReceipts: [],
};

let hasLoadedBranches = false;

export function clearStorageCache() {
  cache = {
    laundries: [],
    branches: [],
    customers: [],
    itemGroups: [],
    serviceItems: [],
    timeSlots: [],
    orders: [],
    paymentReceipts: [],
  };
  hasLoadedBranches = false;
}

export function getCachedBranches() {
  return hasLoadedBranches ? cache.branches : null;
}

export async function getLaundries() {
  const data = await api.get("/laundries/");
  cache.laundries = data.laundries || [];
  return cache.laundries;
}

export async function saveLaundries(laundries) {
  cache.laundries = laundries;
  return cache.laundries;
}

export async function getBranches() {
  if (hasLoadedBranches) return cache.branches;
  const data = await api.get("/branches/");
  cache.branches = data.branches || [];
  hasLoadedBranches = true;
  return cache.branches;
}

export async function createBranch(payload) {
  const data = await api.post("/branches/", payload);
  cache.branches = [data.branch, ...cache.branches.filter((branch) => branch.id !== data.branch.id)];
  hasLoadedBranches = true;
  return data.branch;
}

export async function updateBranch(branchId, payload) {
  const data = await api.patch(`/branches/${branchId}/`, payload);
  cache.branches = cache.branches.map((branch) => (branch.id === branchId ? data.branch : branch));
  return data.branch;
}

export async function saveBranches(branches) {
  cache.branches = branches;
  hasLoadedBranches = true;
  return cache.branches;
}

export async function getCustomers(branchId) {
  if (!branchId) {
    const branches = await getBranches();
    const responses = await Promise.all(branches.map((branch) => getCustomers(branch.id).catch(() => [])));
    cache.customers = responses.flat().filter((customer, index, all) => all.findIndex((item) => item.id === customer.id) === index);
    return cache.customers;
  }
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const data = await api.get(`/customers/${query}`);
  cache.customers = data.customers || [];
  return cache.customers;
}

export async function createCustomer(payload) {
  const data = await api.post("/customers/", payload);
  cache.customers = [data.customer, ...cache.customers.filter((customer) => customer.id !== data.customer.id)];
  return data.customer;
}

export async function saveCustomers(customers) {
  cache.customers = customers;
  return cache.customers;
}

export async function getItemGroups(laundryId) {
  if (!laundryId) {
    const laundryIds = [...new Set((await getBranches()).map((branch) => branch.laundryId))];
    const responses = await Promise.all(laundryIds.map((id) => getItemGroups(id).catch(() => [])));
    cache.itemGroups = responses.flat().filter((group, index, all) => all.findIndex((item) => item.id === group.id) === index);
    return cache.itemGroups;
  }
  const data = await api.get(`/item-groups/?laundryId=${encodeURIComponent(laundryId)}`);
  cache.itemGroups = data.itemGroups || [];
  return cache.itemGroups;
}

export async function createItemGroup(payload) {
  const data = await api.post("/item-groups/", payload);
  cache.itemGroups = [data.itemGroup, ...cache.itemGroups.filter((group) => group.id !== data.itemGroup.id)];
  return data.itemGroup;
}

export async function updateItemGroup(groupId, payload) {
  const data = await api.patch(`/item-groups/${groupId}/`, payload);
  cache.itemGroups = cache.itemGroups.map((group) => (group.id === groupId ? data.itemGroup : group));
  return data.itemGroup;
}

export async function saveItemGroups(itemGroups) {
  cache.itemGroups = itemGroups;
  return cache.itemGroups;
}

export async function getServiceItems(laundryId) {
  if (!laundryId) {
    const laundryIds = [...new Set((await getBranches()).map((branch) => branch.laundryId))];
    const responses = await Promise.all(laundryIds.map((id) => getServiceItems(id).catch(() => [])));
    cache.serviceItems = responses.flat().filter((item, index, all) => all.findIndex((current) => current.id === item.id) === index);
    return cache.serviceItems;
  }
  const data = await api.get(`/service-items/?laundryId=${encodeURIComponent(laundryId)}`);
  cache.serviceItems = data.serviceItems || [];
  return cache.serviceItems;
}

export async function createServiceItem(payload) {
  const data = await api.post("/service-items/", payload);
  cache.serviceItems = [data.serviceItem, ...cache.serviceItems.filter((item) => item.id !== data.serviceItem.id)];
  return data.serviceItem;
}

export async function updateServiceItem(itemId, payload) {
  const data = await api.patch(`/service-items/${itemId}/`, payload);
  cache.serviceItems = cache.serviceItems.map((item) => (item.id === itemId ? data.serviceItem : item));
  return data.serviceItem;
}

export async function saveServiceItems(serviceItems) {
  cache.serviceItems = serviceItems;
  return cache.serviceItems;
}

export async function getTimeSlots(laundryId) {
  if (!laundryId) {
    const laundryIds = [...new Set((await getBranches()).map((branch) => branch.laundryId))];
    const responses = await Promise.all(laundryIds.map((id) => getTimeSlots(id).catch(() => [])));
    cache.timeSlots = responses.flat().filter((slot, index, all) => all.findIndex((item) => item.id === slot.id) === index);
    return cache.timeSlots;
  }
  const data = await api.get(`/time-slots/?laundryId=${encodeURIComponent(laundryId)}`);
  cache.timeSlots = data.timeSlots || [];
  return cache.timeSlots;
}

export async function createTimeSlot(payload) {
  const data = await api.post("/time-slots/", payload);
  cache.timeSlots = [data.timeSlot, ...cache.timeSlots.filter((slot) => slot.id !== data.timeSlot.id)];
  return data.timeSlot;
}

export async function updateTimeSlot(slotId, payload) {
  const data = await api.patch(`/time-slots/${slotId}/`, payload);
  cache.timeSlots = cache.timeSlots.map((slot) => (slot.id === slotId ? data.timeSlot : slot));
  return data.timeSlot;
}

export async function saveTimeSlots(timeSlots) {
  cache.timeSlots = timeSlots;
  return cache.timeSlots;
}

export async function getOrders(branchId) {
  if (!branchId) {
    const branches = await getBranches();
    const responses = await Promise.all(branches.map((branch) => getOrders(branch.id).catch(() => [])));
    cache.orders = responses.flat().filter((order, index, all) => all.findIndex((item) => item.id === order.id) === index);
    return cache.orders;
  }
  const query = branchId ? `?branchId=${encodeURIComponent(branchId)}` : "";
  const data = await api.get(`/orders/${query}`);
  cache.orders = data.orders || [];
  return cache.orders;
}

export async function getOrder(orderId) {
  const data = await api.get(`/orders/${orderId}/`);
  return data.order;
}

export async function createOrder(payload) {
  const data = await api.post("/orders/", payload);
  cache.orders = [data.order, ...cache.orders.filter((order) => order.id !== data.order.id)];
  return data.order;
}

export async function updateOrder(orderId, payload) {
  const data = await api.patch(`/orders/${orderId}/`, payload);
  cache.orders = cache.orders.map((order) => (order.id === orderId ? data.order : order));
  return data.order;
}

export async function saveOrders(orders) {
  cache.orders = orders;
  return cache.orders;
}

export async function getPaymentReceipts(orderId) {
  if (!orderId) return cache.paymentReceipts;
  const order = await getOrder(orderId);
  cache.paymentReceipts = order.receipts || [];
  return cache.paymentReceipts;
}

export async function createPaymentReceipt(orderId, payload) {
  const data = await api.post(`/orders/${orderId}/receipts/`, payload);
  cache.paymentReceipts = [data.receipt, ...cache.paymentReceipts.filter((receipt) => receipt.id !== data.receipt.id)];
  cache.orders = cache.orders.map((order) => (order.id === orderId ? data.order : order));
  return data;
}

export async function savePaymentReceipts(paymentReceipts) {
  cache.paymentReceipts = paymentReceipts;
  return cache.paymentReceipts;
}
