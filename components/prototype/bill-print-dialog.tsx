"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";

type Item = {
  rowId: string;
  itemName: string;
  shortCode?: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
};

type Order = {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  deliveryDate: string;
  deliveryTimeSlot: string;
  createdAt?: string;
  subTotal: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  items: Item[];
};

const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

export default function BillPrintDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const balance = Math.max(0, Number(order.grandTotal || 0) - Number(order.paidAmount || 0));

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  function printBill() {
    dialog.current?.close();
    window.print();
    dialog.current?.showModal();
  }

  return createPortal(
    <div id="laundry-bill-print-root">
      <style>{`
        #laundry-bill-print-root .bill-output { display: none; }
        @media print {
          @page { size: auto; margin: 12mm; }
          body > :not(#laundry-bill-print-root) { display: none !important; }
          body { margin: 0 !important; background: white !important; }
          #laundry-bill-print-root dialog { display: none !important; }
          #laundry-bill-print-root .bill-output { display: block; color: black; font: 11pt Arial, sans-serif; }
          #laundry-bill-print-root .bill-output table { width: 100%; border-collapse: collapse; }
          #laundry-bill-print-root .bill-output th, #laundry-bill-print-root .bill-output td { border-bottom: 1px solid #d4d4d8; padding: 8px 0; text-align: left; }
          #laundry-bill-print-root .bill-output .amount { text-align: right; }
        }
      `}</style>
      <dialog ref={dialog} onCancel={onClose} aria-labelledby="print-bill-title" className="fixed inset-0 m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl overflow-auto rounded-lg border border-zinc-200 bg-white p-0!important text-zinc-950 shadow-xl backdrop:bg-black/50">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 id="print-bill-title" className="text-lg font-bold">Print bill</h2>
            <p className="text-sm text-zinc-500">{order.orderNumber}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close print bill" className="rounded-lg p-2 hover:bg-zinc-100"><X size={20} /></button>
        </div>
        <Bill order={order} balance={balance} className="p-6" />
        <div className="flex justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
          <button type="button" onClick={printBill} className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 font-semibold text-white"><Printer size={17} /> Print</button>
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-300 px-4 py-2 font-semibold">Cancel</button>
        </div>
      </dialog>
      <Bill order={order} balance={balance} className="bill-output" />
    </div>,
    document.body,
  );
}

function Bill({ order, balance, className }: { order: Order; balance: number; className: string }) {
  return (
    <article className={className}>
      <header className="flex justify-between gap-6 border-b border-zinc-200 pb-5">
        <div><h1 className="text-2xl font-black">LaundryOS</h1><p className="mt-1 text-sm text-zinc-500">Laundry service bill</p></div>
        <div className="text-right text-sm"><p className="font-bold">Invoice {order.orderNumber}</p><p>Created: {order.createdAt || order.deliveryDate}</p><p>Delivery: {order.deliveryDate} · {order.deliveryTimeSlot}</p></div>
      </header>
      <section className="grid gap-4 py-5 text-sm md:grid-cols-2">
        <div><p className="font-bold">Bill to</p><p>{order.customerName}</p>{order.customerPhone && <p>{order.customerPhone}</p>}{order.customerEmail && <p>{order.customerEmail}</p>}{order.customerAddress && <p>{order.customerAddress}</p>}</div>
        <div className="md:text-right"><p className="font-bold">Payment</p><p>Paid: {formatMoney(order.paidAmount)}</p><p>Balance: {formatMoney(balance)}</p></div>
      </section>
      <table className="w-full text-sm">
        <thead className="border-y border-zinc-200 text-left text-xs uppercase text-zinc-500"><tr><th className="py-3">Item</th><th className="py-3 text-right">Qty</th><th className="py-3 text-right">Rate</th><th className="py-3 text-right">Amount</th></tr></thead>
        <tbody>{order.items.map((item) => <tr key={item.rowId} className="border-b border-zinc-100"><td className="py-3 font-medium">{item.itemName}{item.shortCode ? ` (${item.shortCode})` : ""}</td><td className="py-3 text-right">{item.quantity}</td><td className="py-3 text-right">{formatMoney(item.unitPrice)}</td><td className="py-3 text-right">{formatMoney(item.itemTotal)}</td></tr>)}</tbody>
      </table>
      <section className="ml-auto mt-5 max-w-xs space-y-2 text-sm">
        <p className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subTotal)}</span></p>
        <p className="flex justify-between"><span>Discount</span><span>{formatMoney(order.discount)}</span></p>
        <p className="flex justify-between border-t border-zinc-300 pt-2 text-base font-black"><span>Grand total</span><span>{formatMoney(order.grandTotal)}</span></p>
      </section>
    </article>
  );
}
