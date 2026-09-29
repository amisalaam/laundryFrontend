"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { errorMessage, listOrders, updateOrder, type Order } from "@/services/order-service";

const tabs = ["Pending", "Delivered"] as const;
type Tab = typeof tabs[number];
const money = (value: number) => `₹${Number(value || 0).toFixed(2)}`;

export default function DeliveryWorkspace({ branchId }: { branchId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<Tab>("Pending");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    listOrders(branchId).then((rows) => { if (active) { setOrders(rows); setError(""); } }).catch((issue) => { if (active) setError(errorMessage(issue)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branchId]);
  const visible = orders.filter((order) => (tab === "Pending" ? order.status === "Pending Delivery" : order.status === "Delivered") && [order.orderNumber, order.customerName, order.customerPhone].join(" ").toLowerCase().includes(query.toLowerCase()));
  async function deliver(order: Order) {
    setSaving(order.id); setError("");
    try { const saved = await updateOrder(order.id, { status: "Delivered" }); setOrders((rows) => rows.map((current) => current.id === saved.id ? saved : current)); }
    catch (issue) { setError(errorMessage(issue)); }
    finally { setSaving(null); }
  }
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"><label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2"><Search size={18} className="shrink-0 text-zinc-400" /><span className="sr-only">Search deliveries</span><input className="min-w-0 w-full text-sm outline-none" placeholder="Search order, customer, phone" value={query} onChange={(event) => setQuery(event.target.value)} /></label></div>
    <div role="tablist" aria-label="Delivery status" className="flex gap-1 overflow-x-auto border-b border-zinc-200">{tabs.map((label) => <button key={label} role="tab" type="button" aria-selected={tab === label} onClick={() => setTab(label)} className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === label ? "border-cyan-600 text-cyan-700" : "border-transparent text-zinc-500"}`}>{label}<span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{orders.filter((order) => label === "Pending" ? order.status === "Pending Delivery" : order.status === "Delivered").length}</span></button>)}</div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">{loading ? <p className="p-6 text-sm text-zinc-500">Loading deliveries…</p> : <><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr>{["Order", "Customer", "Delivery", "Grand total", "Payment", "Actions"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-zinc-200">{visible.map((order) => <tr key={order.id}><td className="px-4 py-4"><Link className="font-bold text-cyan-700" href={`/branch/${branchId}/orders/${order.id}`}>{order.orderNumber}</Link></td><td className="px-4 py-4"><p className="font-semibold">{order.customerName}</p><p className="text-zinc-500">{order.customerPhone}</p></td><td className="px-4 py-4 text-zinc-600">{order.deliveryDate}<br />{order.deliveryTimeSlot}</td><td className="px-4 py-4 font-bold">{money(order.grandTotal)}</td><td className="px-4 py-4">{order.paymentStatus}</td><td className="px-4 py-4">{tab === "Pending" && <button type="button" disabled={saving === order.id} onClick={() => deliver(order)} className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-50" title="Deliver to Customer" aria-label={`Deliver ${order.orderNumber} to customer`}><CheckCircle2 size={19} /></button>}</td></tr>)}</tbody></table></div><div className="grid gap-3 p-3 lg:hidden">{visible.map((order) => <div key={order.id} className="rounded-lg border border-zinc-200 p-4"><div className="flex items-start justify-between gap-3"><div><Link className="font-bold text-cyan-700" href={`/branch/${branchId}/orders/${order.id}`}>{order.orderNumber}</Link><p className="text-sm text-zinc-600">{order.customerName} · {order.customerPhone}</p></div>{tab === "Pending" && <button type="button" disabled={saving === order.id} onClick={() => deliver(order)} className="inline-flex size-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 disabled:opacity-50" title="Deliver to Customer" aria-label={`Deliver ${order.orderNumber} to customer`}><CheckCircle2 size={19} /></button>}</div><p className="mt-3 text-sm text-zinc-600">Delivery: {order.deliveryDate}, {order.deliveryTimeSlot}</p><p className="mt-1 font-bold">{money(order.grandTotal)}</p></div>)}</div>{!visible.length && <p className="p-8 text-center text-sm text-zinc-500">No {tab.toLowerCase()} deliveries.</p>}</>}</div>
  </div>;
}
