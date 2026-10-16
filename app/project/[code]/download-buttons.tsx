"use client";

import {useState} from "react";

type PanelExport={
  status:string;panel:string;qty:number;fs:string;wm:string;price:number;targetApproval:string;realApproval:string;spk:string;spkDate:string;targetFg:string;bom:string;m:string;em:string;el:string;qc:string;realFg:string;realDelivery:string;
};
type DetailExport={
  name:string;code:string;customer:string;pe:string;pic:string;phone:string;term:string;componentSummary:string[];totalPanels:number;totalValue:number;approval:string;production:string;fg:string;delivery:string;panels:PanelExport[];
};

const rupiah=(value:number)=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
const safeFileName=(value:string)=>value.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"").toLowerCase()||"proyek";
const empty=(value:string)=>value||"—";
const ascii=(value:string)=>value.replace(/[^\x20-\x7e]/g,"-");
const pdfEscape=(value:string)=>ascii(value).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
const cut=(value:string,length:number)=>ascii(value).length>length?`${ascii(value).slice(0,Math.max(0,length-1))}.`:ascii(value);
const download=(blob:Blob,fileName:string)=>{const url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};

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

export default function DownloadButtons({data}:{data:DetailExport}){
  const[busy,setBusy]=useState<"pdf"|"excel"|null>(null);
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
  return <div className="download-actions"><button type="button" onClick={downloadPdf} disabled={busy!==null}>{busy==="pdf"?"Menyiapkan PDF...":"Unduh PDF"}</button><button type="button" onClick={downloadExcel} disabled={busy!==null}>{busy==="excel"?"Menyiapkan Excel...":"Unduh Excel"}</button></div>;
}
