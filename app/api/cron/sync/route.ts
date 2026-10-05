import { google } from "googleapis";
import * as XLSX from "xlsx";

const wanted: Record<string, string> = { year:"TAHUN PROYEK", code:"KODE PROYEK", project:"NAMA PROYEK", customer:"NAMA PEMESAN", panel:"NAMA PANEL", pc:"NAMA PC", pe:"NAMA PE", sales:"NAMA SALES", termPayment:"TERM PAYMENT", pic:"PIC", phone:"KONTAK PIC", value:"HARGA PANEL", approvalTarget:"TARGET APPROVAL", approvalActual:"TERIMA APPROVAL", spkFinished:"SPK SELESAI", fgTarget:"TARGET FG (SPK)", fgActual:"FG (REAL FG)", deliveryTarget:"TARGET KIRIM (SESUAI SPK)", deliveryActual:"REAL KIRIM" };
const aliases: Record<string,string[]> = {termPayment:["TERM PAY","TERM OF PAYMENT","TERM PEMBAYARAN","PAYMENT TERM"],pic:["NAMA PIC","PIC PROYEK"],phone:["KONTAK","NO HP PIC","NO. HP PIC","NO TELP PIC","NO. TELP PIC","NO TELEPON PIC","NOMOR HP PIC","PHONE PIC","TELEPON PIC"],spkFinished:["TANGGAL SPK SELESAI","TGL SPK SELESAI"]};
const normalized=(v:unknown)=>String(v??"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const date = (v: unknown) => v instanceof Date ? v.toISOString().slice(0,10) : null;
const value = (v: unknown) => typeof v === "string" ? v.trim() || null : v ?? null;
function state(row: Record<string,unknown>) { if(row.deliveryActual)return "Terkirim"; if(row.fgActual)return "FG"; if(row.spkFinished)return "Produksi"; if(row.approvalActual)return "SPK"; if(row.approvalTarget)return "Approval"; return "Drawing"; }
function risk(row: Record<string,unknown>) { if(row.deliveryActual)return "Normal"; const due = [row.deliveryTarget,row.fgTarget,row.approvalTarget].find(v=>typeof v === "string") as string|undefined; if(!due)return "Normal"; const days=(new Date(`${due}T00:00:00`).getTime()-Date.now())/86400000; return days<0?"Terlambat":days<=14?"Perlu perhatian":"Normal"; }
function progressRank(row: Record<string,unknown>) { if(row.deliveryActual)return 5; if(row.fgActual)return 4; if(row.spkFinished)return 3; if(row.approvalActual)return 2; if(row.approvalTarget)return 1; return 0; }
async function supabase(path:string, init:RequestInit={}) { const key=process.env.SUPABASE_SECRET_KEY!; const response=await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init.headers||{})}}); if(!response.ok)throw new Error(`Supabase: ${await response.text()}`); }

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  try {
    const auth = new google.auth.JWT({ email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, key:process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g,"\n"), scopes:["https://www.googleapis.com/auth/drive.readonly"] });
    const drive=google.drive({version:"v3",auth});
    let fileId=process.env.GOOGLE_DRIVE_FILE_ID!;
    // Request the complete metadata object: partial-field syntax is rejected for
    // some Drive shortcut sources, while the full response works for every file type.
    let metadata=await drive.files.get({fileId});
    if(metadata.data.mimeType==="application/vnd.google-apps.shortcut" && metadata.data.shortcutDetails?.targetId){
      fileId=metadata.data.shortcutDetails.targetId;
      metadata=await drive.files.get({fileId});
    }
    console.log("Drive source", { fileId, mimeType: metadata.data.mimeType, name: metadata.data.name });
    const file=metadata.data.mimeType==="application/vnd.google-apps.spreadsheet"
      ? await drive.files.export({fileId,mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},{responseType:"stream"})
      : await drive.files.get({fileId,alt:"media"},{responseType:"stream"});
    const chunks: Buffer[]=[];
    for await (const chunk of file.data as AsyncIterable<Buffer|string>) chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
    const book=XLSX.read(Buffer.concat(chunks),{type:"buffer",cellDates:true});
    const sheet=book.Sheets["DATABASE"] || book.Sheets[book.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:null,raw:true});
    const headers=rows[1].map(value); const at: Record<string,number>=Object.fromEntries(headers.map((h,i)=>[normalized(h),i]));
    const column=(key:string,label:string)=>{for(const candidate of [label,...(aliases[key]||[])]){const index=at[normalized(candidate)];if(index!==undefined)return index;}return -1;};
    const sourceRows=rows.slice(2).map((cells,index)=>{ const row:Record<string,unknown>={}; for(const [key,label] of Object.entries(wanted)){const index=column(key,label),raw=index<0?null:cells[index]; row[key]=key.endsWith("Target")||key.endsWith("Actual")||key==="spkFinished"?date(raw):value(raw);} row.panelCode=value(cells[16]); row.bomCode=value(cells[17]); row.mainComponent=value(cells[29]); row.targetFg=date(cells[42]); row.m=value(cells[79]); row.em=value(cells[80]); row.el=value(cells[81]); row.qc=value(cells[82]); row.componentStatus=value(cells[83]); if(!row.code&&!row.project)return null; row.status=state(row); row.risk=risk(row); return {id:`row_${index}`,year:Number(row.year)||null,code:row.code,project:row.project,customer:row.customer,pc:row.pc||row.pe||row.sales,status:row.status,risk:row.risk,delivery_target:row.deliveryTarget,payload:row}; }).filter(Boolean) as Array<Record<string,any>>;
    const uniqueRows=new Map<string,Record<string,any>>();
    for(const candidate of sourceRows){
      const projectKey=normalized(candidate.project),panelCodeKey=normalized(candidate.payload?.panelCode);
      const id=projectKey&&panelCodeKey?`panel_${projectKey}_${panelCodeKey}`:candidate.id;
      const existing=uniqueRows.get(id);
      if(!existing||progressRank(candidate.payload)>=progressRank(existing.payload)) uniqueRows.set(id,{...candidate,id});
    }
    const projects=[...uniqueRows.values()];
    for(let i=0;i<projects.length;i+=500) await supabase("project_rows?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(projects.slice(i,i+500))});
    // Remove records created before Kode Panel became the stable panel identifier.
    await supabase("project_rows?id=like.*%3A%3A*",{method:"DELETE"});
    const active=projects.filter((p:any)=>p.status!=="Terkirim"); const summary={generatedAt:new Date().toISOString(),totalRows:projects.length,activeRows:active.length,lateRows:active.filter((p:any)=>p.risk==="Terlambat").length,attentionRows:active.filter((p:any)=>p.risk==="Perlu perhatian").length,activeValue:active.reduce((n:number,p:any)=>n+Number(p.payload.value||0),0)};
    await supabase("monitor_summary?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({id:"current",payload:summary})});
    return Response.json(summary);
  } catch(error) {
    console.error(error);
    const details = error instanceof Error ? error.message : "Kesalahan tidak dikenal";
    return Response.json({error:"Sinkronisasi gagal",details},{status:500});
  }
}
