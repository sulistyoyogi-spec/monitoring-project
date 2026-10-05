"use client";

import { useEffect, useState, type FormEvent } from "react";

export default function SyncButton({action}:{action:(formData:FormData)=>void|Promise<void>}){
  const [pending,setPending]=useState(false);
  const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{if(!pending){setElapsed(0);return;}const timer=window.setInterval(()=>setElapsed(v=>v+1),1000);return()=>window.clearInterval(timer);},[pending]);
  const progress=Math.min(92,12+elapsed*3);
  const stage=progress<40?"Mengambil data dari Google Drive":progress<75?"Membaca dan memeriksa data proyek":"Menyimpan pembaruan ke dashboard";
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    const form=event.currentTarget;
    setPending(true);
    try{await action(new FormData(form));}finally{setPending(false);}
  }
  return <form onSubmit={submit}><div className="sync-wrap"><button className="refresh" type="submit" disabled={pending}>{pending?"↻ Sinkronisasi berjalan…":"↻ Sinkronkan data"}</button>{pending&&<div className="sync-status" role="status"><span>{stage}</span><div><i style={{width:`${progress}%`}}/></div><small>Mohon jangan tutup halaman ini.</small></div>}</div></form>;
}
