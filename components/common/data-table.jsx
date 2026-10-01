"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

/**
 * Shared application data table. Pages own their filtering, sorting, paging,
 * permissions, and API calls; this component only renders their supplied rows.
 */
export default function DataTable({
  columns,
  rows,
  rowKey,
  emptyMessage = "No records found.",
  minWidth = "",
  className = "",
  sort = null,
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm" style={minWidth ? { minWidth } : undefined}>
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const sortable = Boolean(column.sortable && sort?.onChange);
              return <th key={column.key} scope="col" className={`px-4 py-3 font-bold ${column.headerClassName || ""}`}>
                {sortable ? <button type="button" onClick={() => sort.onChange(column.key)} className="inline-flex items-center gap-1 hover:text-zinc-950">
                  {column.label}{active ? (sort.direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : null}
                </button> : column.label}
              </th>;
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 bg-white">
          {rows.length ? rows.map((row, index) => <tr key={rowKey(row, index)}>
            {columns.map((column) => <td key={column.key} className={`px-4 py-4 align-middle ${column.cellClassName || ""}`}>{column.render(row, index)}</td>)}
          </tr>) : <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-zinc-500">{emptyMessage}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function TableActionButton({ label, onClick, children, danger = false, disabled = false }) {
  return <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label} className={`inline-flex size-9 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "text-rose-600 hover:bg-rose-50" : "text-zinc-600 hover:bg-zinc-100"}`}>{children}</button>;
}
