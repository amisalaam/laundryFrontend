import { api } from "@/lib/api";

export type OrderItem = { rowId: string; itemId: string; itemName: string; shortCode?: string; unitType?: string; quantity: number; unitPrice: number; itemCount: number; itemTotal: number };
export type Order = {
  id: string; orderNumber: string; branchId: string; laundryId: string; customerName: string; customerPhone: string;
  deliveryDate: string; deliveryTimeSlot: string; customerComment?: string; otherComment?: string; status: string;
  itemCount: number; totalItemQuantity: number; subTotal: number; grandTotal: number; paidAmount: number;
  discount: number; paymentStatus: string; items: OrderItem[];
};
export type Slot = { id: string; label: string; status: string };
export async function listOrders(branchId: string): Promise<Order[]> {
  return (await api.get(`/orders/?branchId=${encodeURIComponent(branchId)}`)).orders;
}
export async function updateOrder(id: string, values: Record<string, unknown>): Promise<Order> {
  return (await api.patch(`/orders/${id}/`, values)).order;
}
export async function deleteOrder(id: string): Promise<void> { await api.del(`/orders/${id}/`); }
export async function createReceipt(id: string, values: { amount: number; method: string; note: string }): Promise<Order> {
  return (await api.post(`/orders/${id}/receipts/`, values)).order;
}
export async function listSlots(laundryId: string): Promise<Slot[]> {
  return (await api.get(`/time-slots/?laundryId=${encodeURIComponent(laundryId)}`)).timeSlots;
}
export function errorMessage(error: unknown): string {
  const issue = error as { message?: string; fields?: Record<string, string> };
  return Object.values(issue?.fields || {}).join(" ") || issue?.message || "Unable to save changes. Please try again.";
}
