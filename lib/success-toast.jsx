"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const EVENT_NAME = "laundryos:success-toast";
const STORAGE_KEY = "laundryos:success-toast";
const TOAST_DURATION = 4000;

export function showSuccessToast(message) {
  if (typeof window === "undefined") return;
  const toast = { message, expiresAt: Date.now() + TOAST_DURATION };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toast));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: toast }));
}

export function SuccessToastRegion() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timeout;
    function clearStoredToast() {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) window.sessionStorage.removeItem(STORAGE_KEY);
    }
    function show(toast) {
      if (!toast?.message || toast.expiresAt <= Date.now()) {
        clearStoredToast();
        return;
      }
      setMessage(toast.message);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        setMessage("");
        clearStoredToast();
      }, Math.max(0, toast.expiresAt - Date.now()));
    }
    function handleToast(event) { show(event.detail); }
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { show(JSON.parse(stored)); } catch { clearStoredToast(); }
    }
    window.addEventListener(EVENT_NAME, handleToast);
    return () => {
      window.removeEventListener(EVENT_NAME, handleToast);
      window.clearTimeout(timeout);
    };
  }, []);

  if (!message) return null;
  return <div className="fixed left-1/2 top-4 z-[60] w-[min(calc(100vw-1.5rem),24rem)] -translate-x-1/2" role="status" aria-live="polite">
    <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-white shadow-2xl sm:px-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-300 sm:size-9">
        <CheckCircle2 className="size-4 sm:size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">Success</p>
        <p className="mt-0.5 text-xs font-medium text-slate-100 sm:text-sm">{message}</p>
      </div>
      <button type="button" onClick={() => setMessage("")} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Dismiss success message"><X className="size-4" /></button>
    </div>
  </div>;
}
