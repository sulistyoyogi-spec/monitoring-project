"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton(){
  const { pending }=useFormStatus();
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{if(!pending){setElapsed(0);return;}const timer=window.setInterval(()=>setElapsed(v=>v+1),1000);return()=>window.clearInterval(timer);},[pending]);
  const progress=Math.min(92,12+elapsed*3);
  const stage=progress<40?"Mengambil data dari Google Drive":progress<75?"Membaca dan memeriksa data proyek":"Menyimpan pembaruan ke dashboard";
  return <div className="sync-wrap"><button className="refresh" disabled={pending}>{pending?"↻ Sinkronisasi berjalan…":"↻ Sinkronkan data"}</button>{pending&&<div className="sync-status" role="status"><span>{stage}</span><div><i style={{width:`${progress}%`}}/></div><small>Mohon jangan tutup halaman ini.</small></div>}</div>;
}

export default function SyncButton({action}:{action:(formData:FormData)=>void|Promise<void>}){return <form action={action}><SubmitButton/></form>;}
