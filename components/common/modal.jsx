"use client";

import { forwardRef } from "react";
import { AlertTriangle, X } from "lucide-react";

const overlay = "fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:grid sm:place-items-center sm:p-4";
const surface = "mx-auto my-0 flex max-h-[calc(100dvh-1.5rem)] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 sm:my-auto sm:max-h-[calc(100dvh-2rem)]";

export function ModalFrame({ children, className = "", label, labelledBy }) {
  return <div className={overlay} role="dialog" aria-modal="true" aria-label={label} aria-labelledby={labelledBy}>
    <div className={`${surface} ${className}`}>{children}</div>
  </div>;
}

export const ModalDialog = forwardRef(function ModalDialog({ children, className = "", ...props }, ref) {
  return <dialog ref={ref} {...props} className={`order-action-modal fixed inset-0 m-auto w-[calc(100%-1.5rem)] max-w-3xl overflow-hidden bg-white p-0 text-slate-900 sm:w-[calc(100%-2rem)] ${className}`}>{children}</dialog>;
});

export function ModalHeader({ title, subtitle, onClose, closeLabel = "Close dialog", children }) {
  return <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
    <div className="min-w-0">{title ? <h2 className="text-sm font-bold text-slate-900 sm:text-base">{title}</h2> : null}{subtitle ? <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{subtitle}</p> : null}{children}</div>
    {onClose ? <button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:size-8" aria-label={closeLabel}><X size={16} /></button> : null}
  </div>;
}

export function ModalFooter({ children, className = "" }) {
  return <div className={`flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4 ${className}`}>{children}</div>;
}

export function ConfirmationModal({ title, body, confirmLabel = "Confirm", onCancel, onConfirm, danger = false }) {
  return <ModalFrame labelledBy="confirmation-title" className="max-w-md">
    <ModalHeader onClose={onCancel} closeLabel="Close confirmation"><div className="flex items-start gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${danger ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-700"}`}><AlertTriangle size={18} /></span><div><h2 id="confirmation-title" className="text-sm font-bold text-slate-900 sm:text-base">{title}</h2><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{body}</p></div></div></ModalHeader>
    <ModalFooter><button type="button" onClick={onCancel} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm">Cancel</button><button type="button" onClick={onConfirm} className={`h-9 rounded-lg px-3 text-xs font-semibold text-white sm:text-sm ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-slate-900 hover:bg-slate-800"}`}>{confirmLabel}</button></ModalFooter>
  </ModalFrame>;
}
