"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import "./order-modal-theme.css";

export default function ReceiptDialog({ order, onClose, onSave }: { order: { orderNumber: string; grandTotal: number; paidAmount: number }; onClose: () => void; onSave: (values: { amount: number; method: string; note: string }) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const balance = Math.max(0, Number(order.grandTotal) - Number(order.paidAmount));
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > balance) { setError(`Enter an amount between 0.01 and ${balance.toFixed(2)}.`); return; }
    setSaving(true); setError("");
    try { await onSave({ amount: value, method, note }); } catch (issue) { setError(issue instanceof Error ? issue.message : "Could not save receipt."); setSaving(false); }
  }
  const input = "mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500";
  return <dialog ref={dialog} onCancel={onClose} className="order-action-modal fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md bg-white p-0"><form onSubmit={submit}>
    <div className="modal-header flex items-center justify-between border-b"><div><h2 className="modal-title">Record payment</h2><p className="modal-subtitle mt-1">{order.orderNumber} · Balance: ₹{balance.toFixed(2)}</p></div><button type="button" onClick={onClose} aria-label="Close receipt" className="modal-close"><X size={18} /></button></div>
    <fieldset disabled={saving} className="space-y-4 p-5"><label className="block text-sm font-semibold">Amount<input autoFocus className={input} type="number" min="0.01" max={balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label><label className="block text-sm font-semibold">Payment method<select className={input} value={method} onChange={(e) => setMethod(e.target.value)}><option>Cash</option><option>Card</option><option>UPI</option><option>Online</option></select></label><label className="block text-sm font-semibold">Note<input className={input} value={note} onChange={(e) => setNote(e.target.value)} /></label>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<div className="flex gap-3"><button className="modal-primary px-4 font-semibold">{saving ? "Saving" : "Save receipt"}</button><button type="button" onClick={onClose} className="modal-secondary px-4 font-semibold">Cancel</button></div></fieldset>
  </form></dialog>;
}
