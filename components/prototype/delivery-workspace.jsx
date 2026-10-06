"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Search, Truck } from "lucide-react";
import DataTable, { TableActionButton } from "@/components/common/data-table";
import { errorMessage, listOrders, updateOrder } from "@/services/order-service";
const tabs = ["Pending", "Delivered"];
const money = (value) => `₹${Number(value || 0).toFixed(2)}`;
export default function DeliveryWorkspace({ branchId }) {
    const [orders, setOrders] = useState([]);
    const [tab, setTab] = useState("Pending");
    const [query, setQuery] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null);
    useEffect(() => { let active = true; listOrders(branchId).then((rows) => { if (active) {
        setOrders(rows);
        setError("");
    } }).catch((issue) => { if (active)
        setError(errorMessage(issue)); }).finally(() => { if (active)
        setLoading(false); }); return () => { active = false; }; }, [branchId]);
    const visible = orders.filter((order) => (tab === "Pending" ? order.status === "Pending Delivery" : order.status === "Delivered") && [order.orderNumber, order.customerName, order.customerPhone].join(" ").toLowerCase().includes(query.toLowerCase()));
    async function deliver(order) { setSaving(order.id); setError(""); try {
        const saved = await updateOrder(order.id, { status: "Delivered" });
        setOrders((rows) => rows.map((current) => current.id === saved.id ? saved : current));
    }
    catch (issue) {
        setError(errorMessage(issue));
    }
    finally {
        setSaving(null);
    } }
    const columns = [
        { key: "order", label: "Order", cellClassName: "whitespace-nowrap", render: (order) => <Link className="rounded font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-slate-500" href={`/branch/${branchId}/orders/${order.id}`}>{order.orderNumber}</Link> },
        { key: "customer", label: "Customer", cellClassName: "min-w-32", render: (order) => <><p className="font-semibold">{order.customerName}</p><p className="mt-0.5 whitespace-nowrap text-xs text-slate-500">{order.customerPhone}</p></> },
        { key: "delivery", label: "Delivery", cellClassName: "whitespace-nowrap text-slate-600", render: (order) => <>{order.deliveryDate}<br />{order.deliveryTimeSlot}</> },
        { key: "total", label: "Grand total", cellClassName: "whitespace-nowrap font-semibold tabular-nums", render: (order) => money(order.grandTotal) },
        { key: "payment", label: "Payment", cellClassName: "whitespace-nowrap", render: (order) => <Payment order={order}/> },
        { key: "actions", label: "Actions", headerClassName: "w-20", cellClassName: "w-20 whitespace-nowrap", render: (order) => tab === "Pending" ? <TableActionButton label={`Mark ${order.orderNumber} as delivered`} onClick={() => deliver(order)} disabled={saving === order.id}><CheckCircle2 size={15}/></TableActionButton> : null },
    ];
    return <div className="delivery-workspace space-y-4 text-slate-900">
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Truck size={20} aria-hidden="true"/></span><div><h2 className="text-base font-bold tracking-tight text-slate-900">Deliveries</h2><p className="mt-0.5 text-xs text-slate-500">Track pending and completed orders.</p></div></div>
      <label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"><Search size={18} className="shrink-0 text-slate-400"/><span className="sr-only">Search deliveries</span><input className="min-w-0 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" placeholder="Search order, customer, or phone" value={query} onChange={(event) => setQuery(event.target.value)}/>{query ? <button type="button" onClick={() => setQuery("")} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Clear</button> : null}</label>
    </section>
    <div role="tablist" aria-label="Delivery status" className="grid grid-cols-2 border-b border-slate-200">{tabs.map((label) => <button key={label} role="tab" type="button" aria-selected={tab === label} onClick={() => setTab(label)} style={tab === label ? { borderBottomColor: "var(--theme-active-indicator)" } : undefined} className={`-mb-px inline-flex min-w-0 items-center justify-center whitespace-nowrap border-b-2 border-transparent px-2 py-2.5 text-xs font-semibold transition-colors sm:px-4 sm:text-sm ${tab === label ? "text-slate-900" : "text-slate-500 hover:text-slate-900"}`}>{label}<span className={`ml-1 text-[11px] tabular-nums sm:ml-2 sm:text-xs ${tab === label ? "text-slate-600" : "text-slate-400"}`}>{orders.filter((order) => label === "Pending" ? order.status === "Pending Delivery" : order.status === "Delivered").length}</span></button>)}</div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-semibold text-slate-900">{tab === "Pending" ? "Pending" : "Delivered"}</h2><span className="text-xs tabular-nums text-slate-500">{loading ? "Updating" : `${visible.length} ${visible.length === 1 ? "order" : "orders"}`}</span></div>
      {loading ? <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 size={18} className="animate-spin motion-reduce:animate-none"/>Loading deliveries</p> : <DataTable className="[&_table]:text-sm [&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_th]:px-3 [&_th]:py-3 [&_th]:text-xs [&_td]:px-3 [&_td]:py-3 [&_tbody]:divide-slate-100" columns={columns} rows={visible} rowKey={(order) => order.id} minWidth="680px" emptyMessage={`No ${tab.toLowerCase()} deliveries.`}/>}
     
    </section>
  </div>;
}
function Payment({ order }) {
    const dueAmount = Math.max(0, Number(order.grandTotal || 0) - Number(order.paidAmount || 0));
    return <div className="whitespace-nowrap text-[11px] leading-5 tabular-nums"><p className="text-slate-500">{money(order.paidAmount)} paid</p><p className={`font-semibold ${dueAmount > 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(dueAmount)} due</p></div>;
}
