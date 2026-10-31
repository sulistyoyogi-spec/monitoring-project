"use client";

import {useRef,useState} from "react";

type PanelExport={
  status:string;panel:string;qty:number;fs:string;wm:string;price:number;targetApproval:string;realApproval:string;spk:string;spkDate:string;targetFg:string;bom:string;m:string;em:string;el:string;qc:string;realFg:string;realDelivery:string;
};
type DetailExport={
  name:string;code:string;customer:string;pe:string;pic:string;phone:string;term:string;componentSummary:string[];totalPanels:number;totalValue:number;approval:string;production:string;fg:string;delivery:string;timeline:{approvalTarget:string;approvalActual:string;spkFinished:string;targetFg:string;realFg:string;deliveryTarget:string;realDelivery:string;productionProgress:number};panels:PanelExport[];
};

const rupiah=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
const safeFileName=(value:string)=>value.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"proyek";
const empty=(value:string)=>value||"—";
const ascii=(value:string)=>value.replace(/[^\x20-\x7e]/g,"-");
const pdfEscape=(value:string)=>ascii(value).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
const cut=(value:string,length:number)=>ascii(value).length>length?`${ascii(value).slice(0,Math.max(0,length-1))}.`:ascii(value);
const download=(blob:Blob,fileName:string)=>{const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const day=(value:string)=>{const date=new Date(`${value}T00:00:00`);return Number.isNaN(date.getTime())?null:date;};
const iso=(value:Date)=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
const addDays=(value:Date,days:number)=>{const next=new Date(value);next.setDate(next.getDate()+days);return next;};
const roman=(month:number)=>["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][month-1];

function makePdf(data:DetailExport){
  const width=841.89,height=595.28,margin=18,rowsPerPage=35;
  const header=["Status","Nama panel","Qty","FS","WM","Harga","Tgt App","Real App","SPK","Tgl SPK","Tgt FG","BOM","M","EM","EL","QC","Real FG","Kirim"];
  const positions=[18,53,149,169,183,197,244,283,322,349,387,425,458,476,494,512,530,569];
  const limits=[7,22,3,3,3,11,9,9,6,10,9,9,4,4,4,4,9,9];
  const commands:string[]=[];
  const textAt=(x:number,y:number,size:number,value:string,bold=false)=>commands.push(`${bold?"0.08 0.22 0.42":"0.06 0.13 0.25"} rg BT /F${bold?2:1} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);
  const line=(x1:number,y1:number,x2:number,y2:number)=>commands.push(`0.85 0.9 0.96 RG 0.4 w ${x1} ${y1} m ${x2} ${y2} l S`);
  const drawPage=(page:number,start:number)=>{
    commands.push("q 0.97 0.985 1 rg 0 0 841.89 595.28 re f Q");
    textAt(margin,565,16,"MONITORING PROYEK SIMETRI",true);textAt(margin,548,12,cut(data.name,100),true);
    textAt(margin,536,7,`Kode: ${empty(data.code)} | PE: ${empty(data.pe)} | Nilai PO: ${rupiah(data.totalValue)}`);
    textAt(margin,526,7,`PT: ${empty(data.customer)} | PIC: ${empty(data.pic)} | Kontak: ${empty(data.phone)}`);
    if(page===0){textAt(margin,516,7,`Term payment: ${cut(empty(data.term),150)}`);textAt(margin,506,7,`Total panel: ${data.totalPanels} | Approval: ${data.approval} | Produksi: ${data.production} | FG: ${data.fg} | Kirim: ${data.delivery}`);textAt(margin,496,7,`Status komponen: ${cut(data.componentSummary.length?data.componentSummary.join("; "):"Tidak ada kekurangan komponen.",145)}`);}
    const tableTop=page===0?480:516;
    commands.push(`0.91 0.95 0.99 rg ${margin} ${tableTop-12} 806 14 re f`);
    header.forEach((label,index)=>textAt(positions[index],tableTop-7,5.2,label,true));
    line(margin,tableTop-13,824,tableTop-13);
    data.panels.slice(start,start+rowsPerPage).forEach((panel,index)=>{const y=tableTop-24-index*12;const cells=[panel.status,panel.panel,String(panel.qty),panel.fs,panel.wm,rupiah(panel.price),panel.targetApproval,panel.realApproval,panel.spk,panel.spkDate,panel.targetFg,panel.bom,panel.m,panel.em,panel.el,panel.qc,panel.realFg,panel.realDelivery];cells.forEach((cell,cellIndex)=>textAt(positions[cellIndex],y,5.1,cut(cell,limits[cellIndex])));line(margin,y-4,824,y-4);});
    textAt(margin,12,6,`Halaman ${page+1} dari ${Math.max(1,Math.ceil(data.panels.length/rowsPerPage))}`);textAt(690,12,6,`Dicetak ${new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jakarta"}).format(new Date())}`);
  };
  const pages=Math.max(1,Math.ceil(data.panels.length/rowsPerPage));const streams:string[]=[];
  for(let page=0;page<pages;page++){commands.length=0;drawPage(page,page*rowsPerPage);streams.push(commands.join("\n"));}
  const objects:string[]=["<< /Type /Catalog /Pages 2 0 R >>",`<< /Type /Pages /Kids [${streams.map((_,index)=>`${5+index*2} 0 R`).join(" ")}] /Count ${streams.length} >>`,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`];
  streams.forEach((stream,index)=>{const pageId=5+index*2,contentId=pageId+1;objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);});
  let pdf="%PDF-1.4\n%PDF-export\n",offset=pdf.length;const offsets=[0];objects.forEach((object,index)=>{offsets.push(offset);const item=`${index+1} 0 obj\n${object}\nendobj\n`;pdf+=item;offset+=item.length;});const xref=offset;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(value=>`${String(value).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf],{type:"application/pdf"});
}

function makeTimelinePdf(data:DetailExport){
  const width=595.28,height=841.89,left=44,right=551,tableTop=500,rowHeight=25,labelWidth=180,gridLeft=left+labelWidth,gridWidth=right-gridLeft,weeks=16,weekWidth=gridWidth/weeks;
  const todayParts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const currentYear=Number(todayParts.find(part=>part.type==="year")?.value),currentMonth=Number(todayParts.find(part=>part.type==="month")?.value),currentDay=Number(todayParts.find(part=>part.type==="day")?.value),today=new Date(currentYear,currentMonth-1,currentDay);
  const timeline=data.timeline, milestones=[timeline.approvalTarget,timeline.approvalActual,timeline.spkFinished,timeline.targetFg,timeline.realFg,timeline.deliveryTarget,timeline.realDelivery].map(day).filter((value):value is Date=>Boolean(value));
  const earliest=milestones.length?new Date(Math.min(...milestones.map(value=>value.getTime()))):today,start=addDays(earliest,-14),monday=addDays(start,(8-start.getDay())%7),end=addDays(monday,weeks*7-1);
  const commands:string[]=[];const textAt=(x:number,y:number,size:number,value:string,bold=false,color="0.05 0.10 0.17")=>commands.push(`${color} rg BT /F${bold?2:1} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET`);const line=(x1:number,y1:number,x2:number,y2:number,width=0.45)=>commands.push(`0.12 0.14 0.17 RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`);const box=(x:number,y:number,w:number,h:number,color:string)=>commands.push(`${color} rg ${x} ${y} ${w} ${h} re f`);
  commands.push("q 1 1 1 rg 0 0 595.28 841.89 re f Q");
  box(left,778,58,5,"0.76 0.06 0.14");box(left+58,778,80,5,"0.02 0.30 0.52");textAt(left,800,23,"simetri",true,"0.02 0.30 0.52");textAt(left,787,8,"MONITORING PROJECT",true,"0.02 0.30 0.52");
  textAt(left,746,11,`No :  / SMP / CS / ${roman(currentMonth)} / ${currentYear}`);textAt(389,746,10,`Jakarta, ${new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric",timeZone:"Asia/Jakarta"}).format(new Date())}`);
  textAt(left,720,11,"Kepada Yth,");textAt(left,704,12,ascii(data.customer||"Pelanggan"),true);textAt(left,688,11,"Di Tempat");
  textAt(left,649,11,"Hal",true);textAt(left+105,649,11,": TIME SCHEDULE PRODUKSI PANEL - TR (FAT)",true);textAt(left,625,11,"Proyek",true);textAt(left+105,625,11,`: ${cut(data.name,55)}`,true);
  textAt(left,588,10,"Berikut rencana time line produksi dan jadwal FAT berdasarkan target proyek",false);textAt(left,575,10,"serta progres produksi yang tercatat pada database.",false);
  line(left,tableTop,right,tableTop);line(left,tableTop-31,right,tableTop-31);line(left,tableTop-56,right,tableTop-56);line(left,tableTop-56,left,tableTop-56-rowHeight*8);line(left+30,tableTop,left+30,tableTop-56-rowHeight*8);line(gridLeft,tableTop,gridLeft,tableTop-56-rowHeight*8);line(right,tableTop,right,tableTop-56-rowHeight*8);
  textAt(left+8,tableTop-37,8,"NO",true);textAt(left+75,tableTop-37,8,"PROSES",true);textAt(gridLeft+gridWidth/2-42,tableTop-16,8,"TIME LINE PRODUKSI",true);
  for(let week=0;week<weeks;week++){const x=gridLeft+week*weekWidth;line(x,tableTop-31,x,tableTop-56-rowHeight*8);const weekDate=addDays(monday,week*7);textAt(x+1,tableTop-47,6,String(Math.ceil((Date.UTC(weekDate.getFullYear(),weekDate.getMonth(),weekDate.getDate())-Date.UTC(weekDate.getFullYear(),0,1))/604800000)+1),true);if(week===0||weekDate.getMonth()!==addDays(weekDate,-7).getMonth())textAt(x+2,tableTop-40,5.6,new Intl.DateTimeFormat("id-ID",{month:"short"}).format(weekDate).toUpperCase(),true);}
  const phases=[
    ["PENGAJUAN GAMBAR APPROVAL",addDays(monday,0),timeline.approvalActual||timeline.approvalTarget,"0.02 0.45 0.75"],
    ["TERIMA APPROVAL & DP",timeline.approvalActual||timeline.approvalTarget,timeline.approvalActual||timeline.approvalTarget,"0.02 0.45 0.75"],
    ["FABRIKASI PANEL BOX METAL",addDays(day(timeline.targetFg)||end,-28),addDays(day(timeline.targetFg)||end,-14),"0.02 0.45 0.75"],
    ["PROSES ASSEMBLY DAN WIRING",addDays(day(timeline.targetFg)||end,-21),timeline.realFg||timeline.targetFg,"0.02 0.45 0.75"],
    ["PENGADAAN KOMPONEN",addDays(day(timeline.targetFg)||end,-35),addDays(day(timeline.targetFg)||end,-21),"0.02 0.45 0.75"],
    ["QUALITY CONTROL",addDays(day(timeline.realFg)||day(timeline.targetFg)||end,-7),timeline.realFg||timeline.targetFg,"0.02 0.45 0.75"],
    ["FAT",timeline.realFg||timeline.targetFg,timeline.realFg||timeline.targetFg,"0.00 0.62 0.32"],
    ["PENGIRIMAN PANEL",timeline.realDelivery||timeline.deliveryTarget,timeline.realDelivery||timeline.deliveryTarget,"0.84 0.05 0.08"],
  ] as Array<[string,Date|string,string,string]>;
  phases.forEach(([name,from,to,color],index)=>{const y=tableTop-56-rowHeight*(index+1);line(left,y,right,y);textAt(left+10,y+9,8,String(index+1),true);textAt(left+35,y+9,7.5,name,true);const begin=from instanceof Date?from:day(from),finish=day(to);if(begin&&finish){const a=Math.max(0,Math.floor((begin.getTime()-monday.getTime())/604800000)),b=Math.min(weeks-1,Math.floor((finish.getTime()-monday.getTime())/604800000));if(b>=a)box(gridLeft+a*weekWidth+1,y+2,Math.max(weekWidth-2,(b-a+1)*weekWidth-2),rowHeight-4,color);}});
  for(let week=0;week<=weeks;week++)line(gridLeft+week*weekWidth,tableTop-56,gridLeft+week*weekWidth,tableTop-56-rowHeight*8);
  textAt(left,235,10,`Progres produksi saat ini: ${Math.round(timeline.productionProgress)}%`,true,"0.02 0.30 0.52");textAt(left,213,10,`Target FG: ${timeline.targetFg||"-"} | Real FG: ${timeline.realFg||"-"} | Real kirim: ${timeline.realDelivery||"-"}`);textAt(left,180,10,"Hormat kami,");textAt(left,160,10,"PT. Sinar Metrindo Perkasa",true);textAt(left,135,10,"Project Approval");
  const stream=commands.join("\n"),objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [5 0 R] /Count 1 >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>",`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf="%PDF-1.4\n%timeline\n",offset=pdf.length;const offsets=[0];objects.forEach((object,index)=>{offsets.push(offset);const item=`${index+1} 0 obj\n${object}\nendobj\n`;pdf+=item;offset+=item.length;});const xref=offset;pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(value=>`${String(value).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf],{type:"application/pdf"});
}

type Schedule={startDrawing:string;targetApproval:string;delivery:string;fatDate:string};
const asDate=(value:string)=>{const result=new Date(value+"T00:00:00");return Number.isNaN(result.getTime())?null:result;};
const isWorkday=(value:Date)=>value.getDay()!==0&&value.getDay()!==6;
const nextWorkday=(value:Date)=>{let result=addDays(value,1);while(!isWorkday(result))result=addDays(result,1);return result;};
const previousWorkday=(value:Date)=>{let result=addDays(value,-1);while(!isWorkday(result))result=addDays(result,-1);return result;};
const addWorkdays=(value:Date,count:number)=>{let result=new Date(value),remaining=Math.max(0,count);while(remaining){result=nextWorkday(result);remaining--;}return result;};
const workdays=(from:Date,to:Date)=>{let count=0;for(let current=new Date(from);current<=to;current=addDays(current,1))if(isWorkday(current))count++;return count;};
const mondayBefore=(value:Date)=>addDays(value,-((value.getDay()+6)%7));
const labelDate=(value:Date)=>new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(value);

function makeScheduledTimelinePdf(data:DetailExport,schedule:Schedule){
  const drawing=asDate(schedule.startDrawing)!,approval=asDate(schedule.targetApproval)!,delivery=asDate(schedule.delivery)!,prodStart=nextWorkday(approval),duration=Math.max(1,workdays(prodStart,delivery)),fat=schedule.fatDate?asDate(schedule.fatDate):null;
  const phases:Array<[string,Date,Date,string]>=[
    ["PENGAJUAN GAMBAR APPROVAL",drawing,previousWorkday(approval),"0.02 0.45 0.75"],
    ["TERIMA APPROVAL & DP",approval,approval,"0.02 0.45 0.75"],
    ["FABRIKASI PANEL BOX METAL",prodStart,addWorkdays(prodStart,Math.ceil(duration*.30)-1),"0.02 0.45 0.75"],
    ["PROSES ASSEMBLY DAN WIRING",addWorkdays(prodStart,Math.floor(duration*.10)),addWorkdays(addWorkdays(prodStart,Math.floor(duration*.10)),Math.ceil(duration*.85)-1),"0.02 0.45 0.75"],
    ["PENGADAAN KOMPONEN",prodStart,addWorkdays(prodStart,Math.ceil(duration*.40)-1),"0.02 0.45 0.75"],
    ["QUALITY CONTROL",addWorkdays(prodStart,Math.max(0,duration-Math.ceil(duration*.20))),delivery,"0.02 0.45 0.75"]
  ];
  if(fat)phases.push(["FAT",fat,fat,"0.00 0.62 0.32"]);phases.push(["PENGIRIMAN PANEL",delivery,delivery,"0.84 0.05 0.08"]);
  const left=38,right=556,tableTop=496,rowHeight=24,labelWidth=184,gridLeft=left+labelWidth,gridWidth=right-gridLeft,useDaily=duration<20,start=mondayBefore(addDays(drawing,-7)),weeks=Math.max(12,Math.ceil((addDays(delivery,7).getTime()-start.getTime()+86400000)/604800000));
  const dailyDates:Date[]=[];if(useDaily){for(let current=new Date(drawing);current<=delivery;current=addDays(current,1))if(isWorkday(current))dailyDates.push(new Date(current));}
  const columns=useDaily?Math.max(1,dailyDates.length):weeks,columnWidth=gridWidth/columns;
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit"}).formatToParts(new Date()),year=Number(parts.find(part=>part.type==="year")?.value),month=Number(parts.find(part=>part.type==="month")?.value),commands:string[]=[];
  const textAt=(x:number,y:number,size:number,value:string,bold=false,color="0.05 0.10 0.17")=>commands.push(color+" rg BT /F"+(bold?2:1)+" "+size+" Tf "+x+" "+y+" Td ("+pdfEscape(value)+") Tj ET"),line=(x1:number,y1:number,x2:number,y2:number,w=.45)=>commands.push("0.12 0.14 0.17 RG "+w+" w "+x1+" "+y1+" m "+x2+" "+y2+" l S"),box=(x:number,y:number,w:number,h:number,color:string)=>commands.push(color+" rg "+x+" "+y+" "+w+" "+h+" re f");
  commands.push("q 1 1 1 rg 0 0 595.28 841.89 re f Q");box(left,779,70,4,"0.76 0.06 0.14");box(left+70,779,94,4,"0.02 0.30 0.52");textAt(left,801,22,"simetri",true,"0.02 0.30 0.52");textAt(left+95,801,15,"EMPOWERING",true,"0.76 0.06 0.14");textAt(left+95,784,15,"THE WORLD",true,"0.02 0.30 0.52");textAt(405,800,7,"GRATITUDE 65 | SMK3 | SUCOFINDO | SIVACON | SIEMENS",true,"0.20 0.30 0.38");
  textAt(left,746,11,"No : xxx / SMP / CS / "+roman(month)+" / "+year);textAt(388,746,10,"Jakarta, "+labelDate(new Date()));textAt(left,719,11,"Kepada Yth,");textAt(left,704,12,cut(data.customer||"Pelanggan",56),true);textAt(left,687,11,"Di Tempat");textAt(left,648,11,"Hal",true);textAt(left+102,648,11,": TIME SCHEDULE PRODUKSI PANEL - TR (FAT)",true);textAt(left,624,11,"Proyek",true);textAt(left+102,624,11,": "+cut(data.name,56),true);textAt(left,588,10,"Sehubungan dengan rencana pekerjaan pengadaan panel listrik untuk proyek di atas.");textAt(left,575,10,"berikut rencana time line produksi dan jadwal FAT.");
  const bottom=tableTop-56-rowHeight*phases.length;line(left,tableTop,right,tableTop);line(left,tableTop-31,right,tableTop-31);line(left,tableTop-56,right,tableTop-56);[left,left+30,gridLeft,right].forEach(x=>line(x,tableTop,x,bottom));textAt(left+8,tableTop-38,8,"NO",true);textAt(left+77,tableTop-38,8,"PROSES",true);textAt(gridLeft+gridWidth/2-42,tableTop-17,8,"TIME LINE PRODUKSI",true);
  for(let column=0;column<columns;column++){const x=gridLeft+column*columnWidth,date=useDaily?dailyDates[column]:addDays(start,column*7);line(x,tableTop-31,x,bottom);if(useDaily){textAt(x+Math.max(1,columnWidth/2-3),tableTop-47,Math.min(6.3,columnWidth*.45),String(date.getDate()),true);if(column===0||date.getMonth()!==dailyDates[column-1].getMonth())textAt(x+1,tableTop-40,Math.min(5.2,columnWidth*.37),new Intl.DateTimeFormat("id-ID",{month:"short"}).format(date).toUpperCase(),true);}else{textAt(x+1,tableTop-47,5.7,String(Math.ceil((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())-Date.UTC(date.getFullYear(),0,1))/604800000)+1),true);if(column===0||date.getMonth()!==addDays(date,-7).getMonth())textAt(x+1,tableTop-40,5.3,new Intl.DateTimeFormat("id-ID",{month:"short"}).format(date).toUpperCase(),true);}}
  phases.forEach(([name,from,to,color],index)=>{const y=tableTop-56-rowHeight*(index+1);line(left,y,right,y);textAt(left+10,y+9,8,String(index+1),true);textAt(left+35,y+9,7.3,name,true);const a=useDaily?Math.max(0,dailyDates.findIndex(date=>date>=from)):Math.max(0,Math.floor((from.getTime()-start.getTime())/604800000)),b=useDaily?Math.max(a,dailyDates.reduce((last,date,dateIndex)=>date<=to?dateIndex:last,-1)):Math.min(weeks-1,Math.floor((to.getTime()-start.getTime())/604800000));box(gridLeft+a*columnWidth+1,y+2,Math.max(columnWidth-2,(b-a+1)*columnWidth-2),rowHeight-4,color);});for(let column=0;column<=columns;column++)line(gridLeft+column*columnWidth,tableTop-56,gridLeft+column*columnWidth,bottom);
  const note="Panel dapat diproduksi jika approval dan DP diterima."+(fat?" Untuk FAT direncanakan tanggal "+labelDate(fat)+".":"");textAt(left,bottom-28,9,cut(note,104));textAt(left,bottom-76,10,"Hormat kami,");textAt(left,bottom-96,10,"PT. Sinar Metrindo Perkasa",true);textAt(left,bottom-121,10,"Project Approval");
  const stream=commands.join("\n"),objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [5 0 R] /Count 1 >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>","<< /Length "+stream.length+" >>\nstream\n"+stream+"\nendstream"];let pdf="%PDF-1.4\n%timeline\n",offset=pdf.length;const offsets=[0];objects.forEach((object,index)=>{offsets.push(offset);const item=(index+1)+" 0 obj\n"+object+"\nendobj\n";pdf+=item;offset+=item.length;});const xref=offset;pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n"+offsets.slice(1).map(value=>String(value).padStart(10,"0")+" 00000 n \n").join("")+"trailer\n<< /Size "+(objects.length+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF";return new Blob([pdf],{type:"application/pdf"});
}

export default function DownloadButtons({data}:{data:DetailExport}){
  const[busy,setBusy]=useState<"pdf"|"excel"|"timeline"|null>(null),[form,setForm]=useState({startDrawing:"",targetApproval:"",delivery:"",fat:"no",fatDate:""}),[error,setError]=useState(""),dialog=useRef<HTMLDialogElement>(null);
  const update=(key:keyof typeof form,value:string)=>setForm(current=>({...current,[key]:value}));
  const downloadExcel=async()=>{
    setBusy("excel");
    try{
      const XLSX=await import("xlsx");
      const summary=[
        ["MONITORING PROYEK SIMETRI"],
        ["Detail proyek"],
        [],
        ["Nama proyek",data.name],
        ["Kode proyek",data.code],
        ["Nama PT",data.customer],
        ["PE",data.pe],
        ["PIC",data.pic],
        ["Kontak PIC",data.phone],
        ["Term payment",data.term],
        ["Total panel",data.totalPanels],
        ["Nilai PO",data.totalValue],
        ["Approval",data.approval],
        ["Produksi",data.production],
        ["FG",data.fg],
        ["Kirim",data.delivery],
        [],
        ["Status Komponen",data.componentSummary.length?data.componentSummary.join("; "):"Tidak ada kekurangan komponen."],
      ];
      const detail=[
        ["Status","Nama panel","Qty","FS","WM","Harga panel","Target approval","Real approval","Status SPK","Tanggal SPK selesai","Target FG","Kode BOM","M","EM","EL","QC","Real FG","Real kirim"],
        ...data.panels.map(panel=>[panel.status,panel.panel,panel.qty,panel.fs,panel.wm,panel.price,panel.targetApproval,panel.realApproval,panel.spk,panel.spkDate,panel.targetFg,panel.bom,panel.m,panel.em,panel.el,panel.qc,panel.realFg,panel.realDelivery]),
      ];
      const book=XLSX.utils.book_new();
      const summarySheet=XLSX.utils.aoa_to_sheet(summary);
      summarySheet["!cols"]=[{wch:22},{wch:70}];
      const detailSheet=XLSX.utils.aoa_to_sheet(detail);
      detailSheet["!cols"]=[{wch:14},{wch:36},{wch:8},{wch:8},{wch:8},{wch:17},{wch:16},{wch:16},{wch:12},{wch:18},{wch:16},{wch:13},{wch:8},{wch:8},{wch:8},{wch:8},{wch:16},{wch:16}];
      XLSX.utils.book_append_sheet(book,summarySheet,"Ringkasan");
      XLSX.utils.book_append_sheet(book,detailSheet,"Detail Panel");
      XLSX.writeFile(book,`detail-${safeFileName(data.code)}.xlsx`);
    }finally{setBusy(null)}
  };
  const downloadPdf=async()=>{
    setBusy("pdf");
    try{download(makePdf(data),`detail-${safeFileName(data.code)}.pdf`);}finally{setBusy(null)}
  };
  const createTimeline=(event:React.FormEvent)=>{event.preventDefault();const drawing=asDate(form.startDrawing),approval=asDate(form.targetApproval),delivery=asDate(form.delivery),fat=form.fat==="yes"?asDate(form.fatDate):null;if(!drawing||!approval||!delivery){setError("Lengkapi tiga tanggal utama terlebih dahulu.");return}if(approval<=drawing||delivery<=approval){setError("Urutan tanggal harus: pengajuan gambar, approval, lalu rencana kirim.");return}if(form.fat==="yes"&&!fat){setError("Isi tanggal FAT.");return}setError("");setBusy("timeline");try{download(makeScheduledTimelinePdf(data,{startDrawing:form.startDrawing,targetApproval:form.targetApproval,delivery:form.delivery,fatDate:fat?form.fatDate:""}),"timeline-"+safeFileName(data.code)+".pdf");dialog.current?.close()}finally{setBusy(null)}};
  return <div className="download-actions"><button type="button" onClick={()=>dialog.current?.showModal()} disabled={busy!==null}>{busy==="timeline"?"Menyiapkan timeline...":"Buat Timeline Schedule"}</button><button type="button" onClick={downloadPdf} disabled={busy!==null}>{busy==="pdf"?"Menyiapkan PDF...":"Unduh PDF"}</button><button type="button" onClick={downloadExcel} disabled={busy!==null}>{busy==="excel"?"Menyiapkan Excel...":"Unduh Excel"}</button><dialog ref={dialog} className="timeline-dialog"><form onSubmit={createTimeline}><div className="timeline-heading"><div><b>Buat Timeline Schedule</b><span>Masukkan rencana tanggal proyek.</span></div><button type="button" aria-label="Tutup" onClick={()=>dialog.current?.close()}>×</button></div><label>Start pengajuan gambar<input type="date" value={form.startDrawing} onChange={event=>update("startDrawing",event.target.value)} required/></label><label>Target approval<input type="date" value={form.targetApproval} onChange={event=>update("targetApproval",event.target.value)} required/></label><label>Rencana kirim<input type="date" value={form.delivery} onChange={event=>update("delivery",event.target.value)} required/></label><label>FAT<select value={form.fat} onChange={event=>update("fat",event.target.value)}><option value="no">Tidak</option><option value="yes">Ya</option></select></label>{form.fat==="yes"&&<label>Tanggal FAT<input type="date" value={form.fatDate} onChange={event=>update("fatDate",event.target.value)} required/></label>}{error&&<p className="timeline-error">{error}</p>}<div className="timeline-actions"><button type="button" onClick={()=>dialog.current?.close()}>Batal</button><button type="submit">Buat dan unduh PDF</button></div></form></dialog></div>;
}
