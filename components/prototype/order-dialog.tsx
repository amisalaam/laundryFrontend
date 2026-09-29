"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { errorMessage, listSlots, type Order, type Slot } from "@/services/order-service";

export type Action = "process" | "edit" | "discount" | "cancel" | "delete";
const input = "mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
const button = "rounded-lg px-5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-cyan-500 disabled:opacity-50";
export default function OrderDialog({ order, action, onClose, onSave }: {
  order: Order; action: Action; onClose: () => void;
  onSave: (values: Record<string, unknown>) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotError, setSlotError] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(action === "process" || action === "edit");
  const [slotAttempt, setSlotAttempt] = useState(0);
  const [form, setForm] = useState({ deliveryDate: order.deliveryDate, deliveryTimeSlot: order.deliveryTimeSlot,
    customerComment: order.customerComment || "", otherComment: order.otherComment || "", status: "",
    discount: String(order.discount), items: order.items.map((item) => ({ ...item })) });
  const title = { process: "Process Order", edit: "Edit Order", discount: "Cash Discount", cancel: "Cancel Order", delete: "Delete Order" }[action];
  const delivery = action === "process" || action === "edit";
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => {
    if (!delivery) return;
    let active = true;
    listSlots(order.laundryId).then((data) => {
      if (active) { setSlots(data); setSlotError(""); }
    }).catch((issue) => {
      if (active) setSlotError(errorMessage(issue));
    }).finally(() => { if (active) setSlotsLoading(false); });
    return () => { active = false; };
  }, [delivery, order.laundryId, slotAttempt]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (action === "process" && form.status === "Cancelled" && !window.confirm(`Cancel ${order.orderNumber}?`)) return;
    setBusy(true); setError("");
    try {
      const values: Record<string, unknown> = {};
      if (delivery) Object.assign(values, { deliveryDate: form.deliveryDate, deliveryTimeSlot: form.deliveryTimeSlot,
        customerComment: form.customerComment, otherComment: form.otherComment });
      if (action === "process") values.status = form.status;
      if (action === "edit") values.items = form.items.map(({ rowId, quantity, unitPrice, itemCount }) => ({ rowId, quantity, unitPrice, itemCount }));
      if (action === "discount") values.discount = form.discount;
      if (action === "cancel") values.status = "Cancelled";
      await onSave(values);
    } catch (issue) { setError(errorMessage(issue)); setBusy(false); }
  }
  const slotLabels = Array.from(new Set([order.deliveryTimeSlot, ...slots.filter((slot) => slot.status === "Active").map((slot) => slot.label)].filter(Boolean)));
  return <dialog ref={dialog} aria-labelledby="order-dialog-title" onCancel={(event) => { if (busy) event.preventDefault(); else onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-auto rounded-lg bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-950/40">
    <form onSubmit={submit}>
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
        <div><h2 id="order-dialog-title" className="text-lg font-bold">{title}</h2><p className="text-sm text-zinc-500">{order.orderNumber}</p></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 hover:bg-zinc-100 focus:ring-2 focus:ring-cyan-500"><X size={20} /></button>
      </div>
      <fieldset disabled={busy} className="space-y-5 p-6">
        {delivery && <>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">Delivery Date<input autoFocus required type="date" value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} className={input} /></label>
            <label className="text-sm font-semibold">Time Slot<select required disabled={slotsLoading} aria-busy={slotsLoading} value={form.deliveryTimeSlot} onChange={(e) => setForm({ ...form, deliveryTimeSlot: e.target.value })} className={input}><option value="">{slotsLoading ? "Loading time slots…" : "Choose time slot"}</option>{slotLabels.map((slot) => <option key={slot}>{slot}</option>)}</select></label>
          </div>
          {slotsLoading && <p role="status" className="text-sm text-zinc-500">Loading time slots…</p>}
          {slotError && <div role="alert" className="text-sm text-amber-700">Unable to load time slots: {slotError} <button type="button" disabled={slotsLoading} className="underline" onClick={() => { setSlotsLoading(true); setSlotAttempt((value) => value + 1); }}>Retry</button></div>}
          {!slotsLoading && !slotError && !slots.some((slot) => slot.status === "Active") && <p role="status" className="text-sm text-amber-700">No active delivery slots are configured. Add or activate a slot in Settings → Time Slots. The order’s current slot can still be kept.</p>}
          <label className="block text-sm font-semibold">Customer Comment<textarea maxLength={5000} rows={3} className={input} value={form.customerComment} onChange={(e) => setForm({ ...form, customerComment: e.target.value })} /></label>
          <label className="block text-sm font-semibold">Other Comment<textarea maxLength={5000} rows={3} className={input} value={form.otherComment} onChange={(e) => setForm({ ...form, otherComment: e.target.value })} /></label>
        </>}
        {action === "process" && <fieldset><legend className="mb-2 text-sm font-semibold">Status</legend><div className="flex gap-6">
          {[{ label: "Approve", value: "Processing" }, { label: "Cancel", value: "Cancelled" }].map((choice) => <label key={choice.value} className="flex items-center gap-2"><input required type="radio" name="process-status" value={choice.value} checked={form.status === choice.value} onChange={(e) => setForm({ ...form, status: e.target.value })} />{choice.label}</label>)}
        </div></fieldset>}
        {action === "edit" && <div className="space-y-4"><h3 className="font-semibold">Order items</h3>{form.items.map((item, index) => <div key={item.rowId} className="rounded-lg border border-zinc-200 p-3">
          <p className="mb-2 font-semibold">{item.itemName}</p><div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{(["quantity", "unitPrice", "itemCount"] as const).map((key) => <label key={key} className="text-sm">{{ quantity: "Quantity", unitPrice: "Unit price", itemCount: "Label count" }[key]}<input required type="number" min={key === "unitPrice" ? 0 : key === "quantity" ? 0.01 : 1} step={key === "itemCount" ? 1 : 0.01} value={item[key]} className={input} onChange={(e) => setForm({ ...form, items: form.items.map((row, i) => i === index ? { ...row, [key]: Number(e.target.value) } : row) })} /></label>)}</div>
        </div>)}</div>}
        {action === "discount" && <><p className="text-sm text-zinc-600">Update the total cash discount. It cannot reduce the order total below the amount already paid.</p><label className="block text-sm font-semibold">Cash Discount<input autoFocus required type="number" min="0" max={Math.max(0, order.subTotal - order.paidAmount)} step="0.01" className={input} value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></label></>}
        {action === "cancel" && <p>Cancel this order and move it to the Cancelled tab?</p>}
        {action === "delete" && <p>Remove this pending order from the order list? Its stored record and payment history will be retained.</p>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="flex gap-3"><button type="submit" className={`${button} ${action === "delete" || action === "cancel" ? "bg-rose-600" : "bg-zinc-950"} text-white`}>{busy ? "Saving…" : action === "delete" ? "Delete Order" : action === "cancel" ? "Cancel Order" : "Save"}</button><button type="button" onClick={onClose} className={`${button} border border-zinc-200`}>{action === "cancel" || action === "delete" ? "Keep Order" : "Cancel"}</button></div>
      </fieldset>
    </form>
  </dialog>;
}
