import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft, ArrowLeftRight, EllipsisVertical, Menu, Minus, Plus, Settings as Gear, Wallet, NotebookTabs, CircleDollarSign,
  ChevronDown, CalendarDays, Lock, Upload, Info, CloudUpload, CloudDownload, DatabaseZap, Trash2, X, Check, Delete, List, ThumbsUp,
} from "lucide-react";
import { actions, accountBalance, useStore, type Category, type Rec, type State, type TxType, type Account } from "@/lib/monefy-store";
import { label, range, shift, toInput, fromInput, type Period, type PeriodKind } from "@/lib/period";
import { CURRENCIES, currencyName } from "@/lib/currencies";
import { Icon, ICONS, COLORS } from "./icons";

const fmtMoney = (n: number, c: string) => `${c}${n < 0 ? "-" : ""}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;

type RightView = null | "menu" | "categories" | "accounts" | "currencies" | "settings";

export function MonefyApp() {
  const s = useStore();
  const { settings } = s;
  const [period, setPeriod] = useState<Period>({ kind: "day", anchor: new Date() });
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState<RightView>(null);
  const [sheet, setSheet] = useState<null | { type: TxType; categoryId?: string; edit?: Rec }>(null);
  const [showList, setShowList] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("light", !settings.dark); }, [settings.dark]);

  const [from, to] = range(period, settings.firstDayOfWeek, settings.firstDayOfMonth);
  const inPeriod = useMemo(() => s.records.filter((r) => {
    const t = new Date(r.date).getTime();
    return t >= from.getTime() && t < to.getTime() && (accountFilter === "all" || r.accountId === accountFilter);
  }), [s.records, from, to, accountFilter]);

  const income = inPeriod.filter((r) => r.type === "income").reduce((a, r) => a + r.amount, 0);
  const expense = inPeriod.filter((r) => r.type === "expense").reduce((a, r) => a + r.amount, 0);
  const carry = settings.carryOver && period.kind !== "all"
    ? (accountFilter === "all" ? s.accounts.reduce((a, acc) => a + accountBalance(s, acc.id, from), 0) : accountBalance(s, accountFilter, from))
    : 0;
  const balance = settings.budgetMode ? settings.budget - expense : income - expense + carry;
  const [l1, l2] = label(period, settings.firstDayOfWeek, settings.firstDayOfMonth);
  const accName = accountFilter === "all" ? "All accounts" : s.accounts.find((a) => a.id === accountFilter)?.name ?? "All accounts";

  // swipe to change period
  const touch = useRef<number | null>(null);

  if (settings.passcode && !unlocked) return <PassLock code={settings.passcode} onOk={() => setUnlocked(true)} />;

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-background text-foreground select-none">
      <header className="z-30 flex h-16 shrink-0 items-center gap-3 bg-header px-3 text-header-foreground shadow-md">
        <button aria-label="Open periods" className="p-2" onClick={() => { setRight(null); setLeft(!left); }}>
          {left || right ? <ArrowLeft size={26} /> : <Menu size={26} />}
        </button>
        <div className="flex-1 leading-tight">
          <div className="font-script text-2xl">Monefy Pro</div>
          <div className="text-sm opacity-80">{accName}</div>
        </div>
        <button aria-label="Transfer" className="p-2" onClick={() => setTransfer(true)}><ArrowLeftRight size={24} /></button>
        <button aria-label="Open menu" className="p-2" onClick={() => { setLeft(false); setRight(right ? null : "menu"); }}><EllipsisVertical size={24} /></button>
      </header>

      <main
        className="relative flex flex-1 flex-col"
        onTouchStart={(e) => { touch.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const x = e.changedTouches[0]?.clientX; if (touch.current == null || x == null) return;
          const dx = x - touch.current; if (Math.abs(dx) > 60) setPeriod((p) => shift(p, dx < 0 ? 1 : -1)); touch.current = null;
        }}
      >
        <div className="flex justify-center gap-6 py-2 text-lg text-income">
          <button onClick={() => setPeriod((p) => shift(p, -1))} aria-label="Previous">‹</button>
          <span>{l1}</span><span className="opacity-80">{l2}</span>
          <button onClick={() => setPeriod((p) => shift(p, 1))} aria-label="Next">›</button>
        </div>
        <Ring s={s} records={inPeriod} income={income} expense={expense} cur={settings.currency}
          onPick={(c) => setSheet({ type: "expense", categoryId: c.id })} />
        <div className="flex items-center gap-4 px-6 pb-3">
          <button aria-label="Records" className="text-income" onClick={() => setShowList(true)}><List size={40} strokeWidth={1.2} /></button>
          <button onClick={() => setShowList(true)} className="flex-1 rounded bg-balance py-3 text-center text-2xl text-balance-foreground shadow">
            {settings.budgetMode ? "Budget " : "Balance "}{fmtMoney(balance, settings.currency)}
          </button>
        </div>
        <div className="flex justify-around pb-6">
          <button aria-label="Add expense" onClick={() => setSheet({ type: "expense" })} className="grid size-28 place-items-center rounded-full border-[6px] border-expense text-expense active:scale-95 transition"><Minus size={44} strokeWidth={3} /></button>
          <button aria-label="Add income" onClick={() => setSheet({ type: "income" })} className="grid size-28 place-items-center rounded-full border-[6px] border-income text-income active:scale-95 transition"><Plus size={44} strokeWidth={3} /></button>
        </div>
      </main>

      {(left || right) && <div className="absolute inset-0 top-16 z-10 bg-overlay" onClick={() => { setLeft(false); setRight(null); }} />}
      <LeftDrawer open={left} s={s} period={period} setPeriod={(p) => { setPeriod(p); setLeft(false); }} accountFilter={accountFilter} setAccountFilter={setAccountFilter} />
      <RightDrawer view={right} setView={setRight} s={s} />

      {showList && <RecordsList s={s} records={inPeriod} title={`${l1} ${l2}`} onClose={() => setShowList(false)} onEdit={(r) => setSheet({ type: r.type, edit: r })} cur={settings.currency} />}
      {sheet && <AddSheet s={s} init={sheet} defaultAccount={accountFilter === "all" ? s.accounts[0]?.id ?? "" : accountFilter} anchor={period.anchor} onClose={() => setSheet(null)} />}
      {transfer && <TransferSheet s={s} onClose={() => setTransfer(false)} />}
    </div>
  );
}

/* ---------------- Donut + icons ---------------- */
function Ring({ s, records, income, expense, cur, onPick }: { s: State; records: Rec[]; income: number; expense: number; cur: string; onPick: (c: Category) => void }) {
  const cats = s.categories.filter((c) => c.type === "expense");
  const slots = cats.slice(0, 12);
  const byCat = new Map<string, number>();
  for (const r of records) if (r.type === "expense") byCat.set(r.categoryId, (byCat.get(r.categoryId) ?? 0) + r.amount);
  const R = 70, C = 2 * Math.PI * R;
  let acc = 0;
  const segs = [...byCat.entries()].map(([id, v]) => {
    const cat = s.categories.find((c) => c.id === id); const len = expense ? (v / expense) * C : 0;
    const seg = { id, color: cat?.color ?? "#999", len, off: acc }; acc += len; return seg;
  });
  // positions: 4 top, 2 left, 2 right, 4 bottom
  const pos: [number, number][] = [[0,0],[1,0],[2,0],[3,0],[0,1],[3,1],[0,2],[3,2],[0,3],[1,3],[2,3],[3,3]];
  const total = expense || 1;
  return (
    <div className="relative mx-auto grid w-full flex-1 grid-cols-4 grid-rows-4 px-3">
      {slots.map((c, i) => {
        const p = pos[i]; if (!p) return null;
        const v = byCat.get(c.id) ?? 0;
        return (
          <button key={c.id} onClick={() => onPick(c)} style={{ gridColumn: p[0] + 1, gridRow: p[1] + 1 }}
            className="flex flex-col items-center justify-center gap-1 active:scale-90 transition" aria-label={c.name}>
            <Icon name={c.icon} color={c.color} size={46} />
            {v > 0 && <span className="text-xs" style={{ color: c.color }}>{Math.round((v / total) * 100)}%</span>}
          </button>
        );
      })}
      <div className="pointer-events-none col-start-2 col-end-4 row-start-2 row-end-4 grid place-items-center">
        <svg viewBox="0 0 200 200" className="w-full max-w-[220px]">
          <circle cx="100" cy="100" r={R} fill="none" className="stroke-ring-track" strokeWidth="34" />
          {segs.map((g) => (
            <circle key={g.id} cx="100" cy="100" r={R} fill="none" stroke={g.color} strokeWidth="34"
              strokeDasharray={`${g.len} ${C - g.len}`} strokeDashoffset={-g.off} transform="rotate(-90 100 100)" />
          ))}
          <text x="100" y="94" textAnchor="middle" className="fill-income" fontSize="15">{fmtMoney(income, cur)}</text>
          <text x="100" y="116" textAnchor="middle" className="fill-expense" fontSize="15">{fmtMoney(expense, cur)}</text>
        </svg>
      </div>
    </div>
  );
}

/* ---------------- Left drawer ---------------- */
function LeftDrawer({ open, s, period, setPeriod, accountFilter, setAccountFilter }: {
  open: boolean; s: State; period: Period; setPeriod: (p: Period) => void; accountFilter: string; setAccountFilter: (a: string) => void;
}) {
  const [dd, setDd] = useState(false);
  const [interval, setInterval] = useState(false);
  const [f, setF] = useState(toInput(new Date())); const [t, setT] = useState(toInput(new Date()));
  const cur = s.settings.currency;
  const sel = s.accounts.find((a) => a.id === accountFilter);
  const kinds: [PeriodKind, string][] = [["day","Day"],["week","Week"],["month","Month"],["year","Year"],["all","All"]];
  return (
    <aside className={`absolute bottom-0 left-0 top-16 z-20 w-[57%] overflow-y-auto bg-drawer p-3 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="relative">
        <button onClick={() => setDd(!dd)} className="flex w-full items-center gap-3 rounded border-2 border-income/70 px-2 py-1 text-left">
          {sel ? <Icon name={sel.icon} color={sel.color} size={34} /> : <Icon name="tag" color="#e9b949" size={34} />}
          <div className="flex-1 leading-tight"><div className="text-lg">{sel?.name ?? "All accounts"}</div><div className="text-sm opacity-70">{cur}</div></div>
          <ChevronDown className="text-income" size={18} />
        </button>
        {dd && (
          <div className="absolute inset-x-0 top-0 z-10 rounded bg-drawer-raised shadow-xl">
            {[{ id: "all", name: "All accounts", icon: "tag", color: "#e9b949" } as Pick<Account, "id"|"name"|"icon"|"color">, ...s.accounts].map((a) => (
              <button key={a.id} onClick={() => { setAccountFilter(a.id); setDd(false); }} className="flex w-full items-center gap-3 px-2 py-1 text-left hover:bg-section">
                <Icon name={a.icon} color={a.color} size={32} />
                <div className="leading-tight"><div className="text-lg truncate">{a.name}</div><div className="text-sm opacity-70">{cur}</div></div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-5 space-y-3">
        {kinds.map(([k, n]) => (
          <button key={k} onClick={() => setPeriod({ kind: k, anchor: new Date() })} className={`period-btn ${period.kind === k ? "bg-section" : ""}`}>{n}</button>
        ))}
        <button onClick={() => setInterval(!interval)} className={`period-btn ${period.kind === "interval" ? "bg-section" : ""}`}>Interval</button>
        {interval && (
          <div className="space-y-2 rounded border border-income/50 p-2 text-sm">
            <label className="flex items-center justify-between">From <input type="date" value={f} onChange={(e) => setF(e.target.value)} className="date-input" /></label>
            <label className="flex items-center justify-between">To <input type="date" value={t} onChange={(e) => setT(e.target.value)} className="date-input" /></label>
            <button className="w-full rounded bg-income py-1 text-income-foreground" onClick={() => setPeriod({ kind: "interval", anchor: fromInput(f), from: fromInput(f), to: fromInput(t) })}>Apply</button>
          </div>
        )}
        <label className="period-btn relative flex items-center justify-center gap-2">
          <CalendarDays className="text-income" size={22} /> Choose date
          <input type="date" className="absolute inset-0 opacity-0" onChange={(e) => e.target.value && setPeriod({ kind: "day", anchor: fromInput(e.target.value) })} />
        </label>
      </div>
    </aside>
  );
}

/* ---------------- Right drawer ---------------- */
function DrawerHead({ icon, title, onBack }: { icon: ReactNode; title: string; onBack?: () => void }) {
  return (
    <button onClick={onBack} className="relative flex w-full flex-col items-center gap-3 border-b-4 border-background py-6">
      <span className="text-teal">{icon}</span><span className="text-xl">{title}</span>
      <span className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 border-l-4 border-t-4 border-background bg-section" />
    </button>
  );
}
const Section = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between bg-section px-4 py-3 text-lg uppercase tracking-wide">{children}{right}</div>
);

function RightDrawer({ view, setView, s }: { view: RightView; setView: (v: RightView) => void; s: State }) {
  const back = () => setView("menu");
  return (
    <aside className={`absolute bottom-0 right-0 top-16 z-20 w-[57%] overflow-y-auto bg-drawer transition-transform duration-300 ${view ? "translate-x-0" : "translate-x-full"}`}>
      {view === "menu" && (
        <div className="flex flex-col items-center gap-12 py-10">
          {([["categories", NotebookTabs, "Categories"], ["accounts", Wallet, "Accounts"], ["currencies", CircleDollarSign, "Currencies"], ["settings", Gear, "Settings"]] as const).map(([v, I, n]) => (
            <button key={v} onClick={() => setView(v)} className="flex flex-col items-center gap-3"><I className="text-teal" size={56} strokeWidth={1.4} /><span className="text-xl">{n}</span></button>
          ))}
        </div>
      )}
      {view === "categories" && <CategoriesPanel s={s} back={back} />}
      {view === "accounts" && <AccountsPanel s={s} back={back} />}
      {view === "currencies" && <CurrenciesPanel s={s} back={back} />}
      {view === "settings" && <SettingsPanel s={s} back={back} />}
    </aside>
  );
}

function CategoriesPanel({ s, back }: { s: State; back: () => void }) {
  const [edit, setEdit] = useState<null | Partial<Category> & { type: TxType }>(null);
  const list = (t: TxType) => s.categories.filter((c) => c.type === t).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div>
      <DrawerHead icon={<NotebookTabs size={56} strokeWidth={1.4} />} title="Categories" onBack={back} />
      {(["expense", "income"] as TxType[]).map((t) => (
        <div key={t}>
          <Section right={<button aria-label="Add category" onClick={() => setEdit({ type: t, icon: "tag", color: COLORS[0] ?? "#e05780", name: "" })}><Plus size={30} strokeWidth={1.5} /></button>}>{t === "expense" ? "Expenses" : "Income"}</Section>
          {list(t).map((c) => (
            <button key={c.id} onClick={() => setEdit(c)} className="flex w-full items-center gap-4 px-4 py-2 text-left"><Icon name={c.icon} size={40} /><span className="truncate text-lg">{c.name}</span></button>
          ))}
        </div>
      ))}
      {edit && <ItemEditor title={edit.id ? "Edit category" : "New category"} init={edit} onClose={() => setEdit(null)}
        onSave={(v) => { actions.saveCategory({ ...v, type: edit.type, ...(edit.id ? { id: edit.id } : {}) }); setEdit(null); }}
        onDelete={edit.id ? () => { if (confirm("Delete category and its records?")) { actions.deleteCategory(edit.id!); setEdit(null); } } : undefined} />}
    </div>
  );
}

function AccountsPanel({ s, back }: { s: State; back: () => void }) {
  const [edit, setEdit] = useState<null | Partial<Account>>(null);
  const cur = s.settings.currency;
  return (
    <div>
      <DrawerHead icon={<Wallet size={56} strokeWidth={1.4} />} title="Accounts" onBack={back} />
      <Section right={<button aria-label="Add account" onClick={() => setEdit({ name: "", icon: "banknote", color: "#2ecc8c", initial: 0 })}><Plus size={30} strokeWidth={1.5} /></button>}><span className="normal-case">Add</span></Section>
      {[...s.accounts].sort((a, b) => a.name.localeCompare(b.name)).map((a) => (
        <button key={a.id} onClick={() => setEdit(a)} className="flex w-full items-center gap-4 px-4 py-2 text-left">
          <Icon name={a.icon} size={40} />
          <div className="leading-tight"><div className="text-lg">{a.name}</div><div className="text-sm opacity-70">{fmtMoney(accountBalance(s, a.id), cur)}</div></div>
        </button>
      ))}
      {edit && <ItemEditor title={edit.id ? "Edit account" : "New account"} init={edit} withInitial onClose={() => setEdit(null)}
        onSave={(v) => { actions.saveAccount({ ...v, initial: v.initial ?? 0, ...(edit.id ? { id: edit.id } : {}) }); setEdit(null); }}
        onDelete={edit.id && s.accounts.length > 1 ? () => { if (confirm("Delete account and its records?")) { actions.deleteAccount(edit.id!); setEdit(null); } } : undefined} />}
    </div>
  );
}

function CurrenciesPanel({ s, back }: { s: State; back: () => void }) {
  const c = s.settings.currency;
  const Row = ({ code, name }: { code: string; name: string }) => (
    <button onClick={() => actions.setSettings({ currency: code })} className="flex w-full items-center gap-4 px-4 py-1.5 text-left">
      <span className="w-14 border-2 border-foreground/80 py-0.5 text-center text-lg">{code}</span><span className="text-lg truncate">{name}</span>
    </button>
  );
  return (
    <div>
      <DrawerHead icon={<CircleDollarSign size={56} strokeWidth={1.4} />} title="Currencies" onBack={back} />
      <Section>Main currency</Section><Row code={c} name={currencyName(c)} />
      <Section right={<Info size={24} />}>Used</Section><Row code={c} name={currencyName(c)} />
      <Section>Others</Section>
      {CURRENCIES.filter(([k]) => k !== c).map(([k, n]) => <Row key={k} code={k} name={n} />)}
    </div>
  );
}

function Check2({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 px-4 py-3 text-left text-lg">
      <span className="grid size-8 place-items-center border-2 border-foreground/70">{on && <Check size={26} strokeWidth={3} />}</span>{children}
    </button>
  );
}
function SetRow({ children, right, onClick }: { children: ReactNode; right?: ReactNode; onClick?: () => void }) {
  return <button onClick={onClick} className="flex w-full items-center justify-between px-4 py-3 text-left text-lg">{children}<span>{right}</span></button>;
}

function SettingsPanel({ s, back }: { s: State; back: () => void }) {
  const st = s.settings; const file = useRef<HTMLInputElement>(null);
  const download = (name: string, text: string, type: string) => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click();
  };
  const exportCsv = () => {
    const rows = [["Date","Type","Account","Category","Amount","Currency","Note"], ...s.records.map((r) => [
      toInput(new Date(r.date)), r.type, s.accounts.find((a) => a.id === r.accountId)?.name ?? "", s.categories.find((c) => c.id === r.categoryId)?.name ?? "", String(r.amount), st.currency, r.note,
    ])];
    download(`monefy-${toInput(new Date())}.csv`, rows.map((r) => r.map((x) => `"${x.replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv");
  };
  return (
    <div>
      <DrawerHead icon={<Gear size={56} strokeWidth={1.4} />} title="Settings" onBack={back} />
      <Section>Balance</Section>
      <Check2 on={st.budgetMode} onClick={() => {
        if (!st.budgetMode) { const v = Number(prompt("Monthly budget amount", String(st.budget || ""))); if (!v) return; actions.setSettings({ budgetMode: true, budget: v }); }
        else actions.setSettings({ budgetMode: false });
      }}>Budget mode</Check2>
      <Check2 on={st.carryOver} onClick={() => actions.setSettings({ carryOver: !st.carryOver })}>Carry over</Check2>
      <Check2 on={st.futureRecurring} onClick={() => actions.setSettings({ futureRecurring: !st.futureRecurring })}>Future recurring records</Check2>
      <Section>General settings</Section>
      <Check2 on={st.dark} onClick={() => actions.setSettings({ dark: !st.dark })}>Dark theme</Check2>
      <SetRow right={<u>English</u>}>Language</SetRow>
      <SetRow right={<u>{st.currency}</u>}>Currency</SetRow>
      <SetRow onClick={() => actions.setSettings({ firstDayOfWeek: st.firstDayOfWeek === 0 ? 1 : 0 })} right={<u>{st.firstDayOfWeek === 0 ? "Sun" : "Mon"}</u>}>First day of week</SetRow>
      <SetRow onClick={() => { const v = Number(prompt("First day of month (1-28)", String(st.firstDayOfMonth))); if (v >= 1 && v <= 28) actions.setSettings({ firstDayOfMonth: v }); }} right={<u>{st.firstDayOfMonth}</u>}>First day of month</SetRow>
      <SetRow onClick={() => {
        if (st.passcode) { if (confirm("Turn off passcode?")) actions.setSettings({ passcode: "" }); return; }
        const p = prompt("Set a 4-digit passcode"); if (p && /^\d{4}$/.test(p)) actions.setSettings({ passcode: p });
      }} right={<Lock size={30} className={st.passcode ? "text-teal" : ""} />}>Passcode protection</SetRow>
      <SetRow right={<ThumbsUp size={30} strokeWidth={1.3} />}>Review application</SetRow>
      <SetRow onClick={exportCsv} right={<Upload size={30} strokeWidth={1.3} />}>Export to file</SetRow>
      <SetRow onClick={() => alert("Monefy Pro clone — simple money tracker. Data stays on this device.")}>About Monefy</SetRow>
      <SetRow onClick={() => alert("All your data is stored only on this device.")}>Privacy Policy</SetRow>
      <Section>Data backup</Section>
      <SetRow onClick={() => download(`monefy-backup-${toInput(new Date())}.json`, JSON.stringify(s), "application/json")}><span className="flex items-center gap-2"><CloudUpload size={28} strokeWidth={1.3} />Create data backup</span></SetRow>
      <SetRow onClick={() => file.current?.click()}><span className="flex items-center gap-2"><CloudDownload size={28} strokeWidth={1.3} />Restore data</span></SetRow>
      <input ref={file} type="file" accept="application/json" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        try { actions.replaceAll(JSON.parse(await f.text()) as State); alert("Data restored"); } catch { alert("Invalid backup file"); }
      }} />
      <SetRow onClick={() => confirm("Delete all records? This cannot be undone.") && actions.clearData()}><span className="flex items-center gap-2"><DatabaseZap size={28} strokeWidth={1.3} />Clear data</span></SetRow>
      <div className="h-8" />
    </div>
  );
}

/* ---------------- Editors / sheets ---------------- */
function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-lg bg-drawer p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function ItemEditor({ title, init, withInitial, onSave, onClose, onDelete }: {
  title: string; init: { name?: string | undefined; icon?: string | undefined; color?: string | undefined; initial?: number | undefined }; withInitial?: boolean;
  onSave: (v: { name: string; icon: string; color: string; initial?: number }) => void; onClose: () => void; onDelete?: (() => void) | undefined;
}) {
  const [name, setName] = useState(init.name ?? ""); const [icon, setIcon] = useState(init.icon ?? "tag");
  const [color, setColor] = useState(init.color ?? "#2ecc8c"); const [initial, setInitial] = useState(String(init.initial ?? 0));
  return (
    <Modal onClose={onClose}>
      <h2 className="mb-3 text-xl">{title}</h2>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="mb-3 w-full rounded bg-background px-3 py-2 outline-none" />
      {withInitial && <input type="number" value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="Initial balance" className="mb-3 w-full rounded bg-background px-3 py-2 outline-none" />}
      <div className="mb-3 flex flex-wrap gap-2">{COLORS.map((c) => <button key={c} aria-label={c} onClick={() => setColor(c)} className={`size-7 rounded-full ${color === c ? "ring-2 ring-foreground" : ""}`} style={{ background: c }} />)}</div>
      <div className="grid grid-cols-6 gap-2">{Object.keys(ICONS).map((k) => (
        <button key={k} onClick={() => setIcon(k)} className={`grid place-items-center rounded p-1 ${icon === k ? "bg-section" : ""}`}><Icon name={k} color={color} size={30} /></button>
      ))}</div>
      <div className="mt-4 flex gap-2">
        {onDelete && <button onClick={onDelete} className="rounded bg-expense px-3 py-2 text-expense-foreground"><Trash2 size={18} /></button>}
        <button onClick={onClose} className="flex-1 rounded bg-section py-2">Cancel</button>
        <button disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), icon, color, initial: Number(initial) || 0 })} className="flex-1 rounded bg-income py-2 text-income-foreground disabled:opacity-50">Save</button>
      </div>
    </Modal>
  );
}

function evalExpr(e: string): number {
  const toks = e.match(/\d+\.?\d*|[+\-×÷]/g) ?? [];
  const nums: number[] = []; const ops: string[] = [];
  for (const t of toks) { if (/[+\-×÷]/.test(t)) ops.push(t); else nums.push(parseFloat(t)); }
  // handle × ÷ first
  const n2: number[] = [nums[0] ?? 0]; const o2: string[] = [];
  ops.forEach((o, i) => { const b = nums[i + 1]; if (b === undefined) return; if (o === "×" || o === "÷") { const a = n2.pop() ?? 0; n2.push(o === "×" ? a * b : b ? a / b : 0); } else { o2.push(o); n2.push(b); } });
  return Math.round(o2.reduce((a, o, i) => (o === "+" ? a + (n2[i + 1] ?? 0) : a - (n2[i + 1] ?? 0)), n2[0] ?? 0) * 100) / 100;
}

function AddSheet({ s, init, defaultAccount, anchor, onClose }: { s: State; init: { type: TxType; categoryId?: string; edit?: Rec }; defaultAccount: string; anchor: Date; onClose: () => void }) {
  const e = init.edit;
  const [type, setType] = useState<TxType>(e?.type ?? init.type);
  const [expr, setExpr] = useState(e ? String(e.amount) : "");
  const [account, setAccount] = useState(e?.accountId ?? defaultAccount);
  const [date, setDate] = useState(toInput(e ? new Date(e.date) : anchor));
  const [note, setNote] = useState(e?.note ?? "");
  const [cat, setCat] = useState<string | undefined>(e?.categoryId ?? init.categoryId);
  const [picking, setPicking] = useState(false);
  const color = type === "expense" ? "text-expense" : "text-income";
  const press = (k: string) => {
    if (k === "⌫") return setExpr((x) => x.slice(0, -1));
    if (/[+\-×÷]/.test(k)) return setExpr((x) => (x === "" ? x : /[+\-×÷]$/.test(x) ? x.slice(0, -1) + k : x + k));
    if (k === ".") { const last = expr.split(/[+\-×÷]/).pop() ?? ""; if (last.includes(".")) return; }
    setExpr((x) => x + k);
  };
  const amount = evalExpr(expr);
  const save = (categoryId: string) => {
    if (amount <= 0 || !account) return;
    actions.saveRecord({ ...(e ? { id: e.id } : {}), type, amount, categoryId, accountId: account, date: fromInput(date).toISOString(), note });
    onClose();
  };
  const cats = s.categories.filter((c) => c.type === type);
  return (
    <div className="fixed inset-0 z-40 mx-auto flex max-w-md flex-col bg-background">
      <div className="flex items-center gap-3 bg-header px-3 py-3 text-header-foreground">
        <button aria-label="Close" onClick={onClose}><ArrowLeft size={26} /></button>
        <div className="flex flex-1 gap-2">
          {(["expense", "income"] as TxType[]).map((t) => <button key={t} onClick={() => { setType(t); setCat(undefined); }} className={`rounded px-3 py-1 ${type === t ? (t === "expense" ? "bg-expense text-expense-foreground" : "bg-income text-income-foreground") : ""}`}>{t === "expense" ? "Expense" : "Income"}</button>)}
        </div>
        {e && <button aria-label="Delete" onClick={() => { actions.deleteRecord(e.id); onClose(); }}><Trash2 size={22} /></button>}
      </div>
      {picking ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 text-center text-lg">Choose category</div>
          <div className="grid grid-cols-4 gap-y-4">
            {cats.map((c) => <button key={c.id} onClick={() => save(c.id)} className="flex flex-col items-center gap-1 text-xs"><Icon name={c.icon} color={c.color} size={44} /><span className="max-w-full truncate px-1">{c.name}</span></button>)}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-4 pt-3">
            <select value={account} onChange={(ev) => setAccount(ev.target.value)} className="flex-1 rounded bg-drawer px-2 py-2">
              {s.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} className="date-input rounded bg-drawer px-2 py-2" />
          </div>
          <div className={`px-4 pt-4 text-right ${color}`}>
            <div className="min-h-6 text-lg opacity-70">{/[+\-×÷]/.test(expr) ? expr : ""}</div>
            <div className="text-5xl font-light">{s.settings.currency} {expr === "" ? "0" : amount}</div>
          </div>
          <input value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Note" className="mx-4 mt-3 border-b border-foreground/30 bg-transparent py-2 outline-none" />
          {cat && <div className="mx-4 mt-2 flex items-center gap-2 text-sm opacity-80"><Icon name={s.categories.find((c) => c.id === cat)?.icon ?? "tag"} color={s.categories.find((c) => c.id === cat)?.color} size={22} />{s.categories.find((c) => c.id === cat)?.name}</div>}
          <div className="mt-auto grid grid-cols-4 bg-drawer">
            {["7","8","9","÷","4","5","6","×","1","2","3","-",".","0","⌫","+"].map((k) => (
              <button key={k} onClick={() => press(k)} className={`h-16 border border-background text-2xl active:bg-section ${/[+\-×÷]/.test(k) ? "text-teal" : ""}`}>{k === "⌫" ? <Delete className="mx-auto" /> : k}</button>
            ))}
          </div>
          <button disabled={amount <= 0} onClick={() => (cat ? save(cat) : setPicking(true))}
            className={`py-5 text-xl uppercase tracking-wider disabled:opacity-50 ${type === "expense" ? "bg-expense text-expense-foreground" : "bg-income text-income-foreground"}`}>
            {cat ? (e ? "Save" : `Add ${type}`) : "Choose category"}
          </button>
        </>
      )}
    </div>
  );
}

function TransferSheet({ s, onClose }: { s: State; onClose: () => void }) {
  const [from, setFrom] = useState(s.accounts[0]?.id ?? ""); const [to, setTo] = useState(s.accounts[1]?.id ?? s.accounts[0]?.id ?? "");
  const [amt, setAmt] = useState(""); const [date, setDate] = useState(toInput(new Date())); const [note, setNote] = useState("");
  const cur = s.settings.currency;
  return (
    <Modal onClose={onClose}>
      <div className="mb-4 flex items-center justify-between"><h2 className="text-xl">Transfer</h2><button aria-label="Close" onClick={onClose}><X /></button></div>
      <label className="mb-1 block text-sm opacity-70">From</label>
      <select value={from} onChange={(e) => setFrom(e.target.value)} className="mb-3 w-full rounded bg-background px-2 py-2">{s.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({fmtMoney(accountBalance(s, a.id), cur)})</option>)}</select>
      <label className="mb-1 block text-sm opacity-70">To</label>
      <select value={to} onChange={(e) => setTo(e.target.value)} className="mb-3 w-full rounded bg-background px-2 py-2">{s.accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({fmtMoney(accountBalance(s, a.id), cur)})</option>)}</select>
      <input type="number" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="Amount" className="mb-3 w-full rounded bg-background px-3 py-2" />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="date-input mb-3 w-full rounded bg-background px-3 py-2" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note" className="mb-4 w-full rounded bg-background px-3 py-2" />
      <button disabled={!(Number(amt) > 0) || from === to} onClick={() => { actions.addTransfer({ from, to, amount: Number(amt), date: fromInput(date).toISOString(), note }); onClose(); }}
        className="w-full rounded bg-income py-3 text-income-foreground disabled:opacity-50">Transfer</button>
      {s.transfers.length > 0 && <div className="mt-4 space-y-1 text-sm">
        <div className="opacity-70">Recent transfers</div>
        {[...s.transfers].reverse().slice(0, 8).map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2">
            <span className="truncate">{s.accounts.find((a) => a.id === t.from)?.name} → {s.accounts.find((a) => a.id === t.to)?.name}</span>
            <span>{fmtMoney(t.amount, cur)}</span><button aria-label="Delete transfer" onClick={() => actions.deleteTransfer(t.id)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>}
    </Modal>
  );
}

function RecordsList({ s, records, title, onClose, onEdit, cur }: { s: State; records: Rec[]; title: string; onClose: () => void; onEdit: (r: Rec) => void; cur: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = new Map<string, Rec[]>();
  for (const r of records) groups.set(r.categoryId, [...(groups.get(r.categoryId) ?? []), r]);
  const sorted = [...groups.entries()].map(([id, rs]) => ({ id, rs, total: rs.reduce((a, r) => a + r.amount, 0), cat: s.categories.find((c) => c.id === id) }))
    .sort((a, b) => (a.cat?.type === b.cat?.type ? b.total - a.total : a.cat?.type === "income" ? -1 : 1));
  const all = records.reduce((a, r) => a + (r.type === "expense" ? r.amount : 0), 0) || 1;
  return (
    <div className="fixed inset-0 z-30 mx-auto flex max-w-md flex-col bg-background">
      <div className="flex items-center gap-3 bg-header px-3 py-4 text-header-foreground">
        <button aria-label="Close list" onClick={onClose}><ArrowLeft size={26} /></button><span className="text-lg">{title}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 && <p className="p-8 text-center opacity-60">No records for this period. Tap + or − to add one.</p>}
        {sorted.map((g) => (
          <div key={g.id} className="border-b border-foreground/10">
            <button onClick={() => setOpen(open === g.id ? null : g.id)} className="flex w-full items-center gap-3 px-4 py-3">
              <Icon name={g.cat?.icon ?? "tag"} color={g.cat?.color} size={36} />
              <span className="flex-1 text-left text-lg">{g.cat?.name ?? "—"}</span>
              {g.cat?.type === "expense" && <span className="text-sm opacity-60">{Math.round((g.total / all) * 100)}%</span>}
              <span className={g.cat?.type === "income" ? "text-income" : "text-expense"}>{fmtMoney(g.total, cur)}</span>
            </button>
            {open === g.id && g.rs.sort((a, b) => b.date.localeCompare(a.date)).map((r) => (
              <button key={r.id} onClick={() => onEdit(r)} className="flex w-full items-center gap-3 bg-drawer px-6 py-2 text-left text-sm">
                <span className="opacity-70">{toInput(new Date(r.date))}</span>
                <span className="flex-1 truncate">{s.accounts.find((a) => a.id === r.accountId)?.name}{r.note ? ` · ${r.note}` : ""}</span>
                <span>{fmtMoney(r.amount, cur)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PassLock({ code, onOk }: { code: string; onOk: () => void }) {
  const [v, setV] = useState("");
  useEffect(() => { if (v.length === 4) { if (v === code) onOk(); else setTimeout(() => setV(""), 300); } }, [v, code, onOk]);
  return (
    <div className="mx-auto flex h-[100dvh] max-w-md flex-col items-center justify-center gap-6 bg-background text-foreground">
      <div className="font-script text-4xl">Monefy Pro</div><Lock className="text-teal" size={40} />
      <div className="flex gap-3">{[0,1,2,3].map((i) => <span key={i} className={`size-4 rounded-full border-2 border-teal ${i < v.length ? "bg-teal" : ""}`} />)}</div>
      <div className="grid grid-cols-3 gap-4">
        {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((k, i) => k ? (
          <button key={i} onClick={() => setV((x) => (k === "⌫" ? x.slice(0, -1) : (x + k).slice(0, 4)))} className="size-16 rounded-full bg-drawer text-2xl">{k}</button>
        ) : <span key={i} />)}
      </div>
    </div>
  );
}
