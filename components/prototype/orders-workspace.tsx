"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, PackageCheck, Plus, Printer, Search, Tag, Truck, WalletCards } from "lucide-react";
import { createReceipt, deleteOrder, errorMessage, listOrders, updateOrder, type Order } from "@/services/order-service";
import OrderDialog, { type Action } from "./order-dialog";
import BillPrintDialog from "./bill-print-dialog";
import LabelPrintDialog from "./label-print-dialog";
import ReceiptDialog from "./receipt-dialog";

const tabs = ["Pending", "Under Processing", "Cancelled"] as const;
type Tab = typeof tabs[number];
function matches(order: Order, tab: Tab) { return tab === "Under Processing" ? order.status === "Processing" : order.status === tab; }
const money = (value: number) => `₹${Number(value || 0).toFixed(2)}`;
const iconButton = "inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500";

function Actions({ order, onAction, onBill, onLabels, onReceipt, onMoveToDelivery }: { order: Order; onAction: (action: Action) => void; onBill: () => void; onLabels: () => void; onReceipt: () => void; onMoveToDelivery: () => void }) {
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
  const item = "block w-full rounded-md px-3 py-2.5 text-left text-sm hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none";
  return <div className="flex items-center justify-start gap-1">
    {pending && <button type="button" onClick={() => onAction("process")} className={iconButton} title="Process Order" aria-label={`Process order ${order.orderNumber}`}><PackageCheck size={19} className="shrink-0" /></button>}
    {processing && <button type="button" onClick={onMoveToDelivery} className={iconButton} title="Move to Delivery" aria-label={`Move ${order.orderNumber} to delivery`}><Truck size={19} className="shrink-0" /></button>}
    <button type="button" onClick={onBill} className={iconButton} title="Print bill" aria-label={`Print bill for ${order.orderNumber}`}><Printer size={19} className="shrink-0" /></button>
    <button type="button" onClick={onLabels} className={iconButton} title="Print labels" aria-label={`Print labels for ${order.orderNumber}`}><Tag size={19} className="shrink-0" /></button>
    {order.paymentStatus !== "Paid" && <button type="button" onClick={onReceipt} className={iconButton} title="Receipt" aria-label={`Receipt for ${order.orderNumber}`}><WalletCards size={19} className="shrink-0" /></button>}
    <button ref={trigger} type="button" className={iconButton} title="Order actions" aria-label={`Actions for ${order.orderNumber}`} aria-haspopup="menu" aria-expanded={!!position} onClick={() => {
      if (position) { dismiss(); return; }
      const rect = trigger.current!.getBoundingClientRect();
      const height = pending ? 222 : cancelled ? 54 : 96;
      setPosition({ left: Math.max(8, Math.min(rect.right - 192, window.innerWidth - 200)), top: rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom + 4 });
    }}><MoreVertical size={20} className="shrink-0" /></button>
    {position && createPortal(<div ref={menu} role="menu" aria-label={`Order actions for ${order.orderNumber}`} style={position} className="fixed z-40 w-48 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl" onKeyDown={(event) => {
      if (event.key === "Escape" || event.key === "Tab") { if (event.key === "Escape") event.preventDefault(); dismiss(); }
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault(); const items = Array.from(menu.current!.querySelectorAll<HTMLElement>('[role="menuitem"]'));
        const current = items.indexOf(document.activeElement as HTMLElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }
    }}>
      {pending && <><button role="menuitem" className={item} onClick={() => select("cancel")}>Cancel Order</button><button role="menuitem" className={item} onClick={() => select("edit")}>Edit Order</button><button role="menuitem" className={`${item} text-rose-700`} onClick={() => select("delete")}>Delete Order</button></>}
      <Link role="menuitem" className={item} href={`/branch/${order.branchId}/orders/${order.id}`} onClick={dismiss}>View Order</Link>
      {!cancelled && <button role="menuitem" className={item} onClick={() => select("discount")}>Cash Discount</button>}
    </div>, document.body)}
  </div>;
}

export default function OrdersWorkspace({ branchId }: { branchId: string }) {
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
  function actions(order: Order) { return <Actions order={order} onAction={(action) => setTarget({ order, action })} onBill={() => setBillTarget(order)} onLabels={() => setLabelTarget(order)} onReceipt={() => setReceiptTarget(order)} onMoveToDelivery={() => moveToDelivery(order)} />; }
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2"><Search size={18} className="shrink-0 text-zinc-400" /><span className="sr-only">Search orders</span><input className="min-w-0 w-full text-sm outline-none" placeholder="Search order, customer, phone" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <Link href={`/branch/${branchId}/orders/create`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={17} />Create order</Link>
    </div>
    <div role="tablist" aria-label="Order status" className="flex gap-1 overflow-x-auto border-b border-zinc-200" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault(); const index = tabs.indexOf(tab); const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : -1) + 3) % 3;
      setTab(tabs[next]); document.getElementById(`orders-tab-${next}`)?.focus();
    }}>{tabs.map((label, index) => <button type="button" role="tab" key={label} id={`orders-tab-${index}`} aria-selected={tab === label} aria-controls="orders-panel" tabIndex={tab === label ? 0 : -1} onClick={() => setTab(label)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500 ${tab === label ? "border-cyan-600 text-cyan-700" : "border-transparent text-zinc-500 hover:text-zinc-900"}`}>{label}<span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{orders.filter((order) => matches(order, label)).length}</span></button>)}</div>
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {error && <div role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error} <button className="ml-2 underline" onClick={() => { setLoading(true); setReload((value) => value + 1); }}>Retry</button></div>}
    <div id="orders-panel" role="tabpanel" aria-labelledby={`orders-tab-${tabs.indexOf(tab)}`} aria-busy={loading} className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      {loading ? <p className="p-6 text-sm text-zinc-500">Loading orders…</p> : <>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr>{["Order", "Customer", "Delivery", "Items", "Grand total", "Payment", "Actions"].map((heading) => <th key={heading} scope="col" className="px-4 py-3">{heading}</th>)}</tr></thead>
          <tbody className="divide-y divide-zinc-200">{visible.map((order) => <tr key={order.id}>
            <td className="px-4 py-4"><Link className="font-bold text-cyan-700" href={`/branch/${branchId}/orders/${order.id}`}>{order.orderNumber}</Link></td>
            <td className="px-4 py-4"><p className="font-semibold">{order.customerName}</p><p className="text-zinc-500">{order.customerPhone}</p></td>
            <td className="px-4 py-4 text-zinc-600">{order.deliveryDate}<br />{order.deliveryTimeSlot}</td>
            <td className="px-4 py-4 text-zinc-600">{order.itemCount} labels<br />Qty {order.totalItemQuantity}</td>
            <td className="px-4 py-4 font-bold">{money(order.grandTotal)}</td>
            <td className="px-4 py-4"><Payment order={order} /></td><td className="px-4 py-4">{actions(order)}</td>
          </tr>)}</tbody></table></div>
        <div className="grid gap-3 p-3 lg:hidden">{visible.map((order) => <div key={order.id} className="rounded-lg border border-zinc-200 p-4"><div className="flex items-start justify-between gap-2"><div><Link className="font-bold text-cyan-700" href={`/branch/${branchId}/orders/${order.id}`}>{order.orderNumber}</Link><p className="text-sm text-zinc-600">{order.customerName} · {order.customerPhone}</p></div>{actions(order)}</div><div className="mt-3 space-y-2 text-sm text-zinc-600"><p>Delivery: {order.deliveryDate}, {order.deliveryTimeSlot}</p><p>Labels: {order.itemCount} · Quantity: {order.totalItemQuantity}</p><p className="font-bold text-zinc-950">Grand total: {money(order.grandTotal)}</p><Payment order={order} /></div></div>)}</div>
        {!visible.length && !error && <p className="p-8 text-center text-sm text-zinc-500">{query ? "No matching orders." : `No ${tab.toLowerCase()} orders.`}</p>}
      </>}
    </div>
    {target && <OrderDialog key={`${target.order.id}-${target.action}`} {...target} onClose={() => setTarget(null)} onSave={save} />}
    {billTarget && <BillPrintDialog order={billTarget} onClose={() => setBillTarget(null)} />}
    {labelTarget && <LabelPrintDialog order={labelTarget} onClose={() => setLabelTarget(null)} />}
    {receiptTarget && <ReceiptDialog order={receiptTarget} onClose={() => setReceiptTarget(null)} onSave={saveReceipt} />}
  </div>;
}

function Payment({ order }: { order: Order }) {
  const tone = order.paymentStatus === "Paid" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : order.paymentStatus === "Partial" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700";
  const dueAmount = Math.max(0, Number(order.grandTotal || 0) - Number(order.paidAmount || 0));
  return <><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>{order.paymentStatus}</span><p className="mt-1 text-xs text-zinc-500">{money(order.paidAmount)} paid</p><p className={`text-xs font-semibold ${dueAmount > 0 ? "text-rose-700" : "text-emerald-700"}`}>{money(dueAmount)} due</p></>;
}
