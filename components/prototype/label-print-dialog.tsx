"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";

type Item = { rowId: string; itemName: string; shortCode?: string; quantity: number; itemCount?: number; unitType?: string };
type Order = { orderNumber: string; customerName: string; createdAt?: string; totalItemQuantity: number; items: Item[] };

export default function LabelPrintDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copies, setCopies] = useState(() => order.items.map(item => String(item.itemCount ?? Math.ceil(Number(item.quantity)))));
  const counts = copies.map(Number);
  const valid = copies.every((value, index) => value.trim() !== "" && Number.isSafeInteger(counts[index]) && counts[index] >= 0 && counts[index] <= 500);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const canPrint = valid && total > 0 && total <= 1000;
  const date = order.createdAt ? new Date(`${order.createdAt.slice(0, 10)}T12:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "";

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function printLabels() {
    // Close the native dialog before printing so its top layer cannot obscure labels.
    dialog.current?.close();
    window.print();
    dialog.current?.showModal();
  }

  return createPortal(
    <div id="laundry-label-print-root">
      <style>{`
        #laundry-label-print-root .label-output { display: none; }
        @media print {
          @page { size: auto; margin: 5mm; }
          body > :not(#laundry-label-print-root) { display: none !important; }
          body { margin: 0 !important; background: white !important; }
          #laundry-label-print-root dialog { display: none !important; }
          #laundry-label-print-root .label-output { display: block; width: 58mm; color: black; font: bold 10pt "Times New Roman", serif; }
          #laundry-label-print-root .garment-label { padding: 4mm 2mm; text-align: center; break-inside: avoid; page-break-inside: avoid; border-bottom: 1px dotted black; }
          #laundry-label-print-root .garment-label p { margin: 0 0 3mm; }
          #laundry-label-print-root .service-code { display: inline-block; border: 1px solid black; padding: 1mm; }
        }
      `}</style>
      <dialog ref={dialog} onCancel={onClose} aria-labelledby="print-label-title" className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-auto rounded-lg border border-zinc-200 bg-white p-0 text-zinc-950 shadow-xl backdrop:bg-black/50">
        <div className="inline-flex items-center gap-2 border-b border-zinc-200 px-5 py-4">
          <div><h2 id="print-label-title" className="text-lg font-bold">Print label</h2><p className="text-sm text-zinc-500">{order.orderNumber} · {order.customerName}</p></div>
          <button type="button" onClick={onClose} aria-label="Close print labels" className="rounded-lg p-2 hover:bg-zinc-100"><X size={20} /></button>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500"><tr><th className="p-3">#</th><th className="p-3">Item name</th><th className="p-3">Qty</th><th className="p-3">Copies</th></tr></thead>
              <tbody>{order.items.map((item, index) => <tr key={item.rowId} className="border-b border-zinc-100 even:bg-cyan-50/50">
                <td className="p-3">{index + 1}</td><td className="p-3 font-semibold">{item.itemName}{item.shortCode ? ` (${item.shortCode})` : ""}</td>
                <td className="whitespace-nowrap p-3">{item.quantity} {item.unitType === "Kilogram" ? "kg" : "pcs"}</td>
                <td className="p-3"><input autoFocus={index === 0} aria-label={`Copies for ${item.itemName}, row ${index + 1}`} type="number" min="0" max="500" step="1" value={copies[index]} onChange={event => setCopies(current => current.map((value, row) => row === index ? event.target.value : value))} className="w-24 rounded border border-zinc-300 px-3 py-2 focus:outline-cyan-600" /></td>
              </tr>)}</tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-zinc-500">Set copies to 0 to skip an item. Copies default to the garment label count.</p>
          {!canPrint && <p role="alert" className="mt-2 text-sm text-rose-700">Choose whole numbers from 0 to 500 per item, with 1–1,000 labels in total.</p>}
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <span className="mr-auto text-sm text-zinc-600">{valid ? total : 0} labels</span>
          <button type="button" onClick={printLabels} disabled={!canPrint} className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 font-semibold text-white disabled:opacity-40"><Printer size={17} /> Print</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-2 font-semibold">Cancel</button>
        </div>
      </dialog>
      <div className="label-output" aria-hidden="true">{canPrint && order.items.flatMap((item, index) => Array.from({ length: counts[index] }, (_, copy) => (
        <article key={`${item.rowId}-${copy}`} className="garment-label">
          <p>{order.customerName}</p><p>#{order.orderNumber}</p>{date && <p>{date}</p>}
          {item.shortCode && <p><span className="service-code">{item.shortCode}</span></p>}
          <p>{item.itemName}{item.shortCode ? ` (${item.shortCode})` : ""}</p>
          <p>TQ {order.totalItemQuantity}</p><p>IQ {Number(item.quantity).toFixed(2)}</p>
        </article>
      )))}</div>
    </div>, document.body,
  );
}
