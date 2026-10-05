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
import { ConfirmationModal } from "@/components/common/modal";
import { showSuccessToast } from "@/lib/success-toast";

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
  const item = "block w-full rounded-md px-2.5 py-2 text-left text-xs hover:bg-slate-100 focus:bg-slate-100 focus:outline-none sm:px-3 sm:py-2.5 sm:text-sm";
  return <div className="inline-flex flex-nowrap items-center justify-start gap-1">
    {pending && permissions?.edit !== false && <button type="button" onClick={() => onAction("process")} className={iconButton} title="Process Order" aria-label={`Process order ${order.orderNumber}`}><PackageCheck size={15} className="shrink-0" /></button>}
    {processing && deliveryPermissions?.edit !== false && <button type="button" onClick={onMoveToDelivery} className={iconButton} title="Move to Delivery" aria-label={`Move ${order.orderNumber} to delivery`}><Truck size={15} className="shrink-0" /></button>}
    <button type="button" onClick={onBill} className={iconButton} title="Print bill" aria-label={`Print bill for ${order.orderNumber}`}><Printer size={15} className="shrink-0" /></button>
    <button type="button" onClick={onLabels} className={iconButton} title="Print labels" aria-label={`Print labels for ${order.orderNumber}`}><Tag size={15} className="shrink-0" /></button>
    {order.paymentStatus !== "Paid" && permissions?.edit !== false && <button type="button" onClick={onReceipt} className={iconButton} title="Receipt" aria-label={`Receipt for ${order.orderNumber}`}><WalletCards size={15} className="shrink-0" /></button>}
    <button ref={trigger} type="button" className={iconButton} title="Order actions" aria-label={`Actions for ${order.orderNumber}`} aria-haspopup="menu" aria-expanded={!!position} onClick={() => {
      if (position) { dismiss(); return; }
      const rect = trigger.current!.getBoundingClientRect();
      const compact = window.matchMedia("(max-width: 768px)").matches;
      const height = pending ? (compact ? 184 : 222) : cancelled ? (compact ? 46 : 54) : (compact ? 80 : 96);
      setPosition({ left: Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200)), top: rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom + 4 });
    }}><MoreVertical size={15} className="shrink-0" /></button>
    {position && createPortal(<div ref={menu} role="menu" aria-label={`Order actions for ${order.orderNumber}`} style={position} className="fixed z-40 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-xl sm:w-48" onKeyDown={(event) => {
      if (event.key === "Escape" || event.key === "Tab") { if (event.key === "Escape") event.preventDefault(); dismiss(); }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault(); const items = Array.from(menu.current!.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        const current = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    }}>
      {pending && <>{permissions?.edit !== false && <><button role="menuitem" className={item} onClick={() => select("cancel")}>Cancel Order</button><Link role="menuitem" className={item} href={`/branch/${order.branchId}/orders/create?edit=${order.id}`} onClick={dismiss}>Edit Order</Link></>}{permissions?.delete !== false && <button role="menuitem" className={item} onClick={() => select("delete")}>Delete Order</button>}</>}
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
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  useEffect(() => {
    let active = true;
    listOrders(branchId).then((rows) => { if (active) { setOrders(rows); setError(""); } }).catch((issue) => { if (active) setError(errorMessage(issue)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branchId, reload]);
  const visible = orders.filter((order) => matches(order, tab) && [order.orderNumber, order.customerName, order.customerPhone].join(" ").toLowerCase().includes(query.toLowerCase()));
  async function save(values: Record<string, unknown>) {
    if (!target) return;
    const saved = await updateOrder(target.order.id, values);
    setOrders((rows) => rows.map((order) => order.id === saved.id ? saved : order));
    setNotice(`${saved.orderNumber} ${saved.status === "Processing" && target.action === "process" ? "moved to Under Processing" : saved.status === "Cancelled" ? "moved to Cancelled" : "updated"}.`);
    if (target.action === "edit") showSuccessToast("Order changes saved.");
    setTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    await deleteOrder(deleteTarget.id);
    setOrders((rows) => rows.filter((order) => order.id !== deleteTarget.id));
    setNotice(`${deleteTarget.orderNumber} removed from the list.`);
    showSuccessToast("Order deleted.");
    setDeleteTarget(null);
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
  function actions(order: Order) { return <Actions order={order} onAction={(action) => action === "delete" ? setDeleteTarget(order) : setTarget({ order, action })} onBill={() => setBillTarget(order)} onLabels={() => setLabelTarget(order)} onReceipt={() => setReceiptTarget(order)} onMoveToDelivery={() => moveToDelivery(order)} permissions={permissions} deliveryPermissions={deliveryPermissions} />; }
  return <div className="order-workspace space-y-4 text-slate-900">
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><ClipboardList size={20} aria-hidden="true" /></span><div><h2 className="text-base font-bold tracking-tight text-slate-900">Orders</h2><p className="mt-0.5 text-xs text-slate-500">Manage orders and deliveries.</p></div></div>
        {permissions?.add !== false && <Link href={`/branch/${branchId}/orders/create`} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"><Plus size={16} />Create order</Link>}
      </div>
      <label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"><Search size={18} className="shrink-0 text-slate-400" /><span className="sr-only">Search orders</span><input className="min-w-0 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" placeholder="Search order, customer, or phone" value={query} onChange={(e) => setQuery(e.target.value)} />{query && <button type="button" onClick={() => setQuery("")} className="rounded px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-slate-500">Clear</button>}</label>
    </section>
    <div role="tablist" aria-label="Order status" className="grid grid-cols-3 border-b border-slate-200" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const index = tabs.indexOf(tab); const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : -1) + 3) % 3;
      setTab(tabs[next]); document.getElementById(`orders-tab-${next}`)?.focus();
    }}>{tabs.map((label, index) => <button type="button" role="tab" key={label} id={`orders-tab-${index}`} aria-selected={tab === label} aria-controls="orders-panel" tabIndex={tab === label ? 0 : -1} onClick={() => setTab(label)} style={tab === label ? { borderBottomColor: "var(--theme-active-indicator)" } : undefined} className={`-mb-px inline-flex min-w-0 items-center justify-center whitespace-nowrap border-b-2 border-transparent px-2 py-2.5 text-xs font-semibold transition-colors focus:outline-none sm:px-4 sm:text-sm ${tab === label ? "text-slate-900" : "text-slate-500 hover:text-slate-900"}`}>{label}<span className={`ml-1 text-[11px] tabular-nums sm:ml-2 sm:text-xs ${tab === label ? "text-slate-600" : "text-slate-400"}`}>{orders.filter((order) => matches(order, label)).length}</span></button>)}</div>
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error} <button className="ml-2 underline" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Retry</button></div>}
    <div id="orders-panel" role="tabpanel" aria-labelledby={`orders-tab-${tabs.indexOf(tab)}`} aria-busy={loading} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-semibold text-slate-900">{tab === "Under Processing" ? "In progress" : `${tab} orders`}</h2><span className="text-xs tabular-nums text-slate-500">{loading ? "Updating" : `${visible.length} ${visible.length === 1 ? "order" : "orders"}${query ? " found" : ""}`}</span></div>
      {loading ? <p role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 size={18} className="animate-spin motion-reduce:animate-none" />Loading orders</p> : <>
        <DataTable className="[&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_tbody]:divide-slate-100 [&_tbody_tr:hover]:bg-transparent [&_table]:text-xs [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:text-[11px] [&_td]:px-3 [&_td]:py-3 [&_td]:leading-5" minWidth="760px" rows={visible} rowKey={(order: Order) => order.id} emptyMessage={query ? "No matching orders." : `No ${tab.toLowerCase()} orders.`} columns={[
          { key: "order", label: "Order", cellClassName: "whitespace-nowrap", render: (order: Order) => <Link className="rounded font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-slate-500" href={`/branch/${branchId}/orders/${order.id}`}>{order.orderNumber}</Link> },
          { key: "customer", label: "Customer", cellClassName: "min-w-32", render: (order: Order) => <><p className="font-semibold">{order.customerName}</p><p className="mt-0.5 whitespace-nowrap text-[11px] text-slate-500">{order.customerPhone}</p></> },
          { key: "delivery", label: "Delivery", cellClassName: "whitespace-nowrap text-slate-600", render: (order: Order) => <>{order.deliveryDate}<br />{order.deliveryTimeSlot}</> },
          { key: "items", label: "Items", cellClassName: "whitespace-nowrap text-slate-600", render: (order: Order) => <>{order.itemCount} labels<br />Qty {order.totalItemQuantity}</> },
          { key: "total", label: "Grand total", headerClassName: "text-left", cellClassName: "text-left font-semibold tabular-nums whitespace-nowrap", render: (order: Order) => money(order.grandTotal) },
          { key: "payment", label: "Payment", cellClassName: "whitespace-nowrap", render: (order: Order) => <Payment order={order} /> },
          { key: "actions", label: "Actions", headerClassName: "w-44", cellClassName: "w-44 whitespace-nowrap", render: (order: Order) => actions(order) },
        ]} />
      </>}

    </div>
    {target && <OrderDialog key={`${target.order.id}-${target.action}`} {...target} onClose={() => setTarget(null)} onSave={save} />}
    {billTarget && <BillPrintDialog order={billTarget} onClose={() => setBillTarget(null)} />}
    {labelTarget && <LabelPrintDialog order={labelTarget} onClose={() => setLabelTarget(null)} />}
    {receiptTarget && <ReceiptDialog order={receiptTarget} onClose={() => setReceiptTarget(null)} onSave={saveReceipt} />}
    {deleteTarget && <ConfirmationModal title="Delete order?" body={`${deleteTarget.orderNumber} will be removed from the order list.`} confirmLabel="Delete order" danger onCancel={() => setDeleteTarget(null)} onConfirm={confirmDelete} />}
  </div>;
}

function Payment({ order }: { order: Order }) {
  const dueAmount = Math.max(0, Number(order.grandTotal || 0) - Number(order.paidAmount || 0));
  return <div className="whitespace-nowrap text-[11px] leading-5 tabular-nums">
    <p className="text-slate-500">{money(order.paidAmount)} paid</p>
    <p className={`font-semibold ${dueAmount > 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(dueAmount)} due</p>
  </div>;
}
