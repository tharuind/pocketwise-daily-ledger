export type PeriodKind = "day" | "week" | "month" | "year" | "all" | "interval";
export interface Period { kind: PeriodKind; anchor: Date; from?: Date; to?: Date }

const M = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const D = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function range(p: Period, fdw: number, fdm: number): [Date, Date] {
  const a = new Date(p.anchor); a.setHours(0, 0, 0, 0);
  switch (p.kind) {
    case "day": return [a, new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1)];
    case "week": { const off = (a.getDay() - fdw + 7) % 7; const s = new Date(a.getFullYear(), a.getMonth(), a.getDate() - off); return [s, new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)]; }
    case "month": { let s = new Date(a.getFullYear(), a.getMonth(), fdm); if (s > a) s = new Date(a.getFullYear(), a.getMonth() - 1, fdm); return [s, new Date(s.getFullYear(), s.getMonth() + 1, fdm)]; }
    case "year": return [new Date(a.getFullYear(), 0, 1), new Date(a.getFullYear() + 1, 0, 1)];
    case "all": return [new Date(1970, 0, 1), new Date(3000, 0, 1)];
    case "interval": { const f = p.from ?? a; const t = p.to ?? a; return [new Date(f.getFullYear(), f.getMonth(), f.getDate()), new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1)]; }
  }
}

export function shift(p: Period, dir: number): Period {
  const a = new Date(p.anchor);
  if (p.kind === "day") a.setDate(a.getDate() + dir);
  else if (p.kind === "week") a.setDate(a.getDate() + 7 * dir);
  else if (p.kind === "month") a.setMonth(a.getMonth() + dir);
  else if (p.kind === "year") a.setFullYear(a.getFullYear() + dir);
  else return p;
  return { ...p, anchor: a };
}

const fmt = (d: Date) => `${d.getDate()} ${M[d.getMonth()]?.slice(0, 3)} ${d.getFullYear()}`;
export function label(p: Period, fdw: number, fdm: number): [string, string] {
  const [s, e] = range(p, fdw, fdm); const last = new Date(e.getTime() - 86400000);
  switch (p.kind) {
    case "day": return [`${M[s.getMonth()]} ${s.getDate()}`, `${D[s.getDay()]}`];
    case "week": return [`${fmt(s)} – ${fmt(last)}`, "Week"];
    case "month": return [`${M[s.getMonth()]}`, `${s.getFullYear()}`];
    case "year": return [`${s.getFullYear()}`, "Year"];
    case "all": return ["All time", ""];
    case "interval": return [`${fmt(s)} – ${fmt(last)}`, "Interval"];
  }
}

export const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromInput = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1, 12); };
