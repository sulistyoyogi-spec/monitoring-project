import { google } from "googleapis";
import * as XLSX from "xlsx";

const wanted: Record<string, string> = { year:"TAHUN PROYEK", code:"KODE PROYEK", project:"NAMA PROYEK", customer:"NAMA PEMESAN", panel:"NAMA PANEL", pc:"NAMA PC", pe:"NAMA PE", sales:"NAMA SALES", value:"HARGA PANEL", approvalTarget:"TARGET APPROVAL", approvalActual:"TERIMA APPROVAL", fgTarget:"TARGET FG (SPK)", fgActual:"FG (REAL FG)", deliveryTarget:"TARGET KIRIM (SESUAI SPK)", deliveryActual:"REAL KIRIM" };
const date = (v: unknown) => v instanceof Date ? v.toISOString().slice(0,10) : null;
const value = (v: unknown) => typeof v === "string" ? v.trim() || null : v ?? null;
function state(row: Record<string,unknown>) { if(row.deliveryActual)return "Terkirim"; if(row.fgActual)return "Siap kirim"; if(row.approvalActual)return "Produksi"; if(row.approvalTarget)return "Menunggu approval"; return "Perencanaan"; }
function risk(row: Record<string,unknown>) { if(row.deliveryActual)return "Normal"; const due = [row.deliveryTarget,row.fgTarget,row.approvalTarget].find(v=>typeof v === "string") as string|undefined; if(!due)return "Normal"; const days=(new Date(`${due}T00:00:00`).getTime()-Date.now())/86400000; return days<0?"Terlambat":days<=14?"Perlu perhatian":"Normal"; }
async function supabase(path:string, init:RequestInit={}) { const key=process.env.SUPABASE_SECRET_KEY!; const response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init.headers||{})}}); if(!response.ok)throw new Error(`Supabase: ${await response.text()}`); }

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  try {
    const auth = new google.auth.JWT({ email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key:process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g,"\n"), scopes:["https://www.googleapis.com/auth/drive.readonly"] });
    const drive=google.drive({version:"v3",auth});
    const file=await drive.files.get({fileId:process.env.GOOGLE_DRIVE_FILE_ID!,alt:"media"},{responseType:"arraybuffer"});
    const book=XLSX.read(Buffer.from(file.data as ArrayBuffer),{type:"buffer",cellDates:true});
    const sheet=book.Sheets["DATABASE"] || book.Sheets[book.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:null,raw:true});
    const headers=rows[1].map(value); const at: Record<string,number>=Object.fromEntries(headers.map((h,i)=>[h,i]));
    const projects=rows.slice(2).map((cells,index)=>{ const row:Record<string,unknown>={}; for(const [key,label] of Object.entries(wanted)){const raw=cells[at[label]]; row[key]=key.endsWith("Target")||key.endsWith("Actual")?date(raw):value(raw);} if(!row.code&&!row.project)return null; row.status=state(row); row.risk=risk(row); return {id:`${row.code||"tanpa-kode"}::${row.panel||index}`,year:Number(row.year)||null,code:row.code,project:row.project,customer:row.customer,pc:row.pc||row.pe||row.sales,status:row.status,risk:row.risk,delivery_target:row.deliveryTarget,payload:row}; }).filter(Boolean);
    for(let i=0;i<projects.length;i+=500) await supabase("project_rows?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(projects.slice(i,i+500))});
    const active=projects.filter((p:any)=>p.status!=="Terkirim"); const summary={generatedAt:new Date().toISOString(),totalRows:projects.length,activeRows:active.length,lateRows:active.filter((p:any)=>p.risk==="Terlambat").length,attentionRows:active.filter((p:any)=>p.risk==="Perlu perhatian").length,activeValue:active.reduce((n:number,p:any)=>n+Number(p.payload.value||0),0)};
    await supabase("monitor_summary?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:"current",payload:summary})});
    return Response.json(summary);
  } catch(error) { console.error(error); return Response.json({error:"Sinkronisasi gagal"},{status:500}); }
}
