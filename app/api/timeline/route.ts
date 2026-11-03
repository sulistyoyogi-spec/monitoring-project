import {readFile} from "node:fs/promises";
import path from "node:path";
import {makeTimelineExcel,type TimelineData,type TimelineSchedule} from "@/app/project/[code]/timeline-excel";

export const runtime="nodejs";

export async function POST(request:Request){
  try{
    const body=await request.json() as {data?:TimelineData;schedule?:TimelineSchedule};
    const {data,schedule}=body;
    if(!data?.name||!schedule?.startDrawing||!schedule?.targetApproval||!schedule?.delivery) return new Response("Data timeline belum lengkap.",{status:400});
    const template=new Uint8Array(await readFile(path.join(process.cwd(),"public","timeline-schedule-template.xlsx")));
    const workbook=await makeTimelineExcel(data,schedule,template);
    return new Response(workbook,{headers:{"content-type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","content-disposition":`attachment; filename="timeline-${data.code||"proyek"}.xlsx"`}});
  }catch(error){return new Response(error instanceof Error?error.message:"Gagal membuat timeline Excel.",{status:500});}
}
