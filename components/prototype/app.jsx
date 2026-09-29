"use client";

import Link from "next/link";
import Image from "next/image";
import BillPrintDialog from "./bill-print-dialog";
import LabelPrintDialog from "./label-print-dialog";
import OrdersWorkspace from "./orders-workspace";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  CreditCard,
  DollarSign,
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
  Trash2,
  Truck,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { authenticate, can, getAccessibleBranches, getCachedSession, getSession, logout, setSession, updateCurrentBranch } from "@/lib/auth";
import {
  createBranch,
  createCustomer,
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
  updateItemGroup,
  updateServiceItem,
  updateTimeSlot,
} from "@/lib/storage";

const statusStyles = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Inactive: "border-zinc-200 bg-zinc-100 text-zinc-600",
  Draft: "border-amber-200 bg-amber-50 text-amber-700",
  Trial: "border-cyan-200 bg-cyan-50 text-cyan-700",
  Ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Processing: "border-blue-200 bg-blue-50 text-blue-700",
  "In progress": "border-blue-200 bg-blue-50 text-blue-700",
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
  return `$${Number(value || 0).toFixed(2)}`;
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
    <div ref={containerRef} className="relative">
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
                index === activeIndex ? "bg-cyan-50" : "hover:bg-zinc-50",
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-zinc-950">{value}</p>
          {detail ? <p className="mt-1 text-xs font-medium text-zinc-500">{detail}</p> : null}
        </div>
        <span className="grid size-11 place-items-center rounded-lg bg-cyan-50 text-cyan-700">
          <Icon size={20} />
        </span>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
            <AlertTriangle size={20} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-zinc-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{body}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
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
      <button onClick={() => setIsOpen((value) => !value)} className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left shadow-sm">
        <span className="grid size-9 place-items-center rounded-lg bg-zinc-950 text-sm font-bold text-white">{session?.name?.slice(0, 1)}</span>
        <span className="hidden sm:block">
          <span className="block text-sm font-bold text-zinc-950">{session?.name}</span>
          <span className="block text-xs text-zinc-500">{session?.role}</span>
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

function TopBar({ session, title, subtitle, branches, onMenu }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 lg:hidden" onClick={onMenu} aria-label="Open navigation">
            <Menu size={21} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-zinc-950">{title}</h1>
            {subtitle ? <p className="truncate text-sm text-zinc-500">{subtitle}</p> : null}
          </div>
        </div>
        <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 md:flex">
          <Search size={17} className="text-zinc-400" />
          <input className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400" placeholder="Search orders, branches, customers" />
        </div>
        <div className="flex items-center gap-2">
          <button className="grid size-10 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm hover:bg-zinc-50" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <ProfileDropdown session={session} branches={branches} />
        </div>
      </div>
    </header>
  );
}

function Sidebar({ links, isOpen, onClose }) {
  const pathname = usePathname();
  const content = (
    <div className="flex h-full flex-col bg-zinc-950 p-4 text-white">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-cyan-400 text-zinc-950">
            <Sparkles size={20} />
          </span>
          <span>
            <span className="block text-base font-black">LaundryOS</span>
            <span className="block text-xs text-zinc-400">Multi-branch suite</span>
          </span>
        </Link>
        <button className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close navigation">
          <X size={20} />
        </button>
      </div>
      <nav className="mt-8 space-y-1">
        {links.map((link) => {
          if (link.type === "heading") {
            return <p key={link.label} className="px-3 pb-1 pt-5 text-xs font-black uppercase tracking-wider text-zinc-500 first:pt-0">{link.label}</p>;
          }
          const isActive = pathname === link.href;
          return (
            <Link key={link.href} href={link.href} className={classNames("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition", link.isChild ? "ml-4 py-2 text-xs" : "", isActive ? "bg-white text-zinc-950" : "text-zinc-300 hover:bg-white/10 hover:text-white")}>
              <link.icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-72 lg:block">{content}</aside>
      {isOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-zinc-950/50" onClick={onClose} aria-label="Close navigation overlay" />
          <aside className="relative h-full w-80 max-w-[86vw]">{content}</aside>
        </div>
      ) : null}
    </>
  );
}

function AppShell({ type, title, subtitle, children }) {
  const { session, setSessionState, isReady } = useProtectedSession(type);
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [branches, setBranchesState] = useState(() => getCachedBranches() || []);
  const isSettingsArea = type === "business" && pathname.startsWith("/settings");
  const links = type === "super-admin"
    ? [
        { href: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/super-admin/laundries", label: "Laundries", icon: Factory },
        { href: "/super-admin/laundries/create", label: "Create Laundry", icon: Plus },
      ]
    : isSettingsArea
      ? [
        { href: "/home", label: "Business Home", icon: Store },
        { type: "heading", label: "Settings" },
        { href: "/settings/branches", label: "Branch Management", icon: Store },
        { href: "/settings/branches/create", label: "Create Branch", icon: Plus },
        { href: "/settings/item-groups", label: "Item Groups", icon: Tag },
        { href: "/settings/items", label: "Items", icon: PackageCheck },
        { href: "/settings/time-slots", label: "Time Slots", icon: Clock3 },
      ].filter((link) => link.type === "heading" || link.label !== "Create Branch" || can(session, "create_branch"))
      : [
        { href: session?.currentBranchId ? `/branch/${session.currentBranchId}/dashboard` : "/home", label: "Dashboard", icon: LayoutDashboard },
        { type: "heading", label: "Operations" },
        { href: session?.currentBranchId ? `/branch/${session.currentBranchId}/orders` : "/home", label: "Orders", icon: ClipboardList },
        { href: session?.currentBranchId ? `/branch/${session.currentBranchId}/customers` : "/home", label: "Customers", icon: Users },
      ].filter((link) => link.type === "heading" || link.label !== "Create Branch" || can(session, "create_branch"));

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
    <div className="min-h-screen bg-zinc-50">
      <Sidebar links={links} isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <div className="lg:pl-72">
        <TopBar session={session} title={title} subtitle={subtitle} branches={branches} onMenu={() => setIsMenuOpen(true)} />
        <main className="px-4 py-6 lg:px-6">{children(session, setSessionState)}</main>
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
        "block w-full rounded-lg border border-zinc-200 bg-white p-4 text-left shadow-sm",
        onOpen ? "cursor-pointer transition hover:border-cyan-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-cyan-500" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-zinc-950">{branch.name}</h2>
          <p className="text-sm font-semibold text-zinc-500">{branch.code}</p>
        </div>
        <Badge tone={branch.status}>{branch.status}</Badge>
      </div>
      <div className="mt-4 space-y-2 text-sm text-zinc-600">
        <p>{branch.city}, {branch.state} {branch.postalCode}</p>
        <p>{branch.phone}</p>
        <p>Manager: <span className="font-semibold text-zinc-800">{branch.manager}</span></p>
        <p>{branch.staffCount} staff</p>
      </div>
      {recentBranchId === branch.id ? <p className="mt-3 text-xs font-bold uppercase text-cyan-700">Recently opened</p> : null}
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
    <main className="min-h-screen bg-zinc-50 px-4 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase text-cyan-700">
              <Store size={14} />
              Business Home
            </div>
            <h1 className="mt-3 text-3xl font-black text-zinc-950">Select a branch</h1>
            <p className="mt-1 text-sm text-zinc-500">Choose a branch to open daily operations, or use branch settings to create your first one.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-bold text-zinc-950">{session?.name}</span>
              <span className="block text-xs text-zinc-500">{session?.role}</span>
            </span>
            <Button variant="secondary" onClick={async () => { await logout(); router.push("/login"); }}><LogOut size={17} /> Logout</Button>
          </div>
        </header>
        {(() => {
        function openBranch(branchId) {
          updateCurrentBranch(branchId);
          router.push(`/branch/${branchId}/dashboard`);
        }
        return (
          <div className="space-y-5">
            {can(session, "create_branch") ? (
              <section className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-700"><Settings size={20} /></span>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-950">Business Settings</h2>
                    <p className="mt-1 text-sm text-zinc-500">Manage branches, service items, item groups, and delivery time slots in one place.</p>
                  </div>
                </div>
                <Link href="/settings/branches"><Button variant="secondary"><Settings size={17} /> Manage settings</Button></Link>
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
                action={can(session, "create_branch") ? (
                  <Link href="/settings/branches/create"><Button><Plus size={17} /> Create first branch</Button></Link>
                ) : null}
              />
            )}
          </div>
        );
        })()}
      </div>
    </main>
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
        if (!can(session, "create_branch")) return <EmptyState title="Branch creation is not available" body="Your role can work inside assigned branches but cannot create new ones." />;
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
    <div className="space-y-6">
            {wasCreated ? <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><CheckCircle2 size={18} /> Branch created successfully.</div> : null}
            <section className="rounded-lg border border-cyan-200 bg-cyan-50 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase text-cyan-700">Current branch</p>
                  <h2 className="mt-1 text-2xl font-black text-zinc-950">{branch.name}</h2>
                  <p className="mt-1 text-sm text-zinc-600">{branch.code} · {branch.city}, {branch.state} · {branch.openingTime}-{branch.closingTime}</p>
                </div>
                <Badge tone={branch.status}>{branch.status}</Badge>
              </div>
            </section>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={ClipboardList} label="Today's orders" value={todayOrders.length} detail={`${branchOrders.length} total work orders`} />
              <StatCard icon={PackageCheck} label="Orders in progress" value={processingOrders.length} detail="Pending, processing, approved" />
              <StatCard icon={Truck} label="Pending delivery" value={pendingDeliveryOrders.length} detail="Ready to hand over" />
              <StatCard icon={CheckCircle2} label="Delivered orders" value={deliveredOrders.length} detail="Completed handovers" />
              <StatCard icon={DollarSign} label="Collected revenue" value={formatMoney(revenueTotal)} detail="Receipt payments" />
              <StatCard icon={ReceiptText} label="Pending payments" value={formatMoney(pendingPaymentTotal)} detail="Balance still due" />
              <StatCard icon={Users} label="Total customers" value={branchCustomers.length} detail="Saved in this branch" />
              <StatCard icon={UserPlus} label="Staff working" value={branch.staffCount} detail="Configured branch team" />
            </div>
            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <RecentOrders orders={branchOrders.slice(0, 5)} branchId={branch.id} />
              <DashboardChart />
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Pending deliveries" items={pendingDeliveryOrders.map((order) => `${order.orderNumber} · ${order.customerName} · ${order.deliveryTimeSlot}`)} emptyText="No pending deliveries." />
              <Panel title="Recent customers" items={branchCustomers.slice(0, 3).map((customer) => `${customer.name} · ${customer.phone}`)} emptyText="No customers yet." />
            </div>
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-950">Quick actions</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Link href={`/branch/${branch.id}/orders/create`}><Button variant="secondary" className="w-full"><ClipboardList size={17} /> Create order</Button></Link>
                <Link href={`/branch/${branch.id}/customers`}><Button variant="secondary" className="w-full"><UserPlus size={17} /> Add customer</Button></Link>
                <Link href={`/branch/${branch.id}/orders`}><Button variant="secondary" className="w-full"><DollarSign size={17} /> Record payment</Button></Link>
              </div>
            </section>
    </div>
  );
}

function RecentOrders({ orders = [], branchId }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-zinc-950">Recent orders</h2>
        {branchId ? <Link href={`/branch/${branchId}/orders`} className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">View all</Link> : null}
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200">
        {orders.map((order) => (
          <div key={order.id} className="grid gap-3 border-b border-zinc-200 p-4 last:border-0 md:grid-cols-[0.8fr_1fr_1fr_auto_auto] md:items-center">
            <p className="font-bold text-zinc-950">{order.orderNumber || order.id}</p>
            <p className="text-sm text-zinc-600">{order.customerName || order.customer}</p>
            <p className="text-sm text-zinc-600">{order.items?.[0]?.itemName || order.service}</p>
            <Badge tone={order.status}>{order.status}</Badge>
            <p className="font-bold text-zinc-900">{order.grandTotal ? formatMoney(order.grandTotal) : order.total}</p>
          </div>
        ))}
      </div>
      {!orders.length ? <EmptyState title="No recent orders" body="Create an order to populate this branch dashboard." /> : null}
    </section>
  );
}

function DashboardChart() {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-zinc-950">Order status chart</h2>
      <div className="mt-5 flex h-56 items-end gap-3 rounded-lg bg-zinc-50 p-4">
        {[0, 0, 0, 0, 0, 0, 0].map((height, index) => (
          <div key={["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][index]} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full rounded-t-lg bg-cyan-600" style={{ height: `${height}%` }} />
            <span className="text-xs font-semibold text-zinc-500">{["M", "T", "W", "T", "F", "S", "S"][index]}</span>
          </div>
        ))}
      </div>
      <h2 className="mt-6 text-lg font-bold text-zinc-950">Revenue overview</h2>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full w-[72%] bg-emerald-500" />
      </div>
      <p className="mt-2 text-sm text-zinc-500">Revenue progress appears after receipt payments are recorded.</p>
    </section>
  );
}

function Panel({ title, items, emptyText = "No records found." }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-zinc-950">{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item) => (
          <div key={item} className="rounded-lg bg-zinc-50 p-3 text-sm font-medium text-zinc-700">{item}</div>
        )) : <div className="rounded-lg bg-zinc-50 p-3 text-sm font-medium text-zinc-500">{emptyText}</div>}
      </div>
    </section>
  );
}

function useBranchIdFromPath() {
  return getBranchPath(usePathname());
}

function BranchModuleShell({ title, subtitle, children }) {
  const branchId = useBranchIdFromPath();
  return (
    <AppShell type="business" title={title} subtitle={subtitle}>
      {(session) => {
        return <BranchScope session={session} branchId={branchId}>{children}</BranchScope>;
      }}
    </AppShell>
  );
}

function BusinessSettingsShell({ title, subtitle, children }) {
  return (
    <AppShell type="business" title={title} subtitle={subtitle}>
      {(session) => children(session, { laundryId: session.laundryId })}
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

function SectionHeader({ title, action }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-bold text-zinc-950">{title}</h2>
      {action}
    </div>
  );
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
  return <BranchModuleShell title="Orders" subtitle="Work-order table with statuses, receipts, labels, and delivery tracking">
    {(session, branch) => <OrdersWorkspace key={branch.id} branchId={branch.id} />}
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
    <BranchModuleShell title="Create Order" subtitle="Select customer, choose configured items, calculate totals, and prepare labels">
      {(session, branch) => {
        const branchCustomers = customers.filter((customer) => customer.branchId === branch.id || customer.laundryId === branch.laundryId);
        const activeItems = serviceItems.filter((item) => item.laundryId === branch.laundryId && item.status === "Active");
        const activeSlots = timeSlots.filter((slot) => slot.laundryId === branch.laundryId && slot.status === "Active");
        return (
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <SectionHeader title="Customer" action={<Link href={`/branch/${branch.id}/customers`}><Button variant="secondary"><UserPlus size={17} /> Manage customers</Button></Link>} />
                <div className="mt-5">
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
                  <div className="mt-4 grid gap-3 rounded-lg bg-zinc-50 p-4 text-sm md:grid-cols-4">
                    <Info label="Name" value={selectedCustomer.name} />
                    <Info label="Phone" value={selectedCustomer.phone} />
                    <Info label="Email" value={selectedCustomer.email} />
                    <Info label="Address" value={selectedCustomer.address} />
                  </div>
                ) : null}
              </section>
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-bold text-zinc-950">Delivery</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
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
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <SectionHeader title="Items" action={<Button variant="secondary" onClick={addRow}><Plus size={17} /> Add item</Button>} />
                {errors.items ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{errors.items}</p> : null}
                <div className="mt-4 space-y-3">
                  {form.items.map((row) => {
                    const selectedItem = activeItems.find((item) => item.id === row.itemId);
                    return (
                      <div key={row.rowId} className="grid gap-3 rounded-lg border border-zinc-200 p-3 lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.7fr_0.8fr_auto] lg:items-end">
                        <Field label="Item">
                          <SelectInput value={row.itemId} onChange={(event) => updateRow(row.rowId, "itemId", event.target.value)}>
                            <option value="">Select item</option>
                            {activeItems.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.shortCode}</option>)}
                          </SelectInput>
                        </Field>
                        <Field label={`Quantity${selectedItem?.unitType ? ` (${selectedItem.unitType})` : ""}`}><TextInput type="number" min="0" step="0.01" value={row.quantity} onChange={(event) => updateRow(row.rowId, "quantity", event.target.value)} /></Field>
                        <Field label="Unit price"><TextInput type="number" min="0" step="0.01" value={row.unitPrice} onChange={(event) => updateRow(row.rowId, "unitPrice", event.target.value)} /></Field>
                        <Field label="Item count"><TextInput type="number" min="1" step="1" value={row.itemCount} onChange={(event) => updateRow(row.rowId, "itemCount", event.target.value)} /></Field>
                        <Info label="Item total" value={formatMoney(Number(row.quantity || 0) * Number(row.unitPrice || 0))} />
                        <Button variant="danger" onClick={() => removeRow(row.rowId)}><Trash2 size={16} /></Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-zinc-950">Order summary</h2>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between"><span>Item count</span><strong>{totals.itemCount}</strong></div>
                <div className="flex justify-between"><span>Total item quantity</span><strong>{totals.totalItemQuantity}</strong></div>
                <div className="flex justify-between"><span>Item total</span><strong>{formatMoney(totals.subTotal)}</strong></div>
                <Field label="Discount"><TextInput type="number" min="0" step="0.01" value={form.discount} onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))} /></Field>
                <Field label="Amount paid now"><TextInput type="number" min="0" step="0.01" value={form.paidAmount} onChange={(event) => setForm((current) => ({ ...current, paidAmount: event.target.value }))} /></Field>
                <div className="border-t border-zinc-200 pt-4">
                  <div className="flex justify-between text-base"><span className="font-bold text-zinc-950">Grand total</span><strong>{formatMoney(totals.grandTotal)}</strong></div>
                </div>
              </div>
              <Button className="mt-6 w-full" onClick={() => submit(branch)}><CheckCircle2 size={17} /> Save order</Button>
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
    <BranchModuleShell title={order?.orderNumber || "Order Details"} subtitle="Work order details, items, receipts, and printable labels">
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
    <BranchModuleShell title="Customers" subtitle="Customer directory used by Create Order auto-fill">
      {(session, branch) => {
        const branchCustomers = customers
          .filter((customer) => customer.branchId === branch.id || customer.laundryId === branch.laundryId)
          .filter((customer) => [customer.name, customer.phone, customer.email].join(" ").toLowerCase().includes(query.toLowerCase()));
        return (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-xl font-black text-zinc-950">Customers</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
                  <Search size={17} className="text-zinc-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full text-sm outline-none" placeholder="Search customers" />
                </div>
                <Link href={`/branch/${branch.id}/customers/create`}><Button><UserPlus size={17} /> Create customer</Button></Link>
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {branchCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-4 py-4 font-bold text-zinc-950">{customer.name}</td>
                      <td className="px-4 py-4 text-zinc-600">{customer.phone}</td>
                      <td className="px-4 py-4 text-zinc-600">{customer.email}</td>
                      <td className="px-4 py-4 text-zinc-600">{customer.address}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!branchCustomers.length ? <EmptyState title="No customers found" body="Create a customer before selecting them in Create Order." action={<Link href={`/branch/${branch.id}/customers/create`}><Button>Create customer</Button></Link>} /> : null}
          </section>
        );
      }}
    </BranchModuleShell>
  );
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
    <BranchModuleShell title="Create Customer" subtitle="Add a customer for this branch">
      {(session, branch) => (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" error={errors.name}><TextInput value={form.name} onChange={(event) => update("name", event.target.value)} error={errors.name} /></Field>
            <Field label="Phone" error={errors.phone}><TextInput value={form.phone} onChange={(event) => update("phone", event.target.value)} error={errors.phone} /></Field>
            <Field label="Email" error={errors.email}><TextInput value={form.email} onChange={(event) => update("email", event.target.value)} error={errors.email} /></Field>
            <Field label="Address"><TextInput value={form.address} onChange={(event) => update("address", event.target.value)} /></Field>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Link href={`/branch/${branch.id}/customers`}><Button variant="secondary">Cancel</Button></Link>
            <Button onClick={() => saveCustomer(branch)}><CheckCircle2 size={17} /> Save customer</Button>
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
      const [nextGroups, nextItems, nextSlots] = await Promise.all([getItemGroups(session.laundryId), getServiceItems(session.laundryId), getTimeSlots(session.laundryId)]);
      if (isMounted) {
        setGroups(nextGroups);
        setItems(nextItems);
        setSlots(nextSlots);
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
  return <CreateBranchPage />;
}

export function SettingsBranchManagementPage() {
  const [branches, setBranches] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const router = useRouter();

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

  function openBranch(branchId) {
    updateCurrentBranch(branchId);
    router.push(`/branch/${branchId}/dashboard`);
  }

  async function toggleBranch(branchId) {
    const nextBranches = branches.map((branch) => branch.id === branchId ? { ...branch, status: branch.status === "Active" ? "Inactive" : "Active" } : branch);
    const target = nextBranches.find((branch) => branch.id === branchId);
    await updateBranch(branchId, { status: target.status });
    await saveBranches(nextBranches);
    setBranches(nextBranches);
  }

  return (
    <BusinessSettingsShell title="Branch Management" subtitle="Manage every branch in this laundry business">
      {(session, business) => {
        const businessBranches = branches
          .filter((branch) => branch.laundryId === business.laundryId)
          .filter((branch) => session.role === "Laundry Owner" || session.branchIds?.includes(branch.id))
          .filter((branch) => status === "All" || branch.status === status)
          .filter((branch) => [branch.name, branch.code, branch.city, branch.manager].join(" ").toLowerCase().includes(query.toLowerCase()));
        return (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-xl font-black text-zinc-950">Branches</h2>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2">
                  <Search size={17} className="text-zinc-400" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full text-sm outline-none" placeholder="Search branch" />
                </div>
                <SelectInput value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option>All</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </SelectInput>
                {can(session, "create_branch") ? <Link href="/settings/branches/create"><Button><Plus size={17} /> Create branch</Button></Link> : null}
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Manager</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {businessBranches.map((branch) => (
                    <tr key={branch.id}>
                      <td className="px-4 py-4"><p className="font-bold text-zinc-950">{branch.name}</p><p className="text-xs font-semibold text-zinc-500">{branch.code}</p></td>
                      <td className="px-4 py-4 text-zinc-600">{branch.city}, {branch.state}</td>
                      <td className="px-4 py-4 text-zinc-600">{branch.manager}</td>
                      <td className="px-4 py-4 text-zinc-600">{branch.openingTime}-{branch.closingTime}</td>
                      <td className="px-4 py-4"><Badge tone={branch.status}>{branch.status}</Badge></td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" onClick={() => openBranch(branch.id)}>Open</Button>
                          {can(session, "create_branch") ? <Button variant="secondary" onClick={() => toggleBranch(branch.id)}>{branch.status === "Active" ? "Deactivate" : "Activate"}</Button> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!businessBranches.length ? <EmptyState title="No branches found" body="No branch records match these filters." /> : null}
          </section>
        );
      }}
    </BusinessSettingsShell>
  );
}

export function SettingsItemGroupsPage() {
  const { groups, setGroups } = useSettingsData();
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");

  async function addGroup(branch) {
    if (!groupName.trim()) return;
    const group = await createItemGroup({ laundryId: branch.laundryId, name: groupName.trim() });
    const nextGroups = [group, ...groups];
    await saveItemGroups(nextGroups);
    setGroups(nextGroups);
    setGroupName("");
    setShowGroupForm(false);
  }

  async function toggleGroup(groupId) {
    const nextGroups = groups.map((group) => group.id === groupId ? { ...group, status: group.status === "Active" ? "Inactive" : "Active" } : group);
    const target = nextGroups.find((group) => group.id === groupId);
    await updateItemGroup(groupId, { status: target.status });
    await saveItemGroups(nextGroups);
    setGroups(nextGroups);
  }

  return (
    <BusinessSettingsShell title="Item Groups" subtitle="Create and manage item groups used across the laundry business">
      {(session, business) => {
        const businessGroups = groups.filter((group) => group.laundryId === business.laundryId);
        return (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-zinc-950">Item Groups</h2>
            <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Group name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {businessGroups.map((group) => (
                    <tr key={group.id}>
                      <td className="px-4 py-4 font-bold text-zinc-950">{group.name}</td>
                      <td className="px-4 py-4"><Badge tone={group.status}>{group.status}</Badge></td>
                      <td className="px-4 py-4"><Button variant="secondary" onClick={() => toggleGroup(group.id)}>{group.status === "Active" ? "Deactivate" : "Activate"}</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="mt-5" onClick={() => setShowGroupForm((value) => !value)}><Plus size={17} /> Create item group</Button>
            {showGroupForm ? (
              <div className="mt-4 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[1fr_auto_auto]">
                <TextInput value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group name, e.g. Dry Cleaning" />
                <Button onClick={() => addGroup(business)}><CheckCircle2 size={17} /> Save group</Button>
                <Button variant="secondary" onClick={() => setShowGroupForm(false)}>Cancel</Button>
              </div>
            ) : null}
          </section>
        );
      }}
    </BusinessSettingsShell>
  );
}

export function SettingsItemsPage() {
  const { groups, items, setItems } = useSettingsData();
  const [showItemForm, setShowItemForm] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", shortCode: "", groupId: "", pricingMethod: "Fixed price", price: "", unitType: "Quantity", status: "Active" });

  async function addItem(branch) {
    if (!itemForm.name || !itemForm.shortCode || !itemForm.groupId || !itemForm.price) return;
    const item = await createServiceItem({ ...itemForm, laundryId: branch.laundryId, price: Number(itemForm.price || 0) });
    const nextItems = [item, ...items];
    await saveServiceItems(nextItems);
    setItems(nextItems);
    setItemForm({ name: "", shortCode: "", groupId: "", pricingMethod: "Fixed price", price: "", unitType: "Quantity", status: "Active" });
    setShowItemForm(false);
  }

  async function toggleItem(itemId) {
    const nextItems = items.map((item) => item.id === itemId ? { ...item, status: item.status === "Active" ? "Inactive" : "Active" } : item);
    const target = nextItems.find((item) => item.id === itemId);
    await updateServiceItem(itemId, { status: target.status });
    await saveServiceItems(nextItems);
    setItems(nextItems);
  }

  return (
    <BusinessSettingsShell title="Items" subtitle="Create and manage order items, prices, methods, and unit types">
      {(session, business) => {
        const businessGroups = groups.filter((group) => group.laundryId === business.laundryId);
        const businessItems = items.filter((item) => item.laundryId === business.laundryId);
        return (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-zinc-950">Items</h2>
            <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Group</th>
                    <th className="px-4 py-3">Pricing method</th>
                    <th className="px-4 py-3">Unit type</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {businessItems.map((item) => {
                    const group = businessGroups.find((current) => current.id === item.groupId);
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-4"><p className="font-bold text-zinc-950">{item.name}</p><p className="text-xs font-semibold text-zinc-500">{item.shortCode}</p></td>
                        <td className="px-4 py-4 text-zinc-600">{group?.name || "No group"}</td>
                        <td className="px-4 py-4 text-zinc-600">{item.pricingMethod}</td>
                        <td className="px-4 py-4 text-zinc-600">{item.unitType}</td>
                        <td className="px-4 py-4 font-bold text-zinc-950">{formatMoney(item.price)}</td>
                        <td className="px-4 py-4"><Badge tone={item.status}>{item.status}</Badge></td>
                        <td className="px-4 py-4"><Button variant="secondary" onClick={() => toggleItem(item.id)}>{item.status === "Active" ? "Deactivate" : "Activate"}</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Button className="mt-5" onClick={() => setShowItemForm((value) => !value)}><Plus size={17} /> Create item</Button>
            {showItemForm ? (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Item name"><TextInput value={itemForm.name} onChange={(event) => setItemForm((current) => ({ ...current, name: event.target.value }))} /></Field>
                  <Field label="Short code"><TextInput value={itemForm.shortCode} onChange={(event) => setItemForm((current) => ({ ...current, shortCode: event.target.value.toUpperCase() }))} /></Field>
                  <Field label="Group name">
                    <SelectInput value={itemForm.groupId} onChange={(event) => setItemForm((current) => ({ ...current, groupId: event.target.value }))}>
                      <option value="">Select group</option>
                      {businessGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </SelectInput>
                  </Field>
                  <Field label="Pricing method">
                    <SelectInput value={itemForm.pricingMethod} onChange={(event) => setItemForm((current) => ({ ...current, pricingMethod: event.target.value }))}>
                      <option>Fixed price</option>
                      <option>Per kilogram</option>
                    </SelectInput>
                  </Field>
                  <Field label={itemForm.pricingMethod === "Per kilogram" ? "Price per kilogram" : "Fixed price"}><TextInput type="number" min="0" step="0.01" value={itemForm.price} onChange={(event) => setItemForm((current) => ({ ...current, price: event.target.value }))} /></Field>
                  <Field label="Unit type">
                    <SelectInput value={itemForm.unitType} onChange={(event) => setItemForm((current) => ({ ...current, unitType: event.target.value }))}>
                      <option>Quantity</option>
                      <option>Kilogram</option>
                      <option>Meter</option>
                      <option>Pair</option>
                      <option>Set</option>
                    </SelectInput>
                  </Field>
                </div>
                <div className="mt-5 flex gap-3">
                  <Button onClick={() => addItem(business)}><Tag size={17} /> Save item</Button>
                  <Button variant="secondary" onClick={() => setShowItemForm(false)}>Cancel</Button>
                </div>
              </div>
            ) : null}
          </section>
        );
      }}
    </BusinessSettingsShell>
  );
}

export function SettingsTimeSlotsPage() {
  const { slots, setSlots } = useSettingsData();
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [slotLabel, setSlotLabel] = useState("");

  async function addSlot(branch) {
    if (!slotLabel.trim()) return;
    const slot = await createTimeSlot({ laundryId: branch.laundryId, label: slotLabel.trim() });
    const nextSlots = [slot, ...slots];
    await saveTimeSlots(nextSlots);
    setSlots(nextSlots);
    setSlotLabel("");
    setShowSlotForm(false);
  }

  async function toggleSlot(slotId) {
    const nextSlots = slots.map((slot) => slot.id === slotId ? { ...slot, status: slot.status === "Active" ? "Inactive" : "Active" } : slot);
    const target = nextSlots.find((slot) => slot.id === slotId);
    await updateTimeSlot(slotId, { status: target.status });
    await saveTimeSlots(nextSlots);
    setSlots(nextSlots);
  }

  return (
    <BusinessSettingsShell title="Time Slots" subtitle="Create and manage delivery time slots used across all branches">
      {(session, business) => {
        const businessSlots = slots.filter((slot) => slot.laundryId === business.laundryId);
        return (
          <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-zinc-950">Delivery Time Slots</h2>
            <div className="mt-5 overflow-hidden rounded-lg border border-zinc-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Time slot</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {businessSlots.map((slot) => (
                    <tr key={slot.id}>
                      <td className="px-4 py-4 font-bold text-zinc-950">{slot.label}</td>
                      <td className="px-4 py-4"><Badge tone={slot.status}>{slot.status}</Badge></td>
                      <td className="px-4 py-4"><Button variant="secondary" onClick={() => toggleSlot(slot.id)}>{slot.status === "Active" ? "Deactivate" : "Activate"}</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="mt-5" onClick={() => setShowSlotForm((value) => !value)}><Plus size={17} /> Create time slot</Button>
            {showSlotForm ? (
              <div className="mt-4 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[1fr_auto_auto]">
                <TextInput value={slotLabel} onChange={(event) => setSlotLabel(event.target.value)} placeholder="Example: 06:00 PM - 08:00 PM" />
                <Button onClick={() => addSlot(business)}><Clock3 size={17} /> Save slot</Button>
                <Button variant="secondary" onClick={() => setShowSlotForm(false)}>Cancel</Button>
              </div>
            ) : null}
          </section>
        );
      }}
    </BusinessSettingsShell>
  );
}
