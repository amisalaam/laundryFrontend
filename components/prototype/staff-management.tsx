/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import DataTable, { TableActionButton } from "@/components/common/data-table";
import { api } from "@/lib/api";
import { getBranches } from "@/lib/storage";
import { can, getSession } from "@/lib/auth";
import { showSuccessToast } from "@/lib/success-toast";

const menus = [["orders", "Orders"], ["customers", "Customers"], ["delivery", "Delivery"], ["branch", "Branch"], ["item", "Item"], ["item_group", "Item Group"], ["time_slot", "Time Slot"], ["staff_management", "Staff Management"]] as const;
const actions = ["view", "add", "edit", "delete"] as const;
const blank = () => Object.fromEntries(menus.map(([key]) => [key, Object.fromEntries(actions.map((action) => [action, false]))]));

export default function StaffManagement() {
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<any>(null);

  async function load() {
    try {
      const currentSession = await getSession();
      const branchId = currentSession?.currentBranchId;
      const [staffData, nextBranches] = await Promise.all([api.get(`/staff/${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`), getBranches()]);
      setStaff(staffData.staff || []); setBranches(nextBranches); setSession(currentSession); setError("");
    } catch (issue: any) { setError(issue.message || "Could not load staff"); }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form) return;
    try {
      const body = { name: form.name, email: form.email, phone: form.phone, branchId: form.branchId, permissions: form.permissions, ...(!form.id ? { password: form.password } : {}) };
      await (form.id ? api.patch(`/staff/${form.id}/`, body) : api.post("/staff/", body));
      await load(); setForm(null); showSuccessToast(form.id ? "Staff changes saved." : "Staff member created.");
    } catch (issue: any) { setError(issue.message || "Could not save staff"); }
  }

  async function remove(member: any) {
    if (!window.confirm(`Deactivate ${member.name}?`)) return;
    try { await api.del(`/staff/${member.id}/`); setStaff((rows) => rows.filter((row) => row.id !== member.id)); showSuccessToast("Staff member deleted."); }
    catch (issue: any) { setError(issue.message || "Could not remove staff"); }
  }

  const visible = staff.filter((member) => [member.name, member.email, member.branchName].join(" ").toLowerCase().includes(query.toLowerCase()));
  const columns = [
    { key: "staff", label: "Staff", cellClassName: "min-w-52", render: (member: any) => <><p className="font-semibold text-slate-900">{member.name}</p><p className="mt-0.5 text-xs text-slate-500">{member.email}</p></> },
    { key: "branch", label: "Branch", cellClassName: "whitespace-nowrap text-slate-600", render: (member: any) => member.branchName || "—" },
    { key: "actions", label: "Actions", headerClassName: "w-24", cellClassName: "w-24 whitespace-nowrap", render: (member: any) => <div className="flex items-center gap-1">{can(session, "staff_management.edit") && <TableActionButton label={`Edit ${member.name}`} onClick={() => setForm({ ...member, password: "", permissions: member.permissions || blank() })}><Pencil size={15} /></TableActionButton>}{can(session, "staff_management.delete") && <TableActionButton label={`Delete ${member.name}`} onClick={() => remove(member)}><Trash2 size={15} /></TableActionButton>}</div> },
  ];

  return <div className="staff-workspace space-y-4 text-slate-900">
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Users size={20} /></span><div className="min-w-0"><h2 className="text-base font-bold tracking-tight"><span className="sm:hidden">Staff</span><span className="hidden sm:inline">Staff management</span></h2><p className="mt-0.5 max-w-36 text-xs text-slate-500 sm:max-w-none">Manage staff permissions.</p></div></div>{can(session, "staff_management.add") && <button type="button" onClick={() => setForm({ name: "", email: "", phone: "", password: "", branchId: branches[0]?.id || "", permissions: blank() })} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"><Plus size={16} />Create staff</button>}</div>
      <label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"><Search size={18} className="shrink-0 text-slate-400" /><span className="sr-only">Search staff</span><input className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search name, email, or branch" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" onClick={() => setQuery("")} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Clear</button>}</label>
    </section>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-semibold">Staff directory</h2><span className="text-xs tabular-nums text-slate-500">{visible.length} {visible.length === 1 ? "member" : "members"}</span></div><DataTable className="[&_table]:text-sm [&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_th]:px-3 [&_th]:py-3 [&_th]:text-xs [&_td]:px-3 [&_td]:py-3 [&_tbody]:divide-slate-100" columns={columns} rows={visible} rowKey={(member: any) => member.id} minWidth="620px" emptyMessage="No staff members found." /></section>
    {form && <StaffEditor form={form} branches={branches} onChange={setForm} onClose={() => setForm(null)} onSave={save} />}
  </div>;
}

function StaffEditor({ form, branches, onChange, onClose, onSave }: any) {
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:grid sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Staff editor">
    <div className="mx-auto my-0 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white sm:my-auto sm:max-h-[calc(100dvh-2rem)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4"><div><h2 className="text-sm font-bold text-slate-900 sm:text-base">{form.id ? "Edit" : "Create"} staff</h2><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">Set branch and permissions.</p></div><button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:size-8" aria-label="Close"><X size={16} /></button></div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"><div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4"><Field label="Name"><input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} /></Field><Field label="Email"><input disabled={!!form.id} value={form.email} onChange={(event) => onChange({ ...form, email: event.target.value })} /></Field>{!form.id && <Field label="Password"><input type="password" value={form.password} onChange={(event) => onChange({ ...form, password: event.target.value })} /></Field>}<Field label="Branch"><select value={form.branchId} onChange={(event) => onChange({ ...form, branchId: event.target.value })}>{branches.map((branch: any) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field></div>
        <fieldset className="mt-5 min-w-0 sm:mt-6"><legend className="text-xs font-semibold text-slate-900 sm:text-sm">Permissions</legend><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">Select allowed actions.</p><div className="mt-3 w-full max-w-full overflow-x-auto overscroll-x-contain touch-pan-x rounded-lg border border-slate-200"><table className="w-full min-w-[500px] text-left text-[11px] sm:min-w-[560px] sm:text-xs"><thead className="bg-slate-50 uppercase tracking-wide text-slate-500"><tr><th className="px-2.5 py-2 sm:px-3 sm:py-2.5">Workspace</th>{actions.map((action) => <th key={action} className="px-2.5 py-2 text-center capitalize sm:px-3 sm:py-2.5">{action}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{menus.map(([key, label]) => <tr key={key}><td className="px-2.5 py-2 font-medium text-slate-700 sm:px-3 sm:py-2.5">{label}</td>{actions.map((action) => <td key={action} className="px-2.5 py-2 text-center sm:px-3 sm:py-2.5"><input className="size-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-300 sm:size-4" type="checkbox" checked={!!form.permissions?.[key]?.[action]} onChange={(event) => onChange({ ...form, permissions: { ...form.permissions, [key]: { ...form.permissions[key], [action]: event.target.checked } } })} /></td>)}</tr>)}</tbody></table></div></fieldset>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4"><button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm">Cancel</button><button type="button" onClick={onSave} className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 sm:text-sm">Save staff</button></div>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid gap-1.5 text-[11px] font-semibold text-slate-700 sm:text-xs [&>input]:h-9 [&>input]:rounded-lg [&>input]:border [&>input]:border-slate-200 [&>input]:bg-slate-50 [&>input]:px-3 [&>input]:text-xs [&>input]:font-normal [&>input]:outline-none sm:[&>input]:h-10 sm:[&>input]:text-sm [&>select]:h-9 [&>select]:rounded-lg [&>select]:border [&>select]:border-slate-200 [&>select]:bg-slate-50 [&>select]:px-3 [&>select]:text-xs [&>select]:font-normal [&>select]:outline-none sm:[&>select]:h-10 sm:[&>select]:text-sm">{label}{children}</label>; }
