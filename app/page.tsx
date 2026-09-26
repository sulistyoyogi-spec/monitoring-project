import { auth, signOut } from "@/auth";

type Row = { id:string; code:string|null; project:string|null; customer:string|null; pc:string|null; status:string; risk:string; delivery_target:string|null };
async function query(path: string) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  const response = await fetch(url, { headers: { apikey: process.env.SUPABASE_SECRET_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY!}` }, cache: "no-store" });
  if (!response.ok) throw new Error("Database dashboard tidak dapat dibaca.");
  return response.json();
}
export default async function Dashboard() {
  const session = await auth();
  const [summary] = await query("monitor_summary?id=eq.current&select=payload");
  const rows: Row[] = await query("project_rows?select=id,code,project,customer,pc,status,risk,delivery_target&status=neq.Terkirim&order=delivery_target.asc.nullslast&limit=250");
  const s = summary?.payload ?? {};
  return <main><header><div><p>OPERASIONAL PROYEK</p><h1>Monitor Proyek</h1><small>Terakhir sinkron: {s.generatedAt ? new Date(s.generatedAt).toLocaleString("id-ID") : "belum tersedia"}</small></div><form action={async()=>{"use server";await signOut({redirectTo:"/login"})}}><button>Keluar ({session?.user?.email})</button></form></header><section className="cards"><Card label="Proyek aktif" value={s.activeRows}/><Card label="Perlu perhatian" value={s.attentionRows}/><Card label="Terlambat" value={s.lateRows}/><Card label="Nilai aktif" value={new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(s.activeValue||0)}/></section><section className="table"><h2>Prioritas target pengiriman</h2><table><thead><tr><th>Proyek</th><th>Pelanggan</th><th>PIC</th><th>Status</th><th>Target</th><th>Risiko</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><b>{row.code||"Tanpa kode"}</b><small>{row.project}</small></td><td>{row.customer||"—"}</td><td>{row.pc||"—"}</td><td>{row.status}</td><td>{row.delivery_target||"—"}</td><td className={row.risk==="Terlambat"?"late":""}>{row.risk}</td></tr>)}</tbody></table></section></main>;
}
function Card({label,value}:{label:string;value:unknown}) { return <article><small>{label}</small><strong>{String(value??"—")}</strong></article>; }
