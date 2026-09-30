"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardList, Loader2, MoreVertical, PackageCheck, Plus, Printer, Search, Tag, Truck, WalletCards } from "lucide-react";
import { createReceipt, deleteOrder, errorMessage, listOrders, updateOrder, type Order } from "@/services/order-service";
import OrderDialog, { type Action } from "./order-dialog";
import BillPrintDialog from "./bill-print-dialog";
import LabelPrintDialog from "./label-print-dialog";
import ReceiptDialog from "./receipt-dialog";
import DataTable from "@/components/common/data-table";

const tabs = ["Pending", "Under Processing", "Cancelled"] as const;
type Tab = typeof tabs[number];
function matches(order: Order, tab: Tab) { return tab === "Under Processing" ? order.status === "Processing" : order.status === tab; }
const money = (value: number) => `₹${Number(value || 0).toFixed(2)}`;
const iconButton = "inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400";

function Actions({ order, onAction, onBill, onLabels, onReceipt, onMoveToDelivery, permissions, deliveryPermissions }: { order: Order; onAction: (action: Action) => void; onBill: () => void; onLabels: () => void; onReceipt: () => void; onMoveToDelivery: () => void; permissions?: Record<string, boolean>; deliveryPermissions?: Record<string, boolean> }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const pending = order.status === "Pending";
  const processing = order.status === "Processing";
  const cancelled = order.status === "Cancelled";
  useEffect(() => {
    if (!position) return;
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function close(event: Event) {
      if (event.type === "pointerdown" && (menu.current?.contains(event.target as Node) || trigger.current?.contains(event.target as Node))) return;
      setPosition(null);
    }
    document.addEventListener("pointerdown", close);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("pointerdown", close); window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [position]);
  function dismiss() { setPosition(null); trigger.current?.focus(); }
  function select(action: Action) { dismiss(); onAction(action); }
  const item = "block w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none";
  return <div className="inline-flex flex-nowrap items-center justify-start gap-1">
    {pending && permissions?.edit !== false && <button type="button" onClick={() => onAction("process")} className={iconButton} title="Process Order" aria-label={`Process order ${order.orderNumber}`}><PackageCheck size={15} className="shrink-0" /></button>}
    {processing && deliveryPermissions?.edit !== false && <button type="button" onClick={onMoveToDelivery} className={iconButton} title="Move to Delivery" aria-label={`Move ${order.orderNumber} to delivery`}><Truck size={15} className="shrink-0" /></button>}
    <button type="button" onClick={onBill} className={iconButton} title="Print bill" aria-label={`Print bill for ${order.orderNumber}`}><Printer size={15} className="shrink-0" /></button>
    <button type="button" onClick={onLabels} className={iconButton} title="Print labels" aria-label={`Print labels for ${order.orderNumber}`}><Tag size={15} className="shrink-0" /></button>
    {order.paymentStatus !== "Paid" && permissions?.edit !== false && <button type="button" onClick={onReceipt} className={iconButton} title="Receipt" aria-label={`Receipt for ${order.orderNumber}`}><WalletCards size={15} className="shrink-0" /></button>}
    <button ref={trigger} type="button" className={iconButton} title="Order actions" aria-label={`Actions for ${order.orderNumber}`} aria-haspopup="menu" aria-expanded={!!position} onClick={() => {
      if (position) { dismiss(); return; }
      const rect = trigger.current!.getBoundingClientRect();
      const height = pending ? 222 : cancelled ? 54 : 96;
      setPosition({ left: Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200)), top: rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom + 4 });
    }}><MoreVertical size={15} className="shrink-0" /></button>
    {position && createPortal(<div ref={menu} role="menu" aria-label={`Order actions for ${order.orderNumber}`} style={position} className="fixed z-40 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-xl" onKeyDown={(event) => {
      if (event.key === "Escape" || event.key === "Tab") { if (event.key === "Escape") event.preventDefault(); dismiss(); }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault(); const items = Array.from(menu.current!.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        const current = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    }}>
      {pending && <>{permissions?.edit !== false && <><button role="menuitem" className={item} onClick={() => select("cancel")}>Cancel Order</button><button role="menuitem" className={item} onClick={() => select("edit")}>Edit Order</button></>}{permissions?.delete !== false && <button role="menuitem" className={item} onClick={() => select("delete")}>Delete Order</button>}</>}
      <Link role="menuitem" className={item} href={`/branch/${order.branchId}/orders/${order.id}`} onClick={dismiss}>View Order</Link>
      {!cancelled && permissions?.edit !== false && <button role="menuitem" className={item} onClick={() => select("discount")}>Cash Discount</button>}
    </div>, document.body)}
  </div>;
}

export default function OrdersWorkspace({ branchId, permissions, deliveryPermissions }: { branchId: string; permissions?: Record<string, boolean>; deliveryPermissions?: Record<string, boolean> }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<Tab>("Pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState<{ order: Order; action: Action } | null>(null);
  const [billTarget, setBillTarget] = useState<Order | null>(null);
  const [labelTarget, setLabelTarget] = useState<Order | null>(null);
  const [receiptTarget, setReceiptTarget] = useState<Order | null>(null);
  useEffect(() => {
    let active = true;
    listOrders(branchId).then((rows) => { if (active) { setOrders(rows); setError(""); } }).catch((issue) => { if (active) setError(errorMessage(issue)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branchId, reload]);
  const visible = orders.filter((order) => matches(order, tab) && [order.orderNumber, order.customerName, order.customerPhone].join(" ").toLowerCase().includes(query.toLowerCase()));
  async function save(values: Record<string, unknown>) {
    if (!target) return;
    if (target.action === "delete") {
      await deleteOrder(target.order.id);
      setOrders((rows) => rows.filter((order) => order.id !== target.order.id));
      setNotice(`${target.order.orderNumber} removed from the list.`);
    } else {
      const saved = await updateOrder(target.order.id, values);
      setOrders((rows) => rows.map((order) => order.id === saved.id ? saved : order));
      setNotice(`${saved.orderNumber} ${saved.status === "Processing" && target.action === "process" ? "moved to Under Processing" : saved.status === "Cancelled" ? "moved to Cancelled" : "updated"}.`);
    }
    setTarget(null);
  }
  async function saveReceipt(values: { amount: number; method: string; note: string }) {
    if (!receiptTarget) return;
    const saved = await createReceipt(receiptTarget.id, values);
    setOrders((rows) => rows.map((order) => order.id === saved.id ? saved : order));
    setReceiptTarget(null);
    setNotice(`Payment recorded for ${saved.orderNumber}.`);
  }
  async function moveToDelivery(order: Order) {
    try {
      const saved = await updateOrder(order.id, { status: "Pending Delivery" });
      setOrders((rows) => rows.map((current) => current.id === saved.id ? saved : current));
      setNotice(`${saved.orderNumber} moved to Delivery → Pending.`);
    } catch (issue) { setError(errorMessage(issue)); }
  }
  function actions(order: Order) { return <Actions order={order} onAction={(action) => setTarget({ order, action })} onBill={() => setBillTarget(order)} onLabels={() => setLabelTarget(order)} onReceipt={() => setReceiptTarget(order)} onMoveToDelivery={() => moveToDelivery(order)} permissions={permissions} deliveryPermissions={deliveryPermissions} />; }
  return <div className="space-y-4 text-slate-900">
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><ClipboardList size={20} aria-hidden="true" /></span><div><h2 className="text-base font-bold tracking-tight text-slate-900">Order workspace</h2><p className="mt-0.5 text-xs text-slate-500">Manage orders, payments, and delivery handovers.</p></div></div>
        {permissions?.add !== false && <Link href={`/branch/${branchId}/orders/create`} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"><Plus size={17} />Create order</Link>}
      </div>
      <label className="mt-5 flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"><Search size={18} className="shrink-0 text-slate-400" /><span className="sr-only">Search orders</span><input className="min-w-0 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" placeholder="Search by order number, customer, or phone" value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button type="button" onClick={() => setQuery("")} className="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-slate-500">Clear</button>}</label>
    </section>
    <div role="tablist" aria-label="Order status" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const index = tabs.indexOf(tab); const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : -1) + 3) % 3;
      setTab(tabs[next]); document.getElementById(`orders-tab-${next}`)?.focus();
    }}>{tabs.map((label, index) => <button type="button" role="tab" key={label} id={`orders-tab-${index}`} aria-selected={tab === label} aria-controls="orders-panel" tabIndex={tab === label ? 0 : -1} onClick={() => setTab(label)} className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-400 ${tab === label ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>{label}<span className={`ml-2 rounded-full px-2 py-0.5 text-xs tabular-nums ${tab === label ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{orders.filter((order) => matches(order, label)).length}</span></button>)}</div>
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error} <button className="ml-2 underline" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Retry</button></div>}
    <div id="orders-panel" role="tabpanel" aria-labelledby={`orders-tab-${tabs.indexOf(tab)}`} aria-busy={loading} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-semibold text-slate-900">{tab === "Under Processing" ? "Orders in progress" : `${tab} orders`}</h2><span className="text-xs tabular-nums text-slate-500">{loading ? "Updating…" : `${visible.length} ${visible.length === 1 ? "order" : "orders"}${query ? " found" : ""}`}</span></div>
      {loading ? <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 size={18} className="animate-spin motion-reduce:animate-none" />Loading orders…</p> : <>
        <div className="hidden lg:block"><DataTable className="[&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_tbody]:divide-slate-100 [&_tbody_tr:hover]:bg-transparent [&_table]:text-xs [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-[11px] [&_td]:px-3 [&_td]:py-3 [&_td]:leading-5" minWidth="880px" rows={visible} rowKey={(order: Order) => order.id} emptyMessage={query ? "No matching orders." : `No ${tab.toLowerCase()} orders.`} columns={[
          { key: "order", label: "Order", cellClassName: "whitespace-nowrap", render: (order: Order) => <Link className="rounded font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-slate-500" href={`/branch/${branchId}/orders/${order.id}`}>{order.orderNumber}</Link> },
          { key: "customer", label: "Customer", cellClassName: "min-w-32", render: (order: Order) => <><p className="font-semibold">{order.customerName}</p><p className="mt-0.5 whitespace-nowrap text-[11px] text-slate-500">{order.customerPhone}</p></> },
          { key: "delivery", label: "Delivery", cellClassName: "whitespace-nowrap text-slate-600", render: (order: Order) => <>{order.deliveryDate}<br />{order.deliveryTimeSlot}</> },
          { key: "items", label: "Items", cellClassName: "whitespace-nowrap text-slate-600", render: (order: Order) => <>{order.itemCount} labels<br />Qty {order.totalItemQuantity}</> },
          { key: "total", label: "Grand total", headerClassName: "text-left", cellClassName: "text-left font-semibold tabular-nums whitespace-nowrap", render: (order: Order) => money(order.grandTotal) },
          { key: "payment", label: "Payment", cellClassName: "whitespace-nowrap", render: (order: Order) => <Payment order={order} /> },
          { key: "actions", label: "Actions", headerClassName: "w-44", cellClassName: "w-44 whitespace-nowrap", render: (order: Order) => actions(order) },
        ]} /></div>
        <div className="grid gap-3 p-4 lg:hidden">{!visible.length && <p className="py-8 text-center text-sm text-slate-500">{query ? "No matching orders. Try another search." : `No ${tab.toLowerCase()} orders.`}</p>}{visible.map((order) => <div key={order.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"><div className="flex flex-col items-start justify-between gap-3 sm:flex-row"><div className="min-w-0 break-words"><Link className="rounded font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-slate-500" href={`/branch/${branchId}/orders/${order.id}`}>{order.orderNumber}</Link><p className="text-sm text-slate-600">{order.customerName} · {order.customerPhone}</p></div>{actions(order)}</div><div className="mt-3 space-y-2 text-sm text-slate-600"><p>Delivery: {order.deliveryDate}, {order.deliveryTimeSlot}</p><p>Labels: {order.itemCount} · Quantity: {order.totalItemQuantity}</p><p className="font-bold text-slate-950">Grand total: {money(order.grandTotal)}</p><Payment order={order} /></div></div>)}</div>
      </>}
      {!loading && <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">{query ? "Results match your search in the selected status." : "Select an order number to view its details."}</div>}
    </div>
    {target && <OrderDialog key={`${target.order.id}-${target.action}`} {...target} onClose={() => setTarget(null)} onSave={save} />}
    {billTarget && <BillPrintDialog order={billTarget} onClose={() => setBillTarget(null)} />}
    {labelTarget && <LabelPrintDialog order={labelTarget} onClose={() => setLabelTarget(null)} />}
    {receiptTarget && <ReceiptDialog order={receiptTarget} onClose={() => setReceiptTarget(null)} onSave={saveReceipt} />}
  </div>;
}

function Payment({ order }: { order: Order }) {
  const dueAmount = Math.max(0, Number(order.grandTotal || 0) - Number(order.paidAmount || 0));
  return <div className="whitespace-nowrap text-[11px] leading-5 tabular-nums">
    <p className="text-slate-500">{money(order.paidAmount)} paid</p>
    <p className={`font-semibold ${dueAmount > 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(dueAmount)} due</p>
  </div>;
}
