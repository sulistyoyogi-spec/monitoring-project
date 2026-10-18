import Image from "next/image";
import { auth, signOut } from "@/auth";
import { revalidatePath } from "next/cache";
import DashboardClient, { type DashboardRow, type Forecast } from "@/app/dashboard-client";
import SyncButton from "@/app/sync-button";
import { GET as syncFromDrive } from "@/app/api/cron/sync/route";

type ApiRow = DashboardRow & { payload: Record<string, unknown> };
async function query(path: string) {
  const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: process.env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}` }, cache: "no-store" });
  if (!r.ok) throw new Error("Database dashboard tidak dapat dibaca.");
  return r.json();
}
async function queryAll(path: string) {
  const rows: ApiRow[] = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, { headers: { apikey: process.env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}`, Range: `${from}-${from + 999}` }, cache: "no-store" });
    if (!r.ok) throw new Error("Database dashboard tidak dapat dibaca.");
    const page: ApiRow[] = await r.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}
const admins = () => new Set((process.env.ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean));

export default async function Dashboard() {
  const session = await auth(), email = session?.user?.email?.toLowerCase() || "", isAdmin = admins().has(email);
  async function refresh(_formData: FormData) {
    "use server";
    const active = await auth(), activeEmail = active?.user?.email?.toLowerCase() || "";
    if (!admins().has(activeEmail)) return;
    const result = await syncFromDrive(new Request("http://internal/api/cron/sync", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    if (!result.ok) throw new Error("Sinkronisasi data gagal.");
    revalidatePath("/");
  }
  const [summary] = await query("monitor_summary?id=eq.current&select=payload"), rows = await queryAll("project_rows?select=id,code,project,customer,pc,status,risk,delivery_target,payload&order=delivery_target.asc.nullslast"), s = summary?.payload ?? {}, now = new Date(), fmtWib = (v: unknown) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(String(v))).replace(/:/g, ".") + " WIB", forecasts: Forecast[] = Array.isArray(s.forecasts) ? s.forecasts.filter((item: unknown): item is Forecast => Boolean(item) && typeof item === "object" && typeof (item as Forecast).label === "string" && Number.isFinite(Number((item as Forecast).production)) && Number.isFinite(Number((item as Forecast).spk)) && Number.isFinite(Number((item as Forecast).approval))).map((item: Forecast) => ({ ...item, year: Number(item.year) })).slice(0, 6) : [];
  return <main className="dashboard-main">
    <header className="topbar dashboard-topbar">
      <div className="dashboard-brand">
        <div className="dashboard-logo"><Image src="/logo-simetri.png" width={82} height={82} alt="Logo Simetri" priority /></div>
        <div className="dashboard-title"><p className="eyebrow">OPERASIONAL PROYEK · {now.getFullYear()}</p><h1>Monitoring Proyek</h1><p className="updated">{rows.length.toLocaleString("id-ID")} baris dibaca · sumber diperbarui {s.generatedAt ? fmtWib(s.generatedAt) : "belum tersedia"}</p></div>
      </div>
      <div className="actions"><span className="dashboard-account">{session?.user?.email || ""}</span>{isAdmin ? <SyncButton action={refresh} /> : <a className="refresh" href="/">↻ Refresh</a>}<form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}><button className="logout">Keluar</button></form></div>
    </header>
    <DashboardClient rows={rows} forecasts={forecasts} summary={s} userEmail="" detailBase="/project" />
  </main>;
}
