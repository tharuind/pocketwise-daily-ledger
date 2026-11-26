import { useSyncExternalStore } from "react";

export type TxType = "expense" | "income";
export interface Category { id: string; name: string; type: TxType; icon: string; color: string }
export interface Account { id: string; name: string; icon: string; color: string; initial: number }
export interface Rec { id: string; type: TxType; amount: number; categoryId: string; accountId: string; date: string; note: string }
export interface Transfer { id: string; from: string; to: string; amount: number; date: string; note: string }
export interface Settings {
  currency: string; dark: boolean; budgetMode: boolean; budget: number; carryOver: boolean;
  futureRecurring: boolean; firstDayOfWeek: 0 | 1; firstDayOfMonth: number; passcode: string;
}
export interface State { categories: Category[]; accounts: Account[]; records: Rec[]; transfers: Transfer[]; settings: Settings }

const KEY = "monefy-clone-v1";
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const exp = (name: string, icon: string, color: string): Category => ({ id: uid(), name, type: "expense", icon, color });
const inc = (name: string, icon: string, color: string): Category => ({ id: uid(), name, type: "income", icon, color });

export function defaultState(): State {
  return {
    categories: [
      exp("Bills", "tag", "#e9b949"), exp("Car", "car", "#5aa9e6"), exp("Clothes", "shirt", "#c86bfa"),
      exp("Communications", "phone", "#4ecdc4"), exp("Eating out", "utensils", "#ff8a5b"), exp("Entertainment", "drama", "#f25f5c"),
      exp("Food", "shopping-basket", "#e05780"), exp("Gifts", "gift", "#ff6b9e"), exp("Health", "heart-pulse", "#ef476f"),
      exp("House", "house", "#4a90d9"), exp("Pets", "paw-print", "#b08968"), exp("Sports", "dumbbell", "#06b6d4"),
      exp("Taxi", "car-taxi-front", "#f4c430"), exp("Toiletry", "bath", "#7ed957"), exp("Transport", "bus", "#e4572e"),
      exp("Education", "book-open", "#2a9d8f"),
      inc("Salary", "wallet", "#2ecc8c"), inc("Deposits", "landmark", "#5aa9e6"), inc("Savings", "piggy-bank", "#e9b949"),
    ],
    accounts: [
      { id: uid(), name: "Cash", icon: "banknote", color: "#2ecc8c", initial: 0 },
      { id: uid(), name: "Payment card", icon: "credit-card", color: "#4a6cf7", initial: 0 },
    ],
    records: [], transfers: [],
    settings: { currency: "LKR", dark: true, budgetMode: false, budget: 0, carryOver: false, futureRecurring: false, firstDayOfWeek: 0, firstDayOfMonth: 1, passcode: "" },
  };
}

let state: State = defaultState();
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw) as State; state = { ...defaultState(), ...p, settings: { ...defaultState().settings, ...p.settings } }; }
  } catch { /* ignore */ }
}
function commit(next: State) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  listeners.forEach((l) => l());
}

const serverSnap = defaultState();
export function useStore(): State {
  return useSyncExternalStore(
    (l) => { load(); listeners.add(l); l(); return () => listeners.delete(l); },
    () => { load(); return state; },
    () => serverSnap,
  );
}

export const actions = {
  saveRecord(r: Omit<Rec, "id"> & { id?: string }) {
    const rec: Rec = { ...r, id: r.id ?? uid() };
    const exists = state.records.some((x) => x.id === rec.id);
    commit({ ...state, records: exists ? state.records.map((x) => (x.id === rec.id ? rec : x)) : [...state.records, rec] });
  },
  deleteRecord(id: string) { commit({ ...state, records: state.records.filter((r) => r.id !== id) }); },
  addTransfer(t: Omit<Transfer, "id">) { commit({ ...state, transfers: [...state.transfers, { ...t, id: uid() }] }); },
  deleteTransfer(id: string) { commit({ ...state, transfers: state.transfers.filter((t) => t.id !== id) }); },
  saveCategory(c: Omit<Category, "id"> & { id?: string }) {
    const cat: Category = { ...c, id: c.id ?? uid() };
    const exists = state.categories.some((x) => x.id === cat.id);
    commit({ ...state, categories: exists ? state.categories.map((x) => (x.id === cat.id ? cat : x)) : [...state.categories, cat] });
  },
  deleteCategory(id: string) { commit({ ...state, categories: state.categories.filter((c) => c.id !== id), records: state.records.filter((r) => r.categoryId !== id) }); },
  saveAccount(a: Omit<Account, "id"> & { id?: string }) {
    const acc: Account = { ...a, id: a.id ?? uid() };
    const exists = state.accounts.some((x) => x.id === acc.id);
    commit({ ...state, accounts: exists ? state.accounts.map((x) => (x.id === acc.id ? acc : x)) : [...state.accounts, acc] });
  },
  deleteAccount(id: string) {
    if (state.accounts.length <= 1) return;
    commit({ ...state, accounts: state.accounts.filter((a) => a.id !== id), records: state.records.filter((r) => r.accountId !== id), transfers: state.transfers.filter((t) => t.from !== id && t.to !== id) });
  },
  setSettings(p: Partial<Settings>) { commit({ ...state, settings: { ...state.settings, ...p } }); },
  replaceAll(s: State) { commit({ ...defaultState(), ...s, settings: { ...defaultState().settings, ...s.settings } }); },
  clearData() { commit({ ...state, records: [], transfers: [] }); },
  get: () => state,
};

export function accountBalance(s: State, accountId: string, until?: Date): number {
  const acc = s.accounts.find((a) => a.id === accountId);
  let b = acc?.initial ?? 0;
  const lim = until?.getTime() ?? Infinity;
  for (const r of s.records) if (r.accountId === accountId && new Date(r.date).getTime() < lim) b += r.type === "income" ? r.amount : -r.amount;
  for (const t of s.transfers) {
    if (new Date(t.date).getTime() >= lim) continue;
    if (t.from === accountId) b -= t.amount;
    if (t.to === accountId) b += t.amount;
  }
  return b;
}
