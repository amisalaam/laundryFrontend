"use client";

import Link from "next/link";
import "./create-order-theme.css";
import Image from "next/image";
import BillPrintDialog from "./bill-print-dialog";
import LabelPrintDialog from "./label-print-dialog";
import OrdersWorkspace from "./orders-workspace";
import DeliveryWorkspace from "./delivery-workspace";
import StaffManagement from "./staff-management";
import DataTable, { TableActionButton } from "@/components/common/data-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  DollarSign,
  Pencil,
  Eye,
  EyeOff,
  Factory,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  PackageCheck,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Truck,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { authenticate, can, getAccessibleBranches, getCachedSession, getSession, logout, refreshSession, setSession, updateCurrentBranch } from "@/lib/auth";
import {
  createBranch,
  createCustomer,
  deleteBranch,
  deleteCustomer,
  deleteItemGroup,
  deleteServiceItem,
  deleteTimeSlot,
  createItemGroup,
  createOrder,
  createPaymentReceipt,
  createServiceItem,
  createTimeSlot,
  getBranches,
  getCachedBranches,
  getCustomers,
  getItemGroups,
  getLaundries,
  getOrder,
  getOrders,
  getPaymentReceipts,
  getServiceItems,
  getTimeSlots,
  saveBranches,
  saveItemGroups,
  saveLaundries,
  saveServiceItems,
  saveTimeSlots,
  updateBranch,
  updateCustomer,
  updateItemGroup,
  updateServiceItem,
  updateTimeSlot,
} from "@/lib/storage";

const statusStyles = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Inactive: "border-zinc-200 bg-zinc-100 text-zinc-600",
  Draft: "border-amber-200 bg-amber-50 text-amber-700",
  Trial: "border-slate-200 bg-slate-50 text-slate-700",
  Ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Processing: "border-slate-200 bg-slate-50 text-slate-700",
  "In progress": "border-slate-200 bg-slate-50 text-slate-700",
  Approved: "border-indigo-200 bg-indigo-50 text-indigo-700",
  "Pending Delivery": "border-violet-200 bg-violet-50 text-violet-700",
  Delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  Completed: "border-zinc-200 bg-zinc-100 text-zinc-600",
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Partial: "border-amber-200 bg-amber-50 text-amber-700",
  Unpaid: "border-rose-200 bg-rose-50 text-rose-700",
};


const INITIAL_BRANCH_FORM = {
  name: "",
  code: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  openingTime: "08:00",
  closingTime: "20:00",
  manager: "",
  status: "Active",
};

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function getBranchPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const branchIndex = parts.indexOf("branch");
  return branchIndex >= 0 ? parts[branchIndex + 1] : "";
}

let clientIdCounter = 0;

function createClientId(prefix) {
  clientIdCounter += 1;
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${clientIdCounter}`;
}

function getApiErrorMessage(error, fallback = "The request could not be completed.") {
  return error?.message || fallback;
}

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Badge({ children, tone }) {
  return (
    <span className={classNames("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", statusStyles[tone] || statusStyles.Active)}>
      {children}
    </span>
  );
}

function Button({ children, variant = "primary", className = "", type = "button", ...props }) {
  const styles = {
    primary: "bg-zinc-950 text-white hover:bg-zinc-800",
    secondary: "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950",
  };
  return (
    <button
      type={type}
      className={classNames(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-60",
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-zinc-800">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}

function TextInput({ error, className = "", ...props }) {
  return (
    <input
      className={classNames(
        "h-11 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100",
        error ? "border-rose-300" : "border-zinc-200",
        className,
      )}
      {...props}
    />
  );
}

function SelectInput({ error, children, ...props }) {
  return (
    <select
      className={classNames(
        "h-11 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100",
        error ? "border-rose-300" : "border-zinc-200",
      )}
      {...props}
    >
      {children}
    </select>
  );
}

function CustomerCombobox({ customers, selectedCustomer, onSelect, error }) {
  const containerRef = useRef(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedLabel = selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.phone}` : "";
  const visibleCustomers = customers
    .filter((customer) => [customer.name, customer.phone, customer.email].join(" ").toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function chooseCustomer(customer) {
    onSelect(customer);
    setQuery(`${customer.name} · ${customer.phone}`);
    setIsOpen(false);
    setActiveIndex(0);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(visibleCustomers.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && isOpen && visibleCustomers[activeIndex]) {
      event.preventDefault();
      chooseCustomer(visibleCustomers[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="customer-combobox relative">
      <div className={classNames(
        "flex h-11 items-center gap-2 rounded-lg border bg-white px-3 transition focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100",
        error ? "border-rose-300" : "border-zinc-200",
      )}>
        <Search size={17} className="shrink-0 text-zinc-400" />
        <input
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="customer-options"
          aria-autocomplete="list"
          value={isOpen ? query : selectedLabel}
          onFocus={() => {
            setQuery("");
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            onSelect(null);
            setIsOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          placeholder="Search by name, phone, or email"
        />
        <ChevronDown size={16} className="shrink-0 text-zinc-400" />
      </div>
      {isOpen ? (
        <div id="customer-options" role="listbox" className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-xl">
          {visibleCustomers.map((customer, index) => (
            <button
              key={customer.id}
              type="button"
              role="option"
              aria-selected={selectedCustomer?.id === customer.id}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => chooseCustomer(customer)}
              className={classNames(
                "flex w-full items-center justify-between gap-4 rounded-md px-3 py-2.5 text-left",
                index === activeIndex ? "bg-slate-100" : "hover:bg-slate-50",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-zinc-950">{customer.name}</span>
                <span className="block truncate text-xs text-zinc-500">{customer.phone}{customer.email ? ` · ${customer.email}` : ""}</span>
              </span>
              {selectedCustomer?.id === customer.id ? <CheckCircle2 size={17} className="shrink-0 text-emerald-600" /> : null}
            </button>
          ))}
          {!visibleCustomers.length ? <p className="px-3 py-4 text-center text-sm text-zinc-500">No customers found.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{value}</p>{detail ? <p className="mt-1 text-xs font-medium text-slate-500">{detail}</p> : null}</div>
        <span className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700"><Icon size={19} /></span>
      </div>
    </div>
  );
}

function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center">
      <Sparkles className="mx-auto text-cyan-600" />
      <h2 className="mt-3 text-lg font-bold text-zinc-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function ConfirmModal({ title, body, confirmLabel = "Confirm", onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:grid sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-title">
      <div className="mx-auto my-0 w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white sm:my-auto">
        <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600 sm:size-10">
            <AlertTriangle size={16} className="sm:hidden" />
            <AlertTriangle size={20} className="hidden sm:block" />
          </span>
          <div className="min-w-0">
            <h2 id="confirmation-title" className="text-sm font-bold text-slate-900 sm:text-base">{title}</h2>
            <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{body}</p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4">
          <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm">Cancel</button>
          <button type="button" onClick={onConfirm} className="h-9 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 sm:text-sm">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ type }) {
  const router = useRouter();
  const isSuperAdmin = type === "super-admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const user = await authenticate(email, password, type);
      setSession(user);
      if (isSuperAdmin) {
        router.push("/super-admin/dashboard");
        return;
      }
      router.push("/home");
    } catch (error) {
      setError(getApiErrorMessage(error, "Those credentials were not accepted."));
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#cffafe,transparent_34%),linear-gradient(135deg,#f8fafc,#eef2ff)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[420px] items-center">
        <section className="rounded-lg border border-white/70 bg-white/90 p-6 shadow-xl shadow-cyan-950/10 backdrop-blur">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-zinc-950">{isSuperAdmin ? "Super Admin Login" : "Owner & Staff Login"}</h2>
            <p className="mt-1 text-sm text-zinc-500">Sign in with your LaundryOS account.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email">
              <TextInput value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </Field>
            <Field label="Password">
              <div className="relative">
                <TextInput value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} required className="pr-11" />
                <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
              Sign in
            </Button>
          </form>
          <Link href={isSuperAdmin ? "/login" : "/super-admin/login"} className="mt-5 inline-flex text-sm font-semibold text-cyan-700 hover:text-cyan-900">
            {isSuperAdmin ? "Go to owner and staff login" : "Go to super admin login"}
          </Link>
        </section>
      </div>
    </main>
  );
}

function useProtectedSession(expectedType) {
  const router = useRouter();
  const cachedSession = getCachedSession();
  const [session, setSessionState] = useState(cachedSession);
  const [isReady, setIsReady] = useState(Boolean(cachedSession));

  useEffect(() => {
    if (!session?.id) return undefined;
    let isMounted = true;
    async function refreshPermissions() {
      const latestSession = await refreshSession();
      if (!isMounted) return;
      if (!latestSession || latestSession.loginType !== expectedType) {
        router.replace(expectedType === "super-admin" ? "/super-admin/login" : "/login");
        return;
      }
      setSessionState(latestSession);
    }
    const timer = window.setInterval(refreshPermissions, 10000);
    return () => { isMounted = false; window.clearInterval(timer); };
  }, [expectedType, router, session?.id]);

  useEffect(() => {
    let isMounted = true;
    async function loadSession() {
      if (session?.loginType === expectedType) {
        setIsReady(true);
        return;
      }
      const savedSession = await getSession();
      if (!isMounted) return;
      if (!savedSession || savedSession.loginType !== expectedType) {
        router.replace(expectedType === "super-admin" ? "/super-admin/login" : "/login");
        return;
      }
      setSessionState(savedSession);
      setIsReady(true);
    }
    loadSession();
    return () => {
      isMounted = false;
    };
  }, [expectedType, router, session]);

  return { session, setSessionState, isReady };
}

function LoadingShell() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50">
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-5 py-4 text-sm font-semibold text-zinc-700 shadow-sm">
        <Loader2 className="animate-spin text-cyan-600" size={18} />
        Loading LaundryOS
      </div>
    </main>
  );
}

function ProfileDropdown({ session, branches = [] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const currentBranch = branches.find((branch) => branch.id === session?.currentBranchId);

  async function handleLogout() {
    await logout();
    router.push(session?.loginType === "super-admin" ? "/super-admin/login" : "/login");
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen((value) => !value)} className="flex h-12 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left">
        <span className="grid size-9 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-white">{session?.name?.slice(0, 1)}</span>
        <span className="hidden min-w-0 max-w-40 sm:block">
          <span className="block truncate text-sm font-bold text-zinc-950">{session?.name}</span>
          <span className="block truncate text-xs text-zinc-500">{session?.role}</span>
        </span>
        <ChevronDown size={16} className="text-zinc-500" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="font-bold text-zinc-950">{session?.name}</p>
            <p className="text-sm text-zinc-500">{session?.role}</p>
            <p className="mt-2 text-xs font-semibold uppercase text-zinc-400">Current branch</p>
            <p className="text-sm text-zinc-700">{currentBranch?.name || "Platform wide"}</p>
          </div>
          {branches.length ? (
            <Link href="/home" className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
              <Store size={16} />
              Branch selection
            </Link>
          ) : null}
          <button onClick={handleLogout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}

const navigationHeaderHeight = "h-20";

function TopBar({ session, title, subtitle, branches, onMenu, hideMenu = false }) {
  return (
    <header className={classNames(navigationHeaderHeight, "app-topbar sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur")}>
      <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {!hideMenu ? <button className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden" onClick={onMenu} aria-label="Open navigation"><Menu size={21} /></button> : null}
          <div className="min-w-0"><h1 className="topbar-title truncate text-lg font-black text-slate-950">{title}</h1>{subtitle ? <p className="topbar-subtitle truncate text-sm text-slate-500">{subtitle}</p> : null}</div>
        </div>
        <div className="hidden h-12 min-w-0 max-w-lg flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 md:flex"><Search size={17} className="shrink-0 text-slate-400" /><input aria-label="Search orders, branches, customers" className="min-w-0 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" placeholder="Search orders, branches, customers" /></div>
        <div className="flex shrink-0 items-center gap-2"><ProfileDropdown session={session} branches={branches} /></div>
      </div>
    </header>
  );
}

function Sidebar({ links, isOpen, onClose }) {
  const pathname = usePathname();
  const content = <div className="app-sidebar flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-900">
    <div className={classNames(navigationHeaderHeight, "flex shrink-0 items-center justify-between border-b border-slate-200 px-5")}><Link href="/" onClick={onClose} className="group flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400"><span className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-900 transition-transform group-hover:scale-105"><Sparkles size={21} strokeWidth={2.5} /></span><span><span className="block text-[17px] font-extrabold tracking-tight text-slate-950">LaundryOS</span><span className="block text-xs font-medium text-slate-500">Multi-branch suite</span></span></Link><button className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 lg:hidden" onClick={onClose} aria-label="Close navigation"><X size={20} /></button></div>
    <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-6" aria-label="Main navigation">{links.map((link) => { if (link.type === "heading") return <p key={link.label} className="px-3 pb-2 pt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 first:pt-2">{link.label}</p>; const isActive = pathname === link.href; return <Link key={link.href} href={link.href} onClick={onClose} className={classNames("group relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400", link.isChild ? "ml-4 py-2.5 text-xs" : "", isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950")}><span style={isActive ? undefined : { backgroundColor: "#f1f5f9" }} className={classNames("grid size-8 shrink-0 place-items-center rounded-lg", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-900")}><link.icon size={17} strokeWidth={isActive ? 2.4 : 2} /></span><span className="min-w-0 truncate">{link.label}</span>{isActive ? <span className="ml-auto size-1.5 rounded-full bg-white" /> : null}</Link>; })}</nav>
    <div className="shrink-0 px-5 pb-4 pt-2"><div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-700">LaundryOS workspace</p><p className="mt-1 text-[11px] leading-4 text-slate-500">Operations and branch tools in one place.</p></div></div>
  </div>;
  return <><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{content}</aside>{isOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} aria-label="Close navigation overlay" /><aside className="relative h-full w-[min(20rem,88vw)]">{content}</aside></div> : null}</>;
}

function AppShell({ type, title, subtitle, children }) {
  const { session, setSessionState, isReady } = useProtectedSession(type);
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [branches, setBranchesState] = useState(() => getCachedBranches() || []);
  const isSettingsArea = type === "business" && pathname.startsWith("/settings");
  const isOwner = session?.role === "Laundry Owner";
  const settingsPermission = { "Branch Management": "branch.view", "Item Groups": "item_group.view", "Items": "item.view", "Time Slots": "time_slot.view" };
  const settingsLinks = [
    { href: "/settings/branches", label: "Branch Management", icon: Store },
    { href: "/settings/item-groups", label: "Item Groups", icon: Tag },
    { href: "/settings/items", label: "Items", icon: PackageCheck },
    { href: "/settings/time-slots", label: "Time Slots", icon: Clock3 },
  ];
  const visibleSettingsLinks = settingsLinks.filter((link) => isOwner || Boolean(settingsPermission[link.label] && session?.permissions?.includes(settingsPermission[link.label])));
  const links = type === "super-admin"
    ? [
        { href: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/super-admin/laundries", label: "Laundries", icon: Factory },
        { href: "/super-admin/laundries/create", label: "Create Laundry", icon: Plus },
      ]
    : isSettingsArea
      ? [
        { href: "/home", label: "Business Home", icon: Store },
        ...(visibleSettingsLinks.length ? [{ type: "heading", label: "Settings" }, ...visibleSettingsLinks] : []),
      ]
      : [
        { href: session?.currentBranchId ? `/branch/${session.currentBranchId}/dashboard` : "/home", label: "Dashboard", icon: LayoutDashboard },
        { type: "heading", label: "Operations" },
        { href: session?.currentBranchId ? `/branch/${session.currentBranchId}/orders` : "/home", label: "Orders", icon: ClipboardList },
        { href: session?.currentBranchId ? `/branch/${session.currentBranchId}/customers` : "/home", label: "Customers", icon: Users },
        { href: session?.currentBranchId ? `/branch/${session.currentBranchId}/delivery` : "/home", label: "Delivery", icon: Truck },
        { href: "/staff", label: "Staff Management", icon: Users },
      ].filter((link) => link.type === "heading" || isOwner || ({"Orders":"orders.view","Customers":"customers.view","Delivery":"delivery.view","Staff Management":"staff_management.view"}[link.label] && session?.permissions?.includes({"Orders":"orders.view","Customers":"customers.view","Delivery":"delivery.view","Staff Management":"staff_management.view"}[link.label])));

  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      if (!session || session.loginType !== "business") {
        setBranchesState([]);
        return;
      }
      const nextBranches = await getAccessibleBranches(session);
      if (isMounted) setBranchesState(nextBranches);
    }
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, [session]);

  if (!isReady) return <LoadingShell />;
  return (
    <div className="min-h-screen bg-white">
      <Sidebar links={links} isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className="lg:pl-64">
        <TopBar session={session} title={title} subtitle={subtitle} branches={branches} onMenu={() => setIsMenuOpen(true)} />
        <main className="app-main px-4 py-6 lg:px-6">{children(session, setSessionState)}</main>
      </div>
    </div>
  );
}

export function HomeRedirect() {
  const router = useRouter();
  useEffect(() => {
    async function redirect() {
      const session = await getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      if (session.loginType === "super-admin") {
        router.replace("/super-admin/dashboard");
        return;
      }
      router.replace("/home");
    }
    redirect();
  }, [router]);
  return <LoadingShell />;
}

export function SuperAdminLoginPage() {
  return <LoginScreen type="super-admin" />;
}

export function OwnerStaffLoginPage() {
  return <LoginScreen type="business" />;
}

export function SuperAdminDashboardPage() {
  const [laundries, setLaundries] = useState([]);
  const [branches, setBranchesState] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      const [nextLaundries, nextBranches] = await Promise.all([getLaundries(), getBranches()]);
      if (isMounted) {
        setLaundries(nextLaundries);
        setBranchesState(nextBranches);
      }
    }
    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppShell type="super-admin" title="Super Admin Dashboard" subtitle="Platform-wide performance and account management">
      {() => {
        const activeStaff = branches.reduce((sum, branch) => sum + branch.staffCount, 0);
        const activeSubscriptions = laundries.filter((laundry) => laundry.subscription === "Active").length;
        return (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard icon={Factory} label="Total laundry businesses" value={laundries.length} detail="+2 this month" />
              <StatCard icon={Users} label="Total owners" value={laundries.length} detail="All verified" />
              <StatCard icon={Building2} label="Total branches" value={branches.length} detail="Across 3 cities" />
              <StatCard icon={UserPlus} label="Active staff" value={activeStaff} detail="Currently assigned" />
              <StatCard icon={CreditCard} label="Active subscriptions" value={activeSubscriptions} detail="Recurring plans" />
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-zinc-950">Recently created laundries</h2>
                  <Link href="/super-admin/laundries/create"><Button><Plus size={17} /> Create laundry</Button></Link>
                </div>
                <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200">
                  {laundries.slice(0, 4).map((laundry) => (
                    <Link key={laundry.id} href={`/super-admin/laundries/${laundry.id}`} className="grid gap-3 border-b border-zinc-200 p-4 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                      <div>
                        <p className="font-bold text-zinc-950">{laundry.name}</p>
                        <p className="text-sm text-zinc-500">{laundry.city}, {laundry.state} · Owner: {laundry.ownerName}</p>
                      </div>
                      <Badge tone={laundry.status}>{laundry.status}</Badge>
                      <p className="text-sm font-semibold text-zinc-500">{laundry.plan}</p>
                    </Link>
                  ))}
                </div>
              </section>
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-zinc-950">Recent system activity</h2>
                <div className="mt-5 space-y-4">
                  <EmptyState title="No recent activity" body="Activity appears here as backend audit events are added." />
                </div>
              </section>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <StatusOverview laundries={laundries} />
              <QuickActions />
            </div>
          </div>
        );
      }}
    </AppShell>
  );
}

function StatusOverview({ laundries }) {
  const counts = ["Active", "Draft", "Inactive"].map((status) => ({
    status,
    count: laundries.filter((laundry) => laundry.status === status).length,
  }));
  const total = Math.max(laundries.length, 1);
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-zinc-950">Laundry status overview</h2>
      <div className="mt-5 space-y-4">
        {counts.map((item) => (
          <div key={item.status}>
            <div className="flex justify-between text-sm font-semibold text-zinc-700">
              <span>{item.status}</span>
              <span>{item.count}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-zinc-100">
              <div className="h-2 rounded-full bg-cyan-600" style={{ width: `${(item.count / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-zinc-950">Quick actions</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/super-admin/laundries/create"><Button className="w-full"><Plus size={17} /> Create business and owner</Button></Link>
        <Link href="/super-admin/laundries"><Button variant="secondary" className="w-full"><SlidersHorizontal size={17} /> Review laundries</Button></Link>
      </div>
    </section>
  );
}

export function LaundriesPage() {
  const [laundries, setLaundries] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadLaundries() {
      try {
        const nextLaundries = await getLaundries();
        if (isMounted) setLaundries(nextLaundries);
      } catch (error) {
        if (isMounted) setLoadError(getApiErrorMessage(error));
      }
    }
    loadLaundries();
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return laundries
      .filter((laundry) => status === "All" || laundry.status === status)
      .filter((laundry) => [laundry.name, laundry.ownerName, laundry.city, laundry.email].join(" ").toLowerCase().includes(query.toLowerCase()))
      .sort((first, second) => String(first[sortBy]).localeCompare(String(second[sortBy])));
  }, [laundries, query, sortBy, status]);

  async function toggleLaundry(laundryId) {
    const nextLaundries = laundries.map((laundry) => laundry.id === laundryId ? { ...laundry, status: laundry.status === "Active" ? "Inactive" : "Active" } : laundry);
    const target = nextLaundries.find((laundry) => laundry.id === laundryId);
    await api.patch(`/laundries/${laundryId}/`, { status: target.status });
    await saveLaundries(nextLaundries);
    setLaundries(nextLaundries);
  }

  async function deleteLaundry() {
    const nextLaundries = laundries.filter((laundry) => laundry.id !== deleteTarget.id);
    await api.del(`/laundries/${deleteTarget.id}/`);
    await saveLaundries(nextLaundries);
    setLaundries(nextLaundries);
    setDeleteTarget(null);
  }

  return (
    <AppShell type="super-admin" title="Laundry Businesses" subtitle="Search, filter, sort, edit, activate, and delete laundry accounts">
      {() => (
        <div className="space-y-5">
          {loadError ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{loadError}</p> : null}
          <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
              <Search size={18} className="text-zinc-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full text-sm outline-none" placeholder="Search laundries, owners, cities" />
            </div>
            <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Draft</option>
            </SelectInput>
            <SelectInput value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="name">Sort by name</option>
              <option value="city">Sort by city</option>
              <option value="plan">Sort by plan</option>
              <option value="status">Sort by status</option>
            </SelectInput>
            <Link href="/super-admin/laundries/create"><Button className="w-full lg:w-auto"><Plus size={17} /> New laundry</Button></Link>
          </div>
          <div className="hidden overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Laundry</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filtered.map((laundry) => (
                  <tr key={laundry.id}>
                    <td className="px-4 py-4">
                      <p className="font-bold text-zinc-950">{laundry.name}</p>
                      <p className="text-zinc-500">{laundry.city}, {laundry.state}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-zinc-800">{laundry.ownerName}</p>
                      <p className="text-zinc-500">{laundry.ownerEmail}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold text-zinc-700">{laundry.plan}</td>
                    <td className="px-4 py-4"><Badge tone={laundry.status}>{laundry.status}</Badge></td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <Link href={`/super-admin/laundries/${laundry.id}`}><Button variant="secondary">View</Button></Link>
                        <Button variant="secondary" onClick={() => toggleLaundry(laundry.id)}>{laundry.status === "Active" ? "Deactivate" : "Activate"}</Button>
                        <Button variant="danger" onClick={() => setDeleteTarget(laundry)}><Trash2 size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 lg:hidden">
            {filtered.map((laundry) => (
              <div key={laundry.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-zinc-950">{laundry.name}</h2>
                    <p className="text-sm text-zinc-500">{laundry.city}, {laundry.state}</p>
                  </div>
                  <Badge tone={laundry.status}>{laundry.status}</Badge>
                </div>
                <p className="mt-3 text-sm text-zinc-600">Owner: <span className="font-semibold">{laundry.ownerName}</span></p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Link href={`/super-admin/laundries/${laundry.id}`}><Button variant="secondary" className="w-full">View</Button></Link>
                  <Button variant="secondary" onClick={() => toggleLaundry(laundry.id)}>{laundry.status === "Active" ? "Deactivate" : "Activate"}</Button>
                  <Button variant="danger" onClick={() => setDeleteTarget(laundry)}><Trash2 size={16} /> Delete</Button>
                </div>
              </div>
            ))}
          </div>
          {deleteTarget ? (
            <ConfirmModal title="Delete laundry business?" body={`This will deactivate ${deleteTarget.name} and hide it from normal operations.`} confirmLabel="Delete" onCancel={() => setDeleteTarget(null)} onConfirm={deleteLaundry} />
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

const emptyLaundryForm = {
  name: "",
  email: "",
  phone: "",
  registrationNumber: "",
  address: "",
  city: "",
  state: "",
  country: "United States",
  postalCode: "",
  plan: "Starter",
  status: "Active",
  logo: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  password: "",
  confirmPassword: "",
  ownerPhoto: "",
  ownerStatus: "Active",
};

function validateLaundryForm(form, isDraft = false) {
  if (isDraft) return {};
  const errors = {};
  ["name", "email", "phone", "registrationNumber", "address", "city", "state", "country", "postalCode", "ownerName", "ownerEmail", "ownerPhone"].forEach((field) => {
    if (!form[field]) errors[field] = "Required";
  });
  if (!form.email.includes("@")) errors.email = "Enter a valid email";
  if (!form.ownerEmail.includes("@")) errors.ownerEmail = "Enter a valid email";
  if (form.password.length < 8) errors.password = "Use at least 8 characters";
  if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords must match";
  return errors;
}

function ImagePicker({ label, value, onChange }) {
  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  }
  return (
    <div>
      <span className="mb-2 block text-sm font-semibold text-zinc-800">{label}</span>
      <label className="flex cursor-pointer items-center gap-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 hover:bg-zinc-100">
        <span className="grid size-16 place-items-center overflow-hidden rounded-lg bg-white text-zinc-400">
          {value ? <Image src={value} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : <Camera size={22} />}
        </span>
        <span>
          <span className="block text-sm font-bold text-zinc-950">Upload image</span>
          <span className="block text-xs text-zinc-500">Preview only; upload storage can be configured for production.</span>
        </span>
        <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
      </label>
    </div>
  );
}

function LaundryForm({ initialValue = emptyLaundryForm, mode = "create" }) {
  const router = useRouter();
  const [form, setForm] = useState(initialValue);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function save(isDraft = false) {
    setSaveError("");
    const nextErrors = validateLaundryForm(form, isDraft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setIsSaving(true);
    try {
      const payload = { ...form, status: isDraft ? "Inactive" : form.status };
      const data = form.id ? await api.patch(`/laundries/${form.id}/`, payload) : await api.post("/laundries/", payload);
      setForm((current) => ({ ...current, id: data.laundry.id }));
      setIsSaving(false);
      setSuccess(isDraft ? "Laundry saved as inactive." : "Laundry business and owner saved.");
      if (mode === "create" && !isDraft) router.push(`/super-admin/laundries/${data.laundry.id}`);
    } catch (error) {
      setErrors(error.fields || {});
      setSaveError(getApiErrorMessage(error));
      setSuccess("");
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {saveError ? <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{saveError}</p> : null}
      {success ? <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} /> {success}</div> : null}
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-950">Laundry information</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Laundry name" error={errors.name}><TextInput value={form.name} onChange={(event) => update("name", event.target.value)} error={errors.name} /></Field>
          <Field label="Business email" error={errors.email}><TextInput value={form.email} onChange={(event) => update("email", event.target.value)} error={errors.email} /></Field>
          <Field label="Business phone number" error={errors.phone}><TextInput value={form.phone} onChange={(event) => update("phone", event.target.value)} error={errors.phone} /></Field>
          <Field label="Registration number" error={errors.registrationNumber}><TextInput value={form.registrationNumber} onChange={(event) => update("registrationNumber", event.target.value)} error={errors.registrationNumber} /></Field>
          <Field label="Address" error={errors.address}><TextInput value={form.address} onChange={(event) => update("address", event.target.value)} error={errors.address} /></Field>
          <Field label="City" error={errors.city}><TextInput value={form.city} onChange={(event) => update("city", event.target.value)} error={errors.city} /></Field>
          <Field label="State" error={errors.state}><TextInput value={form.state} onChange={(event) => update("state", event.target.value)} error={errors.state} /></Field>
          <Field label="Country" error={errors.country}><TextInput value={form.country} onChange={(event) => update("country", event.target.value)} error={errors.country} /></Field>
          <Field label="Postal code" error={errors.postalCode}><TextInput value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} error={errors.postalCode} /></Field>
          <Field label="Subscription plan"><SelectInput value={form.plan} onChange={(event) => update("plan", event.target.value)}><option>Starter</option><option>Growth</option><option>Enterprise</option></SelectInput></Field>
          <Field label="Account status"><SelectInput value={form.status} onChange={(event) => update("status", event.target.value)}><option>Active</option><option>Inactive</option><option>Draft</option></SelectInput></Field>
          <ImagePicker label="Logo upload" value={form.logo} onChange={(value) => update("logo", value)} />
        </div>
      </section>
      <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-zinc-950">Owner information</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Full name" error={errors.ownerName}><TextInput value={form.ownerName} onChange={(event) => update("ownerName", event.target.value)} error={errors.ownerName} /></Field>
          <Field label="Email" error={errors.ownerEmail}><TextInput value={form.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} error={errors.ownerEmail} /></Field>
          <Field label="Phone number" error={errors.ownerPhone}><TextInput value={form.ownerPhone} onChange={(event) => update("ownerPhone", event.target.value)} error={errors.ownerPhone} /></Field>
          <Field label="Account status"><SelectInput value={form.ownerStatus} onChange={(event) => update("ownerStatus", event.target.value)}><option>Active</option><option>Inactive</option></SelectInput></Field>
          <Field label="Password" error={errors.password}>
            <div className="relative">
              <TextInput value={form.password} onChange={(event) => update("password", event.target.value)} type={showPassword ? "text" : "password"} error={errors.password} className="pr-11" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <Field label="Confirm password" error={errors.confirmPassword}><TextInput value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} type={showPassword ? "text" : "password"} error={errors.confirmPassword} /></Field>
          <ImagePicker label="Profile photo" value={form.ownerPhoto} onChange={(value) => update("ownerPhoto", value)} />
        </div>
      </section>
      <div className="flex flex-col-reverse gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => setShowCancel(true)}>Cancel</Button>
        <Button variant="secondary" onClick={() => save(true)} disabled={isSaving}>Save as draft</Button>
        <Button onClick={() => save(false)} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />} {mode === "edit" ? "Save changes" : "Create laundry"}</Button>
      </div>
      {showCancel ? <ConfirmModal title="Discard form changes?" body="Your unsaved changes will be lost if you leave this page." confirmLabel="Discard" onCancel={() => setShowCancel(false)} onConfirm={() => router.push("/super-admin/laundries")} /> : null}
    </div>
  );
}

export function CreateLaundryPage() {
  return (
    <AppShell type="super-admin" title="Create Laundry Business" subtitle="Create the laundry account and owner from one validated form">
      {() => <LaundryForm />}
    </AppShell>
  );
}

export function LaundryDetailsPage() {
  const pathname = usePathname();
  const laundryId = pathname.split("/").filter(Boolean).at(-1);
  const [laundry, setLaundry] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadLaundry() {
      const data = await api.get(`/laundries/${laundryId}/`);
      if (isMounted) {
        setLaundry(data.laundry);
        setBranches(data.branches || []);
      }
    }
    loadLaundry().catch(() => {
      if (isMounted) setLaundry(null);
    });
    return () => {
      isMounted = false;
    };
  }, [laundryId]);

  return (
    <AppShell type="super-admin" title={laundry?.name || "Laundry Details"} subtitle="View branches and edit laundry or owner information">
      {() => {
        if (!laundry) return <EmptyState title="Laundry not found" body="This laundry is not available to the current account." action={<Link href="/super-admin/laundries"><Button>Back to laundries</Button></Link>} />;
        if (isEditing) return <LaundryForm initialValue={{ ...emptyLaundryForm, ...laundry, password: "********", confirmPassword: "********" }} mode="edit" />;
        return (
          <div className="space-y-6">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <span className="grid size-16 place-items-center overflow-hidden rounded-lg bg-cyan-50 text-cyan-700">
                    {laundry.logo ? <Image src={laundry.logo} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" /> : <Factory size={28} />}
                  </span>
                  <div>
                    <h2 className="text-2xl font-black text-zinc-950">{laundry.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">{laundry.address}, {laundry.city}, {laundry.state}</p>
                    <div className="mt-3 flex flex-wrap gap-2"><Badge tone={laundry.status}>{laundry.status}</Badge><Badge tone={laundry.subscription}>{laundry.subscription}</Badge></div>
                  </div>
                </div>
                <Button onClick={() => setIsEditing(true)}><Settings size={17} /> Edit details</Button>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Info label="Business email" value={laundry.email} />
                <Info label="Phone" value={laundry.phone} />
                <Info label="Registration" value={laundry.registrationNumber} />
                <Info label="Owner" value={laundry.ownerName} />
                <Info label="Owner email" value={laundry.ownerEmail} />
                <Info label="Plan" value={laundry.plan} />
              </div>
            </section>
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-950">Branches belonging to this laundry</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {branches.map((branch) => <BranchCard key={branch.id} branch={branch} />)}
                {!branches.length ? <p className="text-sm text-zinc-500">No branches have been created yet.</p> : null}
              </div>
            </section>
          </div>
        );
      }}
    </AppShell>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4">
      <p className="text-xs font-bold uppercase text-zinc-400">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

function BranchCard({ branch, recentBranchId, onOpen }) {
  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? () => onOpen(branch.id) : undefined}
      onKeyDown={onOpen ? (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(branch.id);
        }
      } : undefined}
      className={classNames(
        "block w-full rounded-xl border border-slate-200 bg-white p-5 text-left",
        onOpen ? "cursor-pointer transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">{branch.name}</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{branch.code}</p>
        </div>
        <Badge tone={branch.status}>{branch.status}</Badge>
      </div>
      <div className="mt-4 space-y-2 text-xs leading-5 text-slate-600">
        <p>{branch.city}, {branch.state} {branch.postalCode}</p>
        <p>{branch.phone}</p>
        <p>Manager: <span className="font-semibold text-slate-800">{branch.manager}</span></p>
        <p>{branch.staffCount} staff</p>
      </div>
      {recentBranchId === branch.id ? <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-600">Recently opened</p> : null}
    </div>
  );
}

export function BranchSelectionPage() {
  const router = useRouter();
  const { session, isReady } = useProtectedSession("business");
  const [recentBranchId, setRecentBranchId] = useState("");
  const [branches, setBranchesState] = useState(() => getCachedBranches() || []);

  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      if (!session) return;
      const nextBranches = await getAccessibleBranches(session);
      if (isMounted) {
        setBranchesState(nextBranches);
        setRecentBranchId(session.currentBranchId || "");
      }
    }
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, [session]);

  if (!isReady) return <LoadingShell />;

  return (
    <div className="min-h-screen bg-white">
      <TopBar session={session} title="Branch selection" subtitle="Choose your workspace" branches={branches} onMenu={() => {}} hideMenu />
      <main className="branch-selection-workspace px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-6 text-white">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Business home</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Select a branch</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">Choose a branch to open daily operations, or use business settings to create your first one.</p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-slate-100"><Store size={21} /></span>
          </div>
        </header>
        {(() => {
        const settingsRoutes = [
          ["branch.view", "/settings/branches"], ["branch.add", "/settings/branches/create"], ["item_group.view", "/settings/item-groups"], ["item.view", "/settings/items"], ["time_slot.view", "/settings/time-slots"], ["staff_management.view", "/settings/staff"],
        ];
        const settingsHref = settingsRoutes.find(([permission]) => can(session, permission))?.[1];
        function openBranch(branchId) {
          updateCurrentBranch(branchId);
          router.push(`/branch/${branchId}/dashboard`);
        }
        return (
          <div className="space-y-4">
            {settingsHref ? (
              <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Settings size={19} /></span>
                  <div>
                    <h2 className="text-base font-bold tracking-tight text-slate-900">Business settings</h2>
                    <p className="mt-1 text-sm text-slate-500">Manage branches, service items, item groups, and delivery time slots in one place.</p>
                  </div>
                </div>
                <Link href={settingsHref}><Button variant="secondary"><Settings size={16} /> Manage settings</Button></Link>
              </section>
            ) : null}
            {branches.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {branches.map((branch) => <BranchCard key={branch.id} branch={branch} recentBranchId={recentBranchId} onOpen={openBranch} />)}
              </div>
            ) : (
              <EmptyState
                title="You don't have any branches"
                body="Use Business Settings to create your first branch. Dashboard, orders, and customers will become available afterward."
                action={can(session, "branch.add") ? (
                  <Link href="/settings/branches/create"><Button><Plus size={17} /> Create first branch</Button></Link>
                ) : null}
              />
            )}
          </div>
        );
        })()}
      </div>
      </main>
    </div>
  );
}

export function CreateBranchPage() {
  const router = useRouter();
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_BRANCH_FORM);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSubmitError("");
  }

  async function save(session) {
    const nextErrors = {};
    ["name", "code", "email", "phone", "address", "city", "state", "postalCode", "manager"].forEach((field) => {
      if (!form[field]) nextErrors[field] = "Required";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSubmitError("");
    setIsSaving(true);
    try {
      const branch = await createBranch({ ...form, laundryId: session.laundryId });
      updateCurrentBranch(branch.id);
      setForm(INITIAL_BRANCH_FORM);
      setErrors({});
      setIsSaving(false);
      router.push(`/branch/${branch.id}/dashboard?created=1`);
    } catch (error) {
      setErrors(error.fields || {});
      setSubmitError(getApiErrorMessage(error, "The branch could not be created."));
      setIsSaving(false);
    }
  }

  return (
    <AppShell type="business" title="Create Branch" subtitle="Add branch operating details and open the dashboard immediately">
      {(session) => {
        if (!can(session, "branch.add")) return <EmptyState title="Branch creation is not available" body="Your role can work inside assigned branches but cannot create new ones." />;
        return (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            {submitError ? <div role="alert" className="mb-5 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700"><AlertTriangle size={18} /> {submitError}</div> : null}
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Branch name" error={errors.name}><TextInput value={form.name} onChange={(event) => update("name", event.target.value)} error={errors.name} /></Field>
              <Field label="Branch code" error={errors.code}><TextInput value={form.code} onChange={(event) => update("code", event.target.value)} error={errors.code} /></Field>
              <Field label="Email" error={errors.email}><TextInput value={form.email} onChange={(event) => update("email", event.target.value)} error={errors.email} /></Field>
              <Field label="Phone number" error={errors.phone}><TextInput value={form.phone} onChange={(event) => update("phone", event.target.value)} error={errors.phone} /></Field>
              <Field label="Address" error={errors.address}><TextInput value={form.address} onChange={(event) => update("address", event.target.value)} error={errors.address} /></Field>
              <Field label="City" error={errors.city}><TextInput value={form.city} onChange={(event) => update("city", event.target.value)} error={errors.city} /></Field>
              <Field label="State" error={errors.state}><TextInput value={form.state} onChange={(event) => update("state", event.target.value)} error={errors.state} /></Field>
              <Field label="Postal code" error={errors.postalCode}><TextInput value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} error={errors.postalCode} /></Field>
              <Field label="Opening time"><TextInput type="time" value={form.openingTime} onChange={(event) => update("openingTime", event.target.value)} /></Field>
              <Field label="Closing time"><TextInput type="time" value={form.closingTime} onChange={(event) => update("closingTime", event.target.value)} /></Field>
              <Field label="Manager" error={errors.manager}><TextInput value={form.manager} onChange={(event) => update("manager", event.target.value)} error={errors.manager} /></Field>
              <Field label="Branch status"><SelectInput value={form.status} onChange={(event) => update("status", event.target.value)}><option>Active</option><option>Inactive</option></SelectInput></Field>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Link href="/settings/branches"><Button variant="secondary">Cancel</Button></Link>
              <Button onClick={() => save(session)} disabled={isSaving}>{isSaving ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />} Create branch</Button>
            </div>
          </section>
        );
      }}
    </AppShell>
  );
}

export function BranchDashboardPage() {
  const wasCreated = useSearchParams().get("created") === "1";
  return (
    <BranchModuleShell title="Branch Dashboard" subtitle="Live operating snapshot for the selected branch">
      {(session, branch) => <BranchDashboardContent branch={branch} wasCreated={wasCreated} />}
    </BranchModuleShell>
  );
}

function BranchDashboardContent({ branch, wasCreated = false }) {
  const [branchOrders, setBranchOrders] = useState([]);
  const [branchCustomers, setBranchCustomers] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboardData() {
      const [orders, customers] = await Promise.all([getOrders(branch.id), getCustomers(branch.id)]);
      if (isMounted) {
        setBranchOrders(orders);
        setBranchCustomers(customers);
      }
    }
    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [branch.id]);

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = branchOrders.filter((order) => order.createdAt === today);
  const processingOrders = branchOrders.filter((order) => ["Pending", "Processing", "Approved"].includes(order.status));
  const pendingDeliveryOrders = branchOrders.filter((order) => order.status === "Pending Delivery");
  const deliveredOrders = branchOrders.filter((order) => order.status === "Delivered");
  const pendingPaymentTotal = branchOrders.reduce((sum, order) => sum + Math.max(0, Number(order.grandTotal || 0) - Number(order.paidAmount || 0)), 0);
  const revenueTotal = branchOrders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0);
  return (
    <div className="dashboard-workspace space-y-4">
            {wasCreated ? <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} /> Branch created successfully.</div> : null}
            <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-6 text-white">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Branch overview</p><h2 className="mt-2 text-3xl font-extrabold tracking-tight">{branch.name}</h2><p className="mt-2 text-sm text-slate-300">{branch.code} · {branch.city}, {branch.state} · {branch.openingTime}-{branch.closingTime}</p></div><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-slate-100"><Store size={20} /></span><Badge tone={branch.status}>{branch.status}</Badge></div></div>
            </section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={ClipboardList} label="Today's orders" value={todayOrders.length} detail={`${branchOrders.length} total work orders`} />
              {/* <StatCard icon={PackageCheck} label="Orders in progress" value={processingOrders.length} detail="Pending, processing, approved" /> */}
              <StatCard icon={Truck} label="Pending delivery" value={pendingDeliveryOrders.length} detail="Ready to hand over" />
              <StatCard icon={CheckCircle2} label="Delivered orders" value={deliveredOrders.length} detail="Completed handovers" />
              <StatCard icon={DollarSign} label="Collected revenue" value={formatMoney(revenueTotal)} detail="Receipt payments" />
              <StatCard icon={ReceiptText} label="Pending payments" value={formatMoney(pendingPaymentTotal)} detail="Balance still due" />
              <StatCard icon={Users} label="Total customers" value={branchCustomers.length} detail="Saved in this branch" />
              <StatCard icon={UserPlus} label="Staff working" value={branch.staffCount} detail="Configured branch team" />
            </div>
            <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,1fr)]">
              <RecentOrders orders={branchOrders.slice(0, 5)} branchId={branch.id} />
              <DashboardChart orders={branchOrders} />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Panel icon={Truck} title="Pending deliveries" items={pendingDeliveryOrders.map((order) => `${order.orderNumber} · ${order.customerName} · ${order.deliveryTimeSlot}`)} emptyText="No pending deliveries." />
              <Panel icon={Users} title="Recent customers" items={branchCustomers.slice(0, 3).map((customer) => `${customer.name} · ${customer.phone}`)} emptyText="No customers yet." />
            </div>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <DashboardHeading icon={Sparkles} title="Quick actions" subtitle="Your everyday branch essentials" />
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {[
                  { label: "Create order", detail: "Start a new laundry order", icon: ClipboardList, path: "orders/create", primary: true },
                  { label: "Add customer", detail: "Manage your customer directory", icon: UserPlus, path: "customers" },
                  { label: "Record payment", detail: "Open orders and collect payment", icon: DollarSign, path: "orders" },
                ].map(({ label, detail, icon: Icon, path, primary }) => (
                  <Link key={path} href={`/branch/${branch.id}/${path}`} className={classNames("group flex items-center gap-3 rounded-xl border p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500", primary ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800" : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-slate-100")}>
                    <Icon size={21} className="shrink-0" aria-hidden="true" />
                    <span className="min-w-0"><span className="block text-sm font-bold">{label}</span><span className={classNames("mt-1 block text-xs", primary ? "text-slate-300" : "text-slate-500")}>{detail}</span></span>
                    <span className="ml-auto" aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </section>
    </div>
  );
}

const dashboardCard = "min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white";

function DashboardHeading({ icon: Icon, title, subtitle, children }) {
  return <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Icon size={19} aria-hidden="true" /></span>
      <div><h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>{subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}</div>
    </div>{children}
  </div>;
}

function RecentOrders({ orders = [], branchId }) {
  return <section className={classNames(dashboardCard, "flex h-full flex-col")}>
    <div className="flex min-h-[84px] shrink-0 flex-col justify-center border-b border-slate-200 p-5"><DashboardHeading icon={ClipboardList} title="Recent orders" subtitle="Latest orders from your branch">
      {branchId ? <Link href={`/branch/${branchId}/orders`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-slate-500">View all <span aria-hidden="true">↗</span></Link> : null}
    </DashboardHeading></div>
    {orders.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr>{["Order / customer", "Service", "Status", "Amount"].map(label => <th key={label} scope="col" className={classNames("px-5 py-3 font-semibold", label === "Amount" && "text-right")}>{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{orders.map(order => <tr key={order.id} className="hover:bg-slate-50">
        <td className="px-5 py-4"><p className="whitespace-nowrap font-semibold text-slate-900">{order.orderNumber || order.id}</p><p className="mt-1 text-xs text-slate-500">{order.customerName || order.customer}</p></td>
        <td className="px-5 py-4 text-slate-600">{order.items?.[0]?.itemName || order.service || "—"}</td>
        <td className="whitespace-nowrap px-5 py-4"><Badge tone={order.status}>{order.status}</Badge></td>
        <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums text-slate-900">{order.grandTotal != null ? formatMoney(order.grandTotal) : order.total}</td>
      </tr>)}</tbody>
    </table></div> : <div className="p-6 text-sm text-slate-500">No recent orders. Create an order to get started.</div>}
    <div className="mt-auto border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{orders.length ? `Showing ${orders.length} most recent ${orders.length === 1 ? "order" : "orders"}` : "New orders will appear here."}</div>
  </section>;
}

function DashboardChart({ orders = [] }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6 + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return {
      key,
      label: date.toLocaleDateString("en", { weekday: "short" }),
      fullLabel: date.toLocaleDateString("en", { month: "short", day: "numeric" }),
      count: orders.filter(order => String(order.createdAt || "").slice(0, 10) === key).length,
    };
  });
  const maximum = Math.max(4, Math.ceil(Math.max(...days.map(day => day.count)) / 4) * 4);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const active = days.find(day => day.key === selectedDay);
  return <section className={classNames(dashboardCard, "flex h-full flex-col")}>
    <div className="flex min-h-[84px] shrink-0 flex-col justify-center border-b border-slate-200 p-5"><DashboardHeading icon={ClipboardList} title="Order activity" subtitle="Last 7 days"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{total} {total === 1 ? "order" : "orders"}</span></DashboardHeading></div>
    <div className="flex flex-1 flex-col px-5 pb-3 pt-5">
      <div className="relative h-40 pl-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32" aria-hidden="true">
          {[4, 3, 2, 1, 0].map(tick => <div key={tick} className="absolute inset-x-0 flex -translate-y-1/2 items-center gap-2" style={{ top: `${(4 - tick) / 4 * 100}%` }}><span className="w-5 text-right text-[10px] tabular-nums text-slate-400">{maximum * tick / 4}</span><span className="flex-1 border-t border-dashed border-slate-200" /></div>)}
        </div>
        <div className="relative grid h-full grid-cols-7 gap-2">
          {days.map((day, index) => <button key={day.key} type="button" onMouseEnter={() => setSelectedDay(day.key)} onMouseLeave={() => setSelectedDay(null)} onFocus={() => setSelectedDay(day.key)} onBlur={() => setSelectedDay(null)} onClick={() => setSelectedDay(day.key)} aria-label={`${day.fullLabel}: ${day.count} orders`} className="group flex min-w-0 flex-col items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500">
            <span className="flex h-32 w-full shrink-0 items-end justify-center"><span className={classNames("w-full max-w-8 rounded-t-md transition-colors group-hover:bg-slate-600 group-focus-visible:bg-slate-600", index === 6 ? "bg-slate-800" : "bg-slate-400")} style={{ height: `${day.count / maximum * 100}%` }} /></span>
            <span className="flex h-8 shrink-0 items-end text-[10px] font-medium text-slate-500">{day.label}</span>
          </button>)}
        </div>
      </div>
      <p className="mt-auto min-h-8 pt-4 text-xs text-slate-500" aria-live="polite">{active ? `${active.fullLabel} · ${active.count} ${active.count === 1 ? "order" : "orders"}` : total ? "Hover or select a day to see orders." : "No orders in the last 7 days."}</p>
    </div>
  </section>;
}

function Panel({ icon: Icon, title, items, emptyText = "No records found." }) {
  return <section className={dashboardCard}>
    <div className="border-b border-slate-200 p-5"><DashboardHeading icon={Icon} title={title}><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-600">{items.length}</span></DashboardHeading></div>
    {items.length ? <ul className="divide-y divide-slate-100">{items.map((item, index) => <li key={`${item}-${index}`} className="flex items-center gap-3 px-5 py-4 text-sm text-slate-700"><span className="size-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden="true" /><span className="min-w-0 break-words">{item}</span></li>)}</ul> : <div className="flex items-center gap-3 px-5 py-3"><CheckCircle2 size={20} className="shrink-0 text-slate-400" aria-hidden="true" /><p className="text-sm text-slate-500">{emptyText}</p></div>}
  </section>;
}

function useBranchIdFromPath() {
  return getBranchPath(usePathname());
}

function BranchModuleShell({ title, subtitle, requiredPermission, children }) {
  const branchId = useBranchIdFromPath();
  return (
    <AppShell type="business" title={title} subtitle={subtitle}>
      {(session) => {
        if (requiredPermission && !can(session, requiredPermission)) return <EmptyState title="Access denied" body="You do not have permission to open this page." />;
        return <BranchScope session={session} branchId={branchId}>{children}</BranchScope>;
      }}
    </AppShell>
  );
}

function BusinessSettingsShell({ title, subtitle, requiredPermission, children }) {
  return (
    <AppShell type="business" title={title} subtitle={subtitle}>
      {(session) => requiredPermission && !can(session, requiredPermission) ? <EmptyState title="Access denied" body="You do not have permission to open this page." /> : typeof children === "function" ? children(session, { laundryId: session.laundryId }) : children}
    </AppShell>
  );
}

function BranchScope({ session, branchId, children }) {
  const cachedBranch = getCachedBranches()?.find((item) => item.id === branchId) || null;
  const [branch, setBranch] = useState(cachedBranch);
  const [isLoading, setIsLoading] = useState(!cachedBranch);

  useEffect(() => {
    let isMounted = true;
    async function loadBranch() {
      setIsLoading(true);
      const branches = await getAccessibleBranches(session);
      if (isMounted) {
        setBranch(branches.find((item) => item.id === branchId) || null);
        setIsLoading(false);
      }
    }
    loadBranch();
    return () => {
      isMounted = false;
    };
  }, [branchId, session]);

  if (isLoading) return <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-semibold text-zinc-600"><Loader2 className="animate-spin text-cyan-600" size={18} /> Loading branch</div>;
  if (!branch) return <EmptyState title="Branch unavailable" body="This branch is not assigned to the current user." action={<Link href="/home"><Button>Choose branch</Button></Link>} />;
  return children(session, branch);
}

function AddReceiptModal({ order, onCancel, onSave }) {
  const balance = Math.max(0, Number(order.grandTotal || 0) - Number(order.paidAmount || 0));
  const [form, setForm] = useState({
    amount: balance.toFixed(2),
    method: "Cash",
    note: "",
  });
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const amount = Number(form.amount || 0);
    if (amount <= 0) {
      setError("Enter a payment amount.");
      return;
    }
    if (amount > balance) {
      setError("Amount cannot be greater than the unpaid balance.");
      return;
    }
    onSave({ ...form, amount });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-zinc-950">Add payment receipt</h2>
        <p className="mt-1 text-sm text-zinc-500">{order.orderNumber} balance: {formatMoney(balance)}</p>
        <div className="mt-5 space-y-4">
          <Field label="Amount"><TextInput type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></Field>
          <Field label="Payment method">
            <SelectInput value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}>
              <option>Cash</option>
              <option>Card</option>
              <option>UPI</option>
              <option>Online</option>
            </SelectInput>
          </Field>
          <Field label="Receipt note"><TextInput value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} placeholder="Optional note" /></Field>
          {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit"><ReceiptText size={17} /> Save receipt</Button>
        </div>
      </form>
    </div>
  );
}


export function OrdersPage() {
  return <BranchModuleShell title="Orders" subtitle="Work-order table with statuses, receipts, labels, and delivery tracking" requiredPermission="orders.view">
    {(session, branch) => <OrdersWorkspace key={branch.id} branchId={branch.id} permissions={session.permissionMatrix?.orders} deliveryPermissions={session.permissionMatrix?.delivery} />}
  </BranchModuleShell>;
}

export function DeliveryPage() {
  return <BranchModuleShell title="Delivery" subtitle="Manage pending and completed customer deliveries" requiredPermission="delivery.view">
    {(session, branch) => <DeliveryWorkspace key={branch.id} branchId={branch.id} />}
  </BranchModuleShell>;
}

export function CreateOrderPage() {
  const router = useRouter();
  const branchId = useBranchIdFromPath();
  const [customers, setCustomers] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotsError, setTimeSlotsError] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    deliveryDate: new Date().toISOString().slice(0, 10),
    deliveryTimeSlot: "",
    discount: 0,
    paidAmount: 0,
    items: [{ rowId: "row-initial", itemId: "", quantity: 1, unitPrice: 0, itemCount: 1 }],
  });

  useEffect(() => {
    let isMounted = true;
    async function loadCreateOrderData() {
      try {
        const [nextCustomers, nextServiceItems, branches] = await Promise.all([getCustomers(), getServiceItems(), getBranches()]);
        const branch = branches.find((item) => item.id === branchId);
        const nextTimeSlots = branch ? await getTimeSlots(branch.laundryId) : [];
        if (isMounted) {
          setCustomers(nextCustomers);
          setServiceItems(nextServiceItems);
          setTimeSlots(nextTimeSlots);
          setTimeSlotsError(branch ? "" : "The current branch could not be found.");
        }
      } catch (error) {
        if (isMounted) {
          setTimeSlots([]);
          setTimeSlotsError(getApiErrorMessage(error, "Could not load delivery time slots."));
        }
      }
    }
    loadCreateOrderData();
    return () => {
      isMounted = false;
    };
  }, [branchId]);

  const totals = useMemo(() => {
    const rows = form.items.map((row) => ({ ...row, itemTotal: Number(row.quantity || 0) * Number(row.unitPrice || 0) }));
    const subTotal = rows.reduce((sum, row) => sum + row.itemTotal, 0);
    const itemCount = rows.reduce((sum, row) => sum + Number(row.itemCount || 0), 0);
    const totalItemQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const discount = Number(form.discount || 0);
    return { rows, subTotal, itemCount, totalItemQuantity, discount, grandTotal: Math.max(0, subTotal - discount) };
  }, [form.discount, form.items]);

  function updateRow(rowId, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((row) => {
        if (row.rowId !== rowId) return row;
        if (field === "itemId") {
          const item = serviceItems.find((currentItem) => currentItem.id === value);
          return { ...row, itemId: value, unitPrice: item?.price || 0, itemCount: row.itemCount || 1 };
        }
        return { ...row, [field]: value };
      }),
    }));
  }

  function addRow() {
    setForm((current) => ({ ...current, items: [...current.items, { rowId: createClientId("row"), itemId: "", quantity: 1, unitPrice: 0, itemCount: 1 }] }));
  }

  function removeRow(rowId) {
    setForm((current) => ({ ...current, items: current.items.length === 1 ? current.items : current.items.filter((row) => row.rowId !== rowId) }));
  }

  async function submit(branch) {
    const nextErrors = {};
    if (!selectedCustomer) nextErrors.customer = "Select a customer";
    if (!form.deliveryDate) nextErrors.deliveryDate = "Required";
    if (!form.deliveryTimeSlot) nextErrors.deliveryTimeSlot = "Required";
    if (form.items.some((row) => !row.itemId)) nextErrors.items = "Select an item for every row";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await createOrder({
      branchId: branch.id,
      customerId: selectedCustomer.id,
      deliveryDate: form.deliveryDate,
      deliveryTimeSlot: form.deliveryTimeSlot,
      discount: totals.discount,
      paidAmount: Number(form.paidAmount || 0),
      items: totals.rows,
    });
    router.push(`/branch/${branch.id}/orders`);
  }

  return (
    <BranchModuleShell title="Create Order" subtitle="Select customer, choose configured items, calculate totals, and prepare labels" requiredPermission="orders.add">
      {(session, branch) => {
        const branchCustomers = customers.filter((customer) => customer.branchId === branch.id);
        const activeItems = serviceItems.filter((item) => item.laundryId === branch.laundryId && item.status === "Active");
        const activeSlots = timeSlots.filter((slot) => slot.laundryId === branch.laundryId && slot.status === "Active");
        return (
          <div className="create-order-workspace grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-4">
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <DashboardHeading icon={Users} title="Customer"><Link href={`/branch/${branch.id}/customers`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400"><UserPlus size={15} /> Manage customers</Link></DashboardHeading>
                <div className="mt-4">
                  <Field label="Customer" error={errors.customer}>
                    <CustomerCombobox
                      customers={branchCustomers}
                      selectedCustomer={selectedCustomer}
                      error={errors.customer}
                      onSelect={(customer) => {
                        setSelectedCustomer(customer);
                        if (customer) setErrors((current) => ({ ...current, customer: "" }));
                      }}
                    />
                  </Field>
                </div>
                {selectedCustomer ? (
                  <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 text-sm md:grid-cols-4">
                    <Info label="Name" value={selectedCustomer.name} />
                    <Info label="Phone" value={selectedCustomer.phone} />
                    <Info label="Email" value={selectedCustomer.email} />
                    <Info label="Address" value={selectedCustomer.address} />
                  </div>
                ) : null}
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <DashboardHeading icon={Truck} title="Delivery" />
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Delivery date" error={errors.deliveryDate}><TextInput type="date" value={form.deliveryDate} onChange={(event) => setForm((current) => ({ ...current, deliveryDate: event.target.value }))} error={errors.deliveryDate} /></Field>
                  <Field label="Delivery time slot" error={errors.deliveryTimeSlot}>
                    <SelectInput value={form.deliveryTimeSlot} onChange={(event) => setForm((current) => ({ ...current, deliveryTimeSlot: event.target.value }))} error={errors.deliveryTimeSlot}>
                      <option value="">{timeSlotsError ? "Unable to load slots" : "Choose slot"}</option>
                      {activeSlots.map((slot) => <option key={slot.id}>{slot.label}</option>)}
                    </SelectInput>
                    {timeSlotsError ? <p role="alert" className="mt-2 text-sm text-rose-700">{timeSlotsError}</p> : null}
                    {!timeSlotsError && !activeSlots.length ? <p role="status" className="mt-2 text-sm text-amber-700">No active delivery slots are configured for this laundry.</p> : null}
                  </Field>
                </div>
              </section>
              <section className="rounded-xl border border-slate-200 bg-white p-5">
                <DashboardHeading icon={ClipboardList} title="Items"><button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400"><Plus size={15} /> Add item</button></DashboardHeading>
                {errors.items ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{errors.items}</p> : null}
                <div className="order-items-list mt-4 divide-y divide-slate-200">
                  {form.items.map((row) => {
                    const selectedItem = activeItems.find((item) => item.id === row.itemId);
                    return (
                      <div key={row.rowId} className="item-row grid items-end gap-3 py-4 first:pt-0 last:pb-0">
                        <Field label="Item">
                          <SelectInput value={row.itemId} onChange={(event) => updateRow(row.rowId, "itemId", event.target.value)}>
                            <option value="">Select item</option>
                            {activeItems.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.shortCode}</option>)}
                          </SelectInput>
                        </Field>
                        <Field label="Quantity"><div className="relative"><TextInput className={selectedItem?.unitType ? "quantity-with-unit" : ""} type="number" min="0" step="0.01" value={row.quantity} onChange={(event) => updateRow(row.rowId, "quantity", event.target.value)} />{selectedItem?.unitType ? <span title={selectedItem.unitType} className="pointer-events-none absolute inset-y-0 right-2 flex max-w-8 items-center overflow-hidden text-[10px] text-slate-500">{({ kilogram: "kg", kilograms: "kg", piece: "pc", pieces: "pcs" })[selectedItem.unitType.toLowerCase()] || selectedItem.unitType}</span> : null}</div></Field>
                        <Field label="Unit price"><TextInput type="number" min="0" step="0.01" value={row.unitPrice} onChange={(event) => updateRow(row.rowId, "unitPrice", event.target.value)} /></Field>
                        <Field label="Item count"><TextInput type="number" min="1" step="1" value={row.itemCount} onChange={(event) => updateRow(row.rowId, "itemCount", event.target.value)} /></Field>
                        <div className="min-w-0"><p className="item-total-label mb-2 text-xs font-semibold text-slate-600">Item total</p><p className="item-total-value flex h-10 items-center text-xs font-bold tabular-nums text-slate-900">{formatMoney(Number(row.quantity || 0) * Number(row.unitPrice || 0))}</p></div>
                        <button type="button" aria-label="Remove item" title="Remove item" disabled={form.items.length === 1} onClick={() => removeRow(row.rowId)} className="mb-1 grid size-8 place-items-center justify-self-end rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-slate-400 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} /></button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5">
              <DashboardHeading icon={ReceiptText} title="Order summary" />
              <div className="mt-4 space-y-4 text-xs text-slate-600">
                <div className="flex items-center justify-between gap-3 [&_strong]:font-semibold [&_strong]:tabular-nums [&_strong]:text-slate-900"><span>Item count</span><strong>{totals.itemCount}</strong></div>
                <div className="flex items-center justify-between gap-3 [&_strong]:font-semibold [&_strong]:tabular-nums [&_strong]:text-slate-900"><span>Total item quantity</span><strong>{totals.totalItemQuantity}</strong></div>
                <div className="flex items-center justify-between gap-3 [&_strong]:font-semibold [&_strong]:tabular-nums [&_strong]:text-slate-900"><span>Item total</span><strong>{formatMoney(totals.subTotal)}</strong></div>
                <Field label="Discount"><TextInput type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))} /></Field>
                <Field label="Amount paid now"><TextInput type="number" min="0" step="0.01" value={form.paidAmount} onChange={(event) => setForm((current) => ({ ...current, paidAmount: event.target.value }))} /></Field>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-900">
                  <div className="flex items-center justify-between gap-3 text-sm tabular-nums"><span className="font-bold text-slate-950">Grand total</span><strong>{formatMoney(totals.grandTotal)}</strong></div>
                </div>
              </div>
              <div className="create-order-actions mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                <button type="button" className="create-order-cancel inline-flex !h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:!h-11" onClick={() => router.push(`/branch/${branch.id}/orders`)}>Cancel</button>
                <button type="button" className="create-order-save inline-flex !h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 sm:!h-11" onClick={() => submit(branch)}><CheckCircle2 size={17} /> Save order</button>
              </div>
            </aside>
          </div>
        );
      }}
    </BranchModuleShell>
  );
}

export function OrderDetailsPage() {
  const pathname = usePathname();
  const orderId = pathname.split("/").filter(Boolean).at(-1);
  const [order, setOrder] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [showLabels, setShowLabels] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  async function saveDetailReceipt(receipt) {
    const data = await createPaymentReceipt(order.id, receipt);
    setOrder(data.order);
    setReceipts(await getPaymentReceipts(order.id));
    setShowReceipt(false);
  }

  useEffect(() => {
    let isMounted = true;
    async function loadOrder() {
      const nextOrder = await getOrder(orderId);
      const nextReceipts = await getPaymentReceipts(orderId);
      if (isMounted) {
        setOrder(nextOrder);
        setReceipts(nextReceipts);
      }
    }
    loadOrder().catch(() => {
      if (isMounted) setOrder(null);
    });
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <BranchModuleShell title={order?.orderNumber || "Order Details"} subtitle="Work order details, items, receipts, and printable labels" requiredPermission="orders.view">
      {(session, branch) => {
        if (!order) return <EmptyState title="Order not found" body="This work order is not available to the current account." action={<Link href={`/branch/${branch.id}/orders`}><Button>Back to orders</Button></Link>} />;
        return (
          <div className="space-y-6">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-zinc-950">{order.orderNumber}</h2>
                  <p className="mt-1 text-sm text-zinc-500">{order.customerName} · {order.customerPhone}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><Badge tone={order.status}>{order.status}</Badge><Badge tone={order.paymentStatus}>{order.paymentStatus}</Badge></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setShowBill(true)}><Printer size={17} /> Print bill</Button>
                  <Button onClick={() => setShowLabels(true)}><Tag size={17} /> Print labels</Button>
                  {order.paymentStatus !== "Paid" ? <Button variant="secondary" onClick={() => setShowReceipt(true)}><WalletCards size={17} /> Receipt</Button> : null}
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <Info label="Delivery date" value={order.deliveryDate} />
                <Info label="Time slot" value={order.deliveryTimeSlot} />
                <Info label="Grand total" value={formatMoney(order.grandTotal)} />
                <Info label="Paid amount" value={formatMoney(order.paidAmount)} />
              </div>
            </section>
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-950">Items</h2>
              <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
                {order.items.map((item) => (
                  <div key={item.rowId} className="grid gap-3 border-b border-zinc-200 p-4 last:border-0 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-center">
                    <p className="font-bold text-zinc-950">{item.itemName} <span className="text-zinc-400">({item.shortCode})</span></p>
                    <p className="text-sm text-zinc-600">Qty {item.quantity} {item.unitType}</p>
                    <p className="text-sm text-zinc-600">{item.itemCount} labels</p>
                    <p className="text-sm text-zinc-600">{formatMoney(item.unitPrice)}</p>
                    <p className="font-bold text-zinc-950">{formatMoney(item.itemTotal)}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-950">Payment receipts</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {receipts.map((receipt) => <Info key={receipt.id} label={`${receipt.method} · ${receipt.paidAt}`} value={`${formatMoney(receipt.amount)} ${receipt.note ? `· ${receipt.note}` : ""}`} />)}
                {!receipts.length ? <p className="text-sm text-zinc-500">No receipts have been added yet.</p> : null}
              </div>
            </section>
            {showBill ? <BillPrintDialog order={order} onClose={() => setShowBill(false)} /> : null}
            {showReceipt ? <AddReceiptModal order={order} onCancel={() => setShowReceipt(false)} onSave={saveDetailReceipt} /> : null}
            {showLabels ? <LabelPrintDialog order={order} onClose={() => setShowLabels(false)} /> : null}
          </div>
        );
      }}
    </BranchModuleShell>
  );
}

export function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState("");
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadCustomers() {
      const nextCustomers = await getCustomers();
      if (isMounted) setCustomers(nextCustomers);
    }
    loadCustomers();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <BranchModuleShell title="Customers" subtitle="Customer directory used by Create Order auto-fill" requiredPermission="customers.view">
      {(session, branch) => {
        const branchCustomers = customers
          .filter((customer) => customer.branchId === branch.id)
          .filter((customer) => [customer.name, customer.phone, customer.email].join(" ").toLowerCase().includes(query.toLowerCase()));
        async function saveCustomer(customerId, values) {
          try {
            const saved = customerId ? await updateCustomer(customerId, values) : await createCustomer({ ...values, branchId: branch.id });
            setCustomers((current) => customerId ? current.map((customer) => customer.id === saved.id ? saved : customer) : [...current, saved]);
            setEditingCustomer(null);
            setNotice(customerId ? `${saved.name} updated.` : `${saved.name} created.`);
          } catch (issue) {
            setError(getApiErrorMessage(issue, "Unable to update customer."));
            throw issue;
          }
        }
        async function removeCustomer(customer) {
          if (!window.confirm(`Remove ${customer.name} from this branch?`)) return;
          try {
            await deleteCustomer(customer.id);
            setCustomers((current) => current.filter((item) => item.id !== customer.id));
            setNotice(`${customer.name} removed.`);
          } catch (issue) {
            setError(getApiErrorMessage(issue, "Unable to remove customer."));
          }
        }
        return (
          <div className="customer-workspace space-y-4">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Users size={19} /></span><div><h2 className="text-base font-bold tracking-tight text-slate-900">Customer directory</h2><p className="mt-0.5 text-xs text-slate-500">Customers available for branch orders.</p></div></div>
                {can(session, "customers.add") ? <button type="button" onClick={() => { setError(""); setEditingCustomer({ isNew: true }); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"><UserPlus size={16} /> Create customer</button> : null}
              </div>
              <label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"><Search size={17} className="shrink-0 text-slate-400" /><span className="sr-only">Search customers</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" placeholder="Search by name, phone, or email" />{query ? <button type="button" onClick={() => setQuery("")} className="text-xs font-semibold text-slate-500 hover:text-slate-900">Clear</button> : null}</label>
            </section>
            {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}
            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-semibold text-slate-900">Customers</h2><span className="text-xs tabular-nums text-slate-500">{branchCustomers.length} {branchCustomers.length === 1 ? "customer" : "customers"}{query ? " found" : ""}</span></div>
              <DataTable className="[&_table]:text-sm [&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_td]:px-4 [&_td]:py-3 [&_tbody]:divide-slate-100" minWidth="700px" rows={branchCustomers} rowKey={(customer) => customer.id} emptyMessage={query ? "No matching customers." : "No customers found."} columns={[
                { key: "customer", label: "Customer", render: (customer) => <p className="font-semibold text-slate-900">{customer.name}</p> },
                { key: "phone", label: "Phone", cellClassName: "whitespace-nowrap text-slate-600", render: (customer) => customer.phone },
                { key: "email", label: "Email", cellClassName: "text-slate-600", render: (customer) => customer.email || "—" },
                { key: "address", label: "Address", cellClassName: "max-w-64 truncate text-slate-600", render: (customer) => customer.address || "—" },
                { key: "actions", label: "Actions", headerClassName: "w-20", cellClassName: "w-20 whitespace-nowrap", render: (customer) => <div className="inline-flex gap-1">{can(session, "customers.edit") ? <TableActionButton label={`Edit ${customer.name}`} onClick={() => { setError(""); setEditingCustomer(customer); }}><Pencil size={15} /></TableActionButton> : null}{can(session, "customers.delete") ? <TableActionButton label={`Delete ${customer.name}`} onClick={() => removeCustomer(customer)}><Trash2 size={15} /></TableActionButton> : null}</div> },
              ]} />
             
            </section>
            {editingCustomer ? <CustomerEditDialog customer={editingCustomer} onClose={() => setEditingCustomer(null)} onSave={saveCustomer} /> : null}
          </div>
        );
      }}
    </BranchModuleShell>
  );
}

function CustomerEditDialog({ customer, onClose, onSave }) {
  const dialogRef = useRef(null);
  const isNew = customer.isNew === true;
  const [form, setForm] = useState({ name: isNew ? "" : customer.name, phone: isNew ? "" : customer.phone, email: isNew ? "" : customer.email || "", address: isNew ? "" : customer.address || "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  async function submit(event) {
    event.preventDefault();
    if (!form.name || !form.phone) { setError("Name and phone are required."); return; }
    setIsSaving(true);
    try { await onSave(isNew ? null : customer.id, form); } catch (issue) { setError(getApiErrorMessage(issue, `Unable to ${isNew ? "create" : "save"} customer.`)); setIsSaving(false); }
  }
  return <dialog ref={dialogRef} onCancel={onClose} className="fixed inset-0 m-auto max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]"><form onSubmit={submit} className="flex max-h-[calc(100dvh-1.5rem)] min-h-0 flex-col sm:max-h-[calc(100dvh-2rem)]">
    <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 sm:px-4 sm:py-3"><div><h2 className="text-sm font-bold sm:text-base">{isNew ? "Create customer" : "Edit customer"}</h2><p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{isNew ? "Add customer contact details." : "Update contact details."}</p></div><button type="button" onClick={onClose} aria-label="Close customer editor" className="grid size-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={16} /></button></div>
    <fieldset disabled={isSaving} className="grid min-h-0 flex-1 gap-2.5 overflow-y-auto overscroll-contain p-3 [&>label>span:first-child]:mb-1 [&>label>span:first-child]:text-[11px] sm:grid-cols-2 sm:gap-3 sm:p-4 sm:[&>label>span:first-child]:text-xs"><Field label="Name"><TextInput className="!h-9 text-xs sm:!h-10 sm:text-sm" autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field><Field label="Phone"><TextInput className="!h-9 text-xs sm:!h-10 sm:text-sm" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} /></Field><Field label="Email"><TextInput className="!h-9 text-xs sm:!h-10 sm:text-sm" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field><Field label="Address"><TextInput className="!h-9 text-xs sm:!h-10 sm:text-sm" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} /></Field>{error ? <p role="alert" className="sm:col-span-2 text-xs text-rose-700 sm:text-sm">{error}</p> : null}</fieldset>
    <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2.5 sm:flex-row sm:justify-end sm:gap-2 sm:px-4 sm:py-3"><button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 sm:h-10 sm:text-sm">Cancel</button><button className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 sm:h-10 sm:text-sm">{isSaving ? "Saving…" : isNew ? "Create customer" : "Save changes"}</button></div>
  </form></dialog>;
}

export function CreateCustomerPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [errors, setErrors] = useState({});

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  }

  async function saveCustomer(branch) {
    const nextErrors = {};
    if (!form.name) nextErrors.name = "Required";
    if (!form.phone) nextErrors.phone = "Required";
    if (form.email && !form.email.includes("@")) nextErrors.email = "Enter a valid email";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    await createCustomer({ ...form, branchId: branch.id });
    router.push(`/branch/${branch.id}/customers`);
  }

  return (
    <BranchModuleShell title="Create Customer" subtitle="Add a customer for this branch" requiredPermission="customers.add">
      {(session, branch) => (
        <section className="create-customer-workspace rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <Field label="Name" error={errors.name}><TextInput className="!h-9 text-xs sm:!h-10 sm:text-sm" value={form.name} onChange={(event) => update("name", event.target.value)} error={errors.name} /></Field>
            <Field label="Phone" error={errors.phone}><TextInput className="!h-9 text-xs sm:!h-10 sm:text-sm" value={form.phone} onChange={(event) => update("phone", event.target.value)} error={errors.phone} /></Field>
            <Field label="Email" error={errors.email}><TextInput className="!h-9 text-xs sm:!h-10 sm:text-sm" value={form.email} onChange={(event) => update("email", event.target.value)} error={errors.email} /></Field>
            <Field label="Address"><TextInput className="!h-9 text-xs sm:!h-10 sm:text-sm" value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:mt-6 sm:flex-row sm:justify-end sm:gap-3">
            <Link className="w-full sm:w-auto" href={`/branch/${branch.id}/customers`}><Button className="w-full text-xs sm:w-auto sm:text-sm" variant="secondary">Cancel</Button></Link>
            <Button className="w-full text-xs sm:w-auto sm:text-sm" onClick={() => saveCustomer(branch)}><CheckCircle2 size={16} /> Save customer</Button>
          </div>
        </section>
      )}
    </BranchModuleShell>
  );
}

function useSettingsData() {
  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadSettingsData() {
      const session = await getSession();
      if (!session?.laundryId) return;
      // Each settings screen may be permitted independently. A denied Item Group or
      // Time Slot request must not prevent an allowed Items request from rendering.
      const results = await Promise.allSettled([getItemGroups(session.laundryId), getServiceItems(session.laundryId), getTimeSlots(session.laundryId)]);
      if (isMounted) {
        setGroups(results[0].status === "fulfilled" ? results[0].value : []);
        setItems(results[1].status === "fulfilled" ? results[1].value : []);
        setSlots(results[2].status === "fulfilled" ? results[2].value : []);
      }
    }
    loadSettingsData();
    return () => {
      isMounted = false;
    };
  }, []);

  return { groups, setGroups, items, setItems, slots, setSlots };
}

export function SettingsCreateBranchPage() {
  return <SettingsBranchManagementPage initialCreate />;
}

export function SettingsBranchManagementPage({ initialCreate = false }) {
  const [branches, setBranches] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [creatingBranch, setCreatingBranch] = useState(initialCreate);
  const [editingBranch, setEditingBranch] = useState(null);
  const [viewingBranch, setViewingBranch] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadBranches() {
      const nextBranches = await getBranches();
      if (isMounted) setBranches(nextBranches);
    }
    loadBranches();
    return () => {
      isMounted = false;
    };
  }, []);

  async function toggleBranch(branchId) {
    const nextBranches = branches.map((branch) => branch.id === branchId ? { ...branch, status: branch.status === "Active" ? "Inactive" : "Active" } : branch);
    const target = nextBranches.find((branch) => branch.id === branchId);
    const updated = await updateBranch(branchId, { status: target.status });
    const savedBranches = branches.map((branch) => branch.id === branchId ? updated : branch);
    await saveBranches(savedBranches);
    setBranches(savedBranches);
  }

  async function persistBranchEdits(payload) {
    const updated = await updateBranch(payload.id, payload);
    const nextBranches = branches.map((branch) => branch.id === updated.id ? updated : branch);
    await saveBranches(nextBranches);
    setBranches(nextBranches);
    setEditingBranch(null);
  }

  async function saveBranchEdits(payload) {
    const currentBranch = branches.find((branch) => branch.id === payload.id);
    if (currentBranch && currentBranch.status !== payload.status) {
      setEditingBranch(null);
      setConfirmation({ type: "edit-status", branch: currentBranch, payload });
      return;
    }
    await persistBranchEdits(payload);
  }

  async function removeBranch(branch) {
    await deleteBranch(branch.id);
    const nextBranches = branches.filter((item) => item.id !== branch.id);
    await saveBranches(nextBranches);
    setBranches(nextBranches);
  }

  async function saveNewBranch(payload, business) {
    const created = await createBranch({ ...payload, laundryId: business.laundryId });
    const nextBranches = [created, ...branches.filter((branch) => branch.id !== created.id)];
    await saveBranches(nextBranches);
    setBranches(nextBranches);
    setCreatingBranch(false);
  }

  return (
    <BusinessSettingsShell title="Branch Management" subtitle="Manage every branch in this laundry business" requiredPermission="branch.view">
      {(session, business) => {
        const businessBranches = branches
          .filter((branch) => branch.laundryId === business.laundryId)
          .filter((branch) => session.role === "Laundry Owner" || session.branchIds?.includes(branch.id))
          .filter((branch) => status === "All" || branch.status === status)
          .filter((branch) => [branch.name, branch.code, branch.city, branch.manager].join(" ").toLowerCase().includes(query.toLowerCase()));
        return (
          <div className="branch-management-workspace staff-workspace space-y-4 text-slate-900">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Store size={20} /></span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold tracking-tight text-slate-900"><span className="sm:hidden">Branches</span><span className="hidden sm:inline">Branch management</span></h2>
                    <p className="mt-0.5 max-w-36 text-xs text-slate-500 sm:max-w-none">Manage branch locations and availability.</p>
                  </div>
                </div>
                {can(session, "branch.add") ? <button type="button" onClick={() => setCreatingBranch(true)} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"><Plus size={16} />Create branch</button> : null}
              </div>
              <div className="branch-management-filters mt-5 flex gap-2">
                <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100">
                  <Search size={18} className="shrink-0 text-slate-400" />
                  <span className="sr-only">Search branches</span>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search branches" />
                </label>
                <select aria-label="Filter branch status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none">
                  <option>All</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>
            </section>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 className="text-xs font-semibold text-slate-900">Branch directory</h2>
                <span className="text-xs tabular-nums text-slate-500">{businessBranches.length} {businessBranches.length === 1 ? "branch" : "branches"}</span>
              </div>
              <DataTable
                className="[&_table]:text-sm [&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_th]:px-3 [&_th]:py-3 [&_th]:text-xs [&_td]:px-3 [&_td]:py-3 [&_tbody]:divide-slate-100"
                columns={[
                  { key: "branch", label: "Branch", cellClassName: "min-w-48", render: (branch) => <><p className="font-semibold text-slate-900">{branch.name}</p><p className="mt-0.5 text-xs text-slate-500">{branch.code}</p></> },
                  { key: "location", label: "Location", cellClassName: "whitespace-nowrap text-slate-600", render: (branch) => `${branch.city}, ${branch.state}` },
                  { key: "manager", label: "Manager", cellClassName: "whitespace-nowrap text-slate-600", render: (branch) => branch.manager || "—" },
                  { key: "hours", label: "Hours", cellClassName: "whitespace-nowrap text-slate-600", render: (branch) => `${branch.openingTime}–${branch.closingTime}` },
                  { key: "status", label: "Status", cellClassName: "whitespace-nowrap", render: (branch) => <Badge tone={branch.status}>{branch.status}</Badge> },
                  { key: "actions", label: "Actions", headerClassName: "w-40", cellClassName: "w-40 whitespace-nowrap", render: (branch) => <div className="inline-flex gap-1"><TableActionButton label={`View ${branch.name}`} onClick={() => setViewingBranch(branch)}><Eye size={15} /></TableActionButton>{can(session, "branch.edit") ? <><TableActionButton label={`Edit ${branch.name}`} onClick={() => setEditingBranch(branch)}><Pencil size={15} /></TableActionButton>{branch.status === "Active" ? <TableActionButton danger label={`Deactivate ${branch.name}`} onClick={() => setConfirmation({ type: "status", branch })}><ToggleRight size={17} /></TableActionButton> : <TableActionButton className="text-emerald-600 hover:bg-emerald-50" label={`Activate ${branch.name}`} onClick={() => setConfirmation({ type: "status", branch })}><ToggleLeft size={17} /></TableActionButton>}</> : null}{can(session, "branch.delete") ? <TableActionButton danger label={`Delete ${branch.name}`} onClick={() => setConfirmation({ type: "delete", branch })}><Trash2 size={15} /></TableActionButton> : null}</div> },
                ]}
                rows={businessBranches}
                rowKey={(branch) => branch.id}
                minWidth="760px"
                emptyMessage="No branches found."
              />
            </section>
            {creatingBranch ? <BranchEditor branch={INITIAL_BRANCH_FORM} mode="create" onClose={() => setCreatingBranch(false)} onSave={(payload) => saveNewBranch(payload, business)} /> : null}
            {viewingBranch ? <BranchDetailsDialog branch={viewingBranch} onClose={() => setViewingBranch(null)} /> : null}
            {editingBranch ? <BranchEditor branch={editingBranch} onClose={() => setEditingBranch(null)} onSave={saveBranchEdits} /> : null}
            {confirmation ? <ConfirmModal title={confirmation.type === "delete" ? "Delete branch?" : `${(confirmation.type === "edit-status" ? confirmation.payload.status : confirmation.branch.status === "Active" ? "Inactive" : "Active") === "Active" ? "Activate" : "Deactivate"} branch?`} body={confirmation.type === "delete" ? `${confirmation.branch.name} will be removed from branch selection and daily operations.` : `${confirmation.branch.name} will be ${(confirmation.type === "edit-status" ? confirmation.payload.status : confirmation.branch.status === "Active" ? "Inactive" : "Active") === "Active" ? "active" : "inactive"} for daily operations.`} confirmLabel={confirmation.type === "delete" ? "Delete branch" : (confirmation.type === "edit-status" ? confirmation.payload.status : confirmation.branch.status === "Active" ? "Inactive" : "Active") === "Active" ? "Activate" : "Deactivate"} onCancel={() => setConfirmation(null)} onConfirm={async () => { if (confirmation.type === "delete") await removeBranch(confirmation.branch); else if (confirmation.type === "edit-status") await persistBranchEdits(confirmation.payload); else await toggleBranch(confirmation.branch.id); setConfirmation(null); }} /> : null}
          </div>
        );
      }}
    </BusinessSettingsShell>
  );
}

function BranchDetailsDialog({ branch, onClose }) {
  const details = [
    ["Branch code", branch.code],
    ["Status", branch.status],
    ["Manager", branch.manager],
    ["Phone", branch.phone],
    ["Email", branch.email],
    ["Address", branch.address],
    ["Location", [branch.city, branch.state, branch.postalCode].filter(Boolean).join(", ")],
    ["Operating hours", [branch.openingTime, branch.closingTime].filter(Boolean).join(" – ")],
  ];
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:grid sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Branch details">
    <div className="mx-auto my-0 flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white sm:my-auto">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4"><div><h2 className="text-sm font-bold text-slate-900 sm:text-base">{branch.name}</h2><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">Branch details</p></div><button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:size-8" aria-label="Close"><X size={16} /></button></div>
      <dl className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2 sm:p-5">{details.map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[11px] font-semibold text-slate-500 sm:text-xs">{label}</dt><dd className="mt-1 break-words text-xs font-medium text-slate-800 sm:text-sm">{value || "—"}</dd></div>)}</dl>
      <div className="flex justify-end border-t border-slate-200 px-4 py-3 sm:px-5 sm:py-4"><button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm">Close</button></div>
    </div>
  </div>;
}

function BranchEditor({ branch, mode = "edit", onClose, onSave }) {
  const [form, setForm] = useState(() => ({ ...INITIAL_BRANCH_FORM, ...branch }));
  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:grid sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Edit branch">
      <div className="mx-auto my-0 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white sm:my-auto sm:max-h-[calc(100dvh-2rem)]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4"><div><h2 className="text-sm font-bold text-slate-900 sm:text-base">{mode === "create" ? "Create branch" : "Edit branch"}</h2><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{mode === "create" ? "Add branch details and operating hours." : "Update branch details and operating hours."}</p></div><button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:size-8" aria-label="Close"><X size={16} /></button></div>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"><div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4"><BranchEditorField label="Branch name"><BranchEditorInput value={form.name} onChange={(event) => update("name", event.target.value)} /></BranchEditorField><BranchEditorField label="Branch code"><BranchEditorInput value={form.code} onChange={(event) => update("code", event.target.value)} /></BranchEditorField><BranchEditorField label="Email"><BranchEditorInput value={form.email} onChange={(event) => update("email", event.target.value)} /></BranchEditorField><BranchEditorField label="Phone number"><BranchEditorInput value={form.phone} onChange={(event) => update("phone", event.target.value)} /></BranchEditorField><BranchEditorField label="Address"><BranchEditorInput value={form.address} onChange={(event) => update("address", event.target.value)} /></BranchEditorField><BranchEditorField label="City"><BranchEditorInput value={form.city} onChange={(event) => update("city", event.target.value)} /></BranchEditorField><BranchEditorField label="State"><BranchEditorInput value={form.state} onChange={(event) => update("state", event.target.value)} /></BranchEditorField><BranchEditorField label="Postal code"><BranchEditorInput value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} /></BranchEditorField><BranchEditorField label="Opening time"><BranchEditorInput type="time" value={form.openingTime} onChange={(event) => update("openingTime", event.target.value)} /></BranchEditorField><BranchEditorField label="Closing time"><BranchEditorInput type="time" value={form.closingTime} onChange={(event) => update("closingTime", event.target.value)} /></BranchEditorField><BranchEditorField label="Manager"><BranchEditorInput value={form.manager} onChange={(event) => update("manager", event.target.value)} /></BranchEditorField><BranchEditorField label="Branch status"><BranchEditorSelect value={form.status} onChange={(event) => update("status", event.target.value)}><option>Active</option><option>Inactive</option></BranchEditorSelect></BranchEditorField></div></div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4"><button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm">Cancel</button><button type="button" onClick={() => onSave(form)} className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 sm:text-sm">{mode === "create" ? "Create branch" : "Save changes"}</button></div>
      </div>
    </div>
  );
}

function BranchEditorField({ label, children }) {
  return <label className="grid gap-1.5 text-[11px] font-semibold text-slate-700 sm:text-xs">{label}{children}</label>;
}

function BranchEditorInput(props) {
  return <input className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none sm:h-10 sm:text-sm" {...props} />;
}

function BranchEditorSelect({ children, ...props }) {
  return <select className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-normal outline-none sm:h-10 sm:text-sm" {...props}>{children}</select>;
}

export function SettingsStaffPage() { return <BusinessSettingsShell title="Staff Management" subtitle="Create staff, assign their branch, and set permissions" requiredPermission="staff_management.view"><StaffManagement /></BusinessSettingsShell>; }

export function SettingsItemGroupsPage() {
  const { groups, setGroups } = useSettingsData();
  const [groupEditor, setGroupEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [query, setQuery] = useState("");

  async function saveGroup(form, business) {
    const name = form.name.trim();
    if (!name) return;
    const group = form.id
      ? await updateItemGroup(form.id, { name })
      : await createItemGroup({ laundryId: business.laundryId, name });
    const nextGroups = form.id
      ? groups.map((current) => current.id === group.id ? group : current)
      : [group, ...groups];
    await saveItemGroups(nextGroups);
    setGroups(nextGroups);
    setGroupEditor(null);
  }

  async function toggleGroup(group) {
    const status = group.status === "Active" ? "Inactive" : "Active";
    const updated = await updateItemGroup(group.id, { status });
    const nextGroups = groups.map((current) => current.id === updated.id ? updated : current);
    await saveItemGroups(nextGroups);
    setGroups(nextGroups);
  }

  async function removeGroup(group) {
    await deleteItemGroup(group.id);
    const nextGroups = groups.filter((current) => current.id !== group.id);
    await saveItemGroups(nextGroups);
    setGroups(nextGroups);
  }

  return (
    <BusinessSettingsShell title="Item Groups" subtitle="Create and manage item groups used across the laundry business" requiredPermission="item_group.view">
      {(session, business) => {
        const businessGroups = groups.filter((group) => group.laundryId === business.laundryId && group.name.toLowerCase().includes(query.toLowerCase()));
        return (
          <div className="item-groups-workspace staff-workspace space-y-4 text-slate-900">
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Tag size={20} /></span><div className="min-w-0"><h2 className="text-base font-bold tracking-tight text-slate-900"><span className="sm:hidden">Groups</span><span className="hidden sm:inline">Item groups</span></h2><p className="mt-0.5 max-w-36 text-xs text-slate-500 sm:max-w-none">Organize your service items.</p></div></div>{can(session, "item_group.add") ? <button type="button" onClick={() => setGroupEditor({ name: "" })} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={16} />Create group</button> : null}</div>
              <label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"><Search size={18} className="shrink-0 text-slate-400" /><span className="sr-only">Search item groups</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search item groups" /></label>
            </section>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-semibold text-slate-900">Item groups</h2><span className="text-xs tabular-nums text-slate-500">{businessGroups.length} {businessGroups.length === 1 ? "group" : "groups"}</span></div><DataTable className="[&_table]:text-sm [&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_th]:px-3 [&_th]:py-3 [&_th]:text-xs [&_td]:px-3 [&_td]:py-3 [&_tbody]:divide-slate-100" columns={[{ key: "name", label: "Group name", cellClassName: "font-semibold text-slate-900", render: (group) => group.name }, { key: "status", label: "Status", cellClassName: "whitespace-nowrap", render: (group) => <Badge tone={group.status}>{group.status}</Badge> }, { key: "actions", label: "Actions", headerClassName: "w-28", cellClassName: "w-28 whitespace-nowrap", render: (group) => <div className="inline-flex gap-1">{can(session, "item_group.edit") ? <><TableActionButton label={`Edit ${group.name}`} onClick={() => setGroupEditor({ id: group.id, name: group.name })}><Pencil size={15} /></TableActionButton>{group.status === "Active" ? <TableActionButton danger label={`Deactivate ${group.name}`} onClick={() => setConfirmation({ type: "status", group })}><ToggleRight size={17} /></TableActionButton> : <TableActionButton className="text-emerald-600 hover:bg-emerald-50" label={`Activate ${group.name}`} onClick={() => setConfirmation({ type: "status", group })}><ToggleLeft size={17} /></TableActionButton>}</> : null}{can(session, "item_group.delete") ? <TableActionButton danger label={`Delete ${group.name}`} onClick={() => setConfirmation({ type: "delete", group })}><Trash2 size={15} /></TableActionButton> : null}</div> }]} rows={businessGroups} rowKey={(group) => group.id} minWidth="480px" emptyMessage="No item groups found." /></section>
            {groupEditor ? <ItemGroupEditor group={groupEditor} onClose={() => setGroupEditor(null)} onSave={(form) => saveGroup(form, business)} /> : null}
            {confirmation ? <ConfirmModal title={confirmation.type === "delete" ? "Delete item group?" : `${confirmation.group.status === "Active" ? "Deactivate" : "Activate"} item group?`} body={confirmation.type === "delete" ? `${confirmation.group.name} will be removed from the available item groups.` : `${confirmation.group.name} will be ${confirmation.group.status === "Active" ? "inactive" : "active"} for item setup.`} confirmLabel={confirmation.type === "delete" ? "Delete group" : confirmation.group.status === "Active" ? "Deactivate" : "Activate"} onCancel={() => setConfirmation(null)} onConfirm={async () => { if (confirmation.type === "delete") await removeGroup(confirmation.group); else await toggleGroup(confirmation.group); setConfirmation(null); }} /> : null}
          </div>
        );
      }}
    </BusinessSettingsShell>
  );
}

function ItemGroupEditor({ group, onClose, onSave }) {
  const [name, setName] = useState(group.name || "");
  const isEditing = Boolean(group.id);
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:grid sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="item-group-editor-title">
    <div className="mx-auto my-0 flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white sm:my-auto">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4"><div><h2 id="item-group-editor-title" className="text-sm font-bold text-slate-900 sm:text-base">{isEditing ? "Edit item group" : "Create item group"}</h2><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{isEditing ? "Update the item group name." : "Add an item group for your services."}</p></div><button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:size-8" aria-label="Close"><X size={16} /></button></div>
      <div className="p-4 sm:p-5"><BranchEditorField label="Group name"><BranchEditorInput value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Dry Cleaning" autoFocus /></BranchEditorField></div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4"><button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm">Cancel</button><button type="button" onClick={() => onSave({ ...group, name })} disabled={!name.trim()} className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm">{isEditing ? "Save changes" : "Create group"}</button></div>
    </div>
  </div>;
}

export function SettingsItemsPage() {
  const { groups, items, setItems } = useSettingsData();
  const [itemEditor, setItemEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [query, setQuery] = useState("");

  async function saveItem(form, business) {
    if (!form.name.trim() || !form.shortCode.trim() || !form.groupId || !form.price) return;
    const payload = { name: form.name.trim(), shortCode: form.shortCode.trim().toUpperCase(), groupId: form.groupId, pricingMethod: form.pricingMethod, price: Number(form.price), unitType: form.unitType };
    const item = form.id
      ? await updateServiceItem(form.id, payload)
      : await createServiceItem({ ...payload, laundryId: business.laundryId });
    const nextItems = form.id
      ? items.map((current) => current.id === item.id ? item : current)
      : [item, ...items];
    await saveServiceItems(nextItems);
    setItems(nextItems);
    setItemEditor(null);
  }

  async function toggleItem(item) {
    const updated = await updateServiceItem(item.id, { status: item.status === "Active" ? "Inactive" : "Active" });
    const nextItems = items.map((current) => current.id === updated.id ? updated : current);
    await saveServiceItems(nextItems);
    setItems(nextItems);
  }

  async function removeItem(item) {
    await deleteServiceItem(item.id);
    const nextItems = items.filter((current) => current.id !== item.id);
    await saveServiceItems(nextItems);
    setItems(nextItems);
  }

  return (
    <BusinessSettingsShell title="Items" subtitle="Create and manage order items, prices, methods, and unit types" requiredPermission="item.view">
      {(session, business) => {
        const businessGroups = groups.filter((group) => group.laundryId === business.laundryId);
        const businessItems = items.filter((item) => item.laundryId === business.laundryId).filter((item) => [item.name, item.shortCode, item.unitType].join(" ").toLowerCase().includes(query.toLowerCase()));
        return (
          <div className="items-workspace staff-workspace space-y-4 text-slate-900">
            <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><PackageCheck size={20} /></span><div className="min-w-0"><h2 className="text-base font-bold tracking-tight text-slate-900">Items</h2><p className="mt-0.5 max-w-36 text-xs text-slate-500 sm:max-w-none">Manage service items and pricing.</p></div></div>{can(session, "item.add") ? <button type="button" onClick={() => setItemEditor({ name: "", shortCode: "", groupId: "", pricingMethod: "Fixed price", price: "", unitType: "Quantity" })} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={16} />Create item</button> : null}</div><label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"><Search size={18} className="shrink-0 text-slate-400" /><span className="sr-only">Search items</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search items" /></label></section>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-semibold text-slate-900">Service items</h2><span className="text-xs tabular-nums text-slate-500">{businessItems.length} {businessItems.length === 1 ? "item" : "items"}</span></div><DataTable className="[&_table]:text-sm [&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_th]:px-3 [&_th]:py-3 [&_th]:text-xs [&_td]:px-3 [&_td]:py-3 [&_tbody]:divide-slate-100" columns={[{ key: "item", label: "Item", cellClassName: "min-w-44", render: (item) => <><p className="font-semibold text-slate-900">{item.name}</p><p className="mt-0.5 text-xs text-slate-500">{item.shortCode}</p></> }, { key: "group", label: "Group", cellClassName: "whitespace-nowrap text-slate-600", render: (item) => businessGroups.find((group) => group.id === item.groupId)?.name || "No group" }, { key: "pricing", label: "Pricing", cellClassName: "whitespace-nowrap text-slate-600", render: (item) => item.pricingMethod }, { key: "unit", label: "Unit", cellClassName: "whitespace-nowrap text-slate-600", render: (item) => item.unitType }, { key: "price", label: "Price", cellClassName: "whitespace-nowrap font-semibold tabular-nums text-slate-900", render: (item) => formatMoney(item.price) }, { key: "status", label: "Status", cellClassName: "whitespace-nowrap", render: (item) => <Badge tone={item.status}>{item.status}</Badge> }, { key: "actions", label: "Actions", headerClassName: "w-28", cellClassName: "w-28 whitespace-nowrap", render: (item) => <div className="inline-flex gap-1">{can(session, "item.edit") ? <><TableActionButton label={`Edit ${item.name}`} onClick={() => setItemEditor({ ...item, price: String(item.price) })}><Pencil size={15} /></TableActionButton>{item.status === "Active" ? <TableActionButton danger label={`Deactivate ${item.name}`} onClick={() => setConfirmation({ type: "status", item })}><ToggleRight size={17} /></TableActionButton> : <TableActionButton className="text-emerald-600 hover:bg-emerald-50" label={`Activate ${item.name}`} onClick={() => setConfirmation({ type: "status", item })}><ToggleLeft size={17} /></TableActionButton>}</> : null}{can(session, "item.delete") ? <TableActionButton danger label={`Delete ${item.name}`} onClick={() => setConfirmation({ type: "delete", item })}><Trash2 size={15} /></TableActionButton> : null}</div> }]} rows={businessItems} rowKey={(item) => item.id} minWidth="760px" emptyMessage="No items found." /></section>
            {itemEditor ? <ItemEditor item={itemEditor} groups={businessGroups} onClose={() => setItemEditor(null)} onSave={(form) => saveItem(form, business)} /> : null}
            {confirmation ? <ConfirmModal title={confirmation.type === "delete" ? "Delete item?" : `${confirmation.item.status === "Active" ? "Deactivate" : "Activate"} item?`} body={confirmation.type === "delete" ? `${confirmation.item.name} will be removed from the available service items.` : `${confirmation.item.name} will be ${confirmation.item.status === "Active" ? "inactive" : "active"} for orders.`} confirmLabel={confirmation.type === "delete" ? "Delete item" : confirmation.item.status === "Active" ? "Deactivate" : "Activate"} onCancel={() => setConfirmation(null)} onConfirm={async () => { if (confirmation.type === "delete") await removeItem(confirmation.item); else await toggleItem(confirmation.item); setConfirmation(null); }} /> : null}
          </div>
        );
      }}
    </BusinessSettingsShell>
  );
}

function ItemEditor({ item, groups, onClose, onSave }) {
  const [form, setForm] = useState(() => ({ ...item }));
  const isEditing = Boolean(item.id);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:grid sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="item-editor-title">
    <div className="mx-auto my-0 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white sm:my-auto sm:max-h-[calc(100dvh-2rem)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4"><div><h2 id="item-editor-title" className="text-sm font-bold text-slate-900 sm:text-base">{isEditing ? "Edit item" : "Create item"}</h2><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{isEditing ? "Update item details and pricing." : "Add an item for orders and pricing."}</p></div><button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:size-8" aria-label="Close"><X size={16} /></button></div>
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5"><div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:gap-4"><BranchEditorField label="Item name"><BranchEditorInput value={form.name} onChange={(event) => update("name", event.target.value)} autoFocus /></BranchEditorField><BranchEditorField label="Short code"><BranchEditorInput value={form.shortCode} onChange={(event) => update("shortCode", event.target.value.toUpperCase())} /></BranchEditorField><BranchEditorField label="Item group"><BranchEditorSelect value={form.groupId} onChange={(event) => update("groupId", event.target.value)}><option value="">Select group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</BranchEditorSelect></BranchEditorField><BranchEditorField label="Pricing method"><BranchEditorSelect value={form.pricingMethod} onChange={(event) => update("pricingMethod", event.target.value)}><option>Fixed price</option><option>Per kilogram</option></BranchEditorSelect></BranchEditorField><BranchEditorField label={form.pricingMethod === "Per kilogram" ? "Price per kilogram" : "Fixed price"}><BranchEditorInput type="number" min="0" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} /></BranchEditorField><BranchEditorField label="Unit type"><BranchEditorSelect value={form.unitType} onChange={(event) => update("unitType", event.target.value)}><option>Quantity</option><option>Kilogram</option><option>Meter</option><option>Pair</option><option>Set</option></BranchEditorSelect></BranchEditorField></div></div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4"><button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm">Cancel</button><button type="button" onClick={() => onSave(form)} className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 sm:text-sm">{isEditing ? "Save changes" : "Create item"}</button></div>
    </div>
  </div>;
}

export function SettingsTimeSlotsPage() {
  const { slots, setSlots } = useSettingsData();
  const [slotEditor, setSlotEditor] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [query, setQuery] = useState("");

  async function saveSlot(form, business) {
    const label = form.label.trim();
    if (!label) return;
    const slot = form.id
      ? await updateTimeSlot(form.id, { label })
      : await createTimeSlot({ laundryId: business.laundryId, label });
    const nextSlots = form.id
      ? slots.map((current) => current.id === slot.id ? slot : current)
      : [slot, ...slots];
    await saveTimeSlots(nextSlots);
    setSlots(nextSlots);
    setSlotEditor(null);
  }

  async function toggleSlot(slot) {
    const updated = await updateTimeSlot(slot.id, { status: slot.status === "Active" ? "Inactive" : "Active" });
    const nextSlots = slots.map((current) => current.id === updated.id ? updated : current);
    await saveTimeSlots(nextSlots);
    setSlots(nextSlots);
  }

  async function removeSlot(slot) {
    await deleteTimeSlot(slot.id);
    const nextSlots = slots.filter((current) => current.id !== slot.id);
    await saveTimeSlots(nextSlots);
    setSlots(nextSlots);
  }

  return (
    <BusinessSettingsShell title="Time Slots" subtitle="Create and manage delivery time slots used across all branches" requiredPermission="time_slot.view">
      {(session, business) => {
        const businessSlots = slots.filter((slot) => slot.laundryId === business.laundryId && slot.label.toLowerCase().includes(query.toLowerCase()));
        return (
          <div className="time-slots-workspace staff-workspace space-y-4 text-slate-900">
            <section className="rounded-xl border border-slate-200 bg-white p-5"><div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center"><div className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><Clock3 size={20} /></span><div className="min-w-0"><h2 className="text-base font-bold tracking-tight text-slate-900"><span className="sm:hidden">Slots</span><span className="hidden sm:inline">Time slots</span></h2><p className="mt-0.5 max-w-36 text-xs text-slate-500 sm:max-w-none">Manage delivery time windows.</p></div></div>{can(session, "time_slot.add") ? <button type="button" onClick={() => setSlotEditor({ label: "" })} className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800"><Plus size={16} />Create slot</button> : null}</div><label className="mt-5 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100"><Search size={18} className="shrink-0 text-slate-400" /><span className="sr-only">Search time slots</span><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-slate-400" placeholder="Search time slots" /></label></section>
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="text-xs font-semibold text-slate-900">Delivery time slots</h2><span className="text-xs tabular-nums text-slate-500">{businessSlots.length} {businessSlots.length === 1 ? "slot" : "slots"}</span></div><DataTable className="[&_table]:text-sm [&_thead]:bg-slate-50 [&_thead]:text-slate-500 [&_th]:px-3 [&_th]:py-3 [&_th]:text-xs [&_td]:px-3 [&_td]:py-3 [&_tbody]:divide-slate-100" columns={[{ key: "slot", label: "Time slot", cellClassName: "font-semibold text-slate-900", render: (slot) => slot.label }, { key: "status", label: "Status", cellClassName: "whitespace-nowrap", render: (slot) => <Badge tone={slot.status}>{slot.status}</Badge> }, { key: "actions", label: "Actions", headerClassName: "w-28", cellClassName: "w-28 whitespace-nowrap", render: (slot) => <div className="inline-flex gap-1">{can(session, "time_slot.edit") ? <><TableActionButton label={`Edit ${slot.label}`} onClick={() => setSlotEditor({ id: slot.id, label: slot.label })}><Pencil size={15} /></TableActionButton>{slot.status === "Active" ? <TableActionButton danger label={`Deactivate ${slot.label}`} onClick={() => setConfirmation({ type: "status", slot })}><ToggleRight size={17} /></TableActionButton> : <TableActionButton className="text-emerald-600 hover:bg-emerald-50" label={`Activate ${slot.label}`} onClick={() => setConfirmation({ type: "status", slot })}><ToggleLeft size={17} /></TableActionButton>}</> : null}{can(session, "time_slot.delete") ? <TableActionButton danger label={`Delete ${slot.label}`} onClick={() => setConfirmation({ type: "delete", slot })}><Trash2 size={15} /></TableActionButton> : null}</div> }]} rows={businessSlots} rowKey={(slot) => slot.id} minWidth="480px" emptyMessage="No time slots found." /></section>
            {slotEditor ? <TimeSlotEditor slot={slotEditor} onClose={() => setSlotEditor(null)} onSave={(form) => saveSlot(form, business)} /> : null}
            {confirmation ? <ConfirmModal title={confirmation.type === "delete" ? "Delete time slot?" : `${confirmation.slot.status === "Active" ? "Deactivate" : "Activate"} time slot?`} body={confirmation.type === "delete" ? `${confirmation.slot.label} will be removed from the available delivery time slots.` : `${confirmation.slot.label} will be ${confirmation.slot.status === "Active" ? "inactive" : "active"} for orders.`} confirmLabel={confirmation.type === "delete" ? "Delete slot" : confirmation.slot.status === "Active" ? "Deactivate" : "Activate"} onCancel={() => setConfirmation(null)} onConfirm={async () => { if (confirmation.type === "delete") await removeSlot(confirmation.slot); else await toggleSlot(confirmation.slot); setConfirmation(null); }} /> : null}
          </div>
        );
      }}
    </BusinessSettingsShell>
  );
}

function TimeSlotEditor({ slot, onClose, onSave }) {
  const [label, setLabel] = useState(slot.label || "");
  const isEditing = Boolean(slot.id);
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-3 sm:grid sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="time-slot-editor-title">
    <div className="mx-auto my-0 flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white sm:my-auto">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4"><div><h2 id="time-slot-editor-title" className="text-sm font-bold text-slate-900 sm:text-base">{isEditing ? "Edit time slot" : "Create time slot"}</h2><p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs">{isEditing ? "Update the delivery time window." : "Add a delivery time window for orders."}</p></div><button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 sm:size-8" aria-label="Close"><X size={16} /></button></div>
      <div className="p-4 sm:p-5"><BranchEditorField label="Time slot"><BranchEditorInput value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. 06:00 PM - 08:00 PM" autoFocus /></BranchEditorField></div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5 sm:py-4"><button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm">Cancel</button><button type="button" onClick={() => onSave({ ...slot, label })} disabled={!label.trim()} className="h-9 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm">{isEditing ? "Save changes" : "Create slot"}</button></div>
    </div>
  </div>;
}
