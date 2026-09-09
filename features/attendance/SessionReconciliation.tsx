'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { changeClass } from '@/lib/business-client';
import { buildAttendanceForm, buildAttendancePayload, type AttendanceForm, type AttendanceStudent } from '@/lib/attendance-form';

type Row = AttendanceStudent & { fee: string; included: boolean };
export function SessionReconciliation({ classId, sessionId, onSaved }: { classId: string; sessionId: string; onSaved: () => void }) {
 const [open,setOpen]=useState(false), [rows,setRows]=useState<Row[]>([]), [form,setForm]=useState<AttendanceForm>({});
 const [reason,setReason]=useState(''), [confirmed,setConfirmed]=useState(false), [busy,setBusy]=useState(false), [loading,setLoading]=useState(false);
 const [message,setMessage]=useState(''), [error,setError]=useState('');
 const lock=useRef(false);
 useEffect(()=>{
  if(!open)return;
  let active=true;setLoading(true);setError('');setMessage('');setReason('');setConfirmed(false);setRows([]);setForm({});
  const client=createClient();
  void Promise.all([
   client.rpc('session_attendance_roster',{p_session_id:sessionId}),
   client.from('class_students').select('student_id, students(student_id,name)').eq('class_id',classId),
  ]).then(([result,members])=>{
   if(!active)return;
   if(result.error || members.error || !result.data || !members.data)throw new Error('Không tải đủ dữ liệu xác minh. Đóng và mở lại để thử lại.');
   const built=buildAttendanceForm(members.data,result.data.attendance);
   const rosterIds=new Set<string>(result.data.roster.map((r: {students: AttendanceStudent})=>r.students.student_id));
   setRows(built.students.map(st=>({...st,included:rosterIds.has(st.student_id),fee:String(result.data.attendance.find((a: {student_id:string})=>a.student_id===st.student_id)?.tuition_fee_snapshot ?? '')})));
   setForm(built.attendance);
  }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[open,classId,sessionId]);
 async function perform(work:()=>Promise<unknown>,success:string){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');
  try{await work();setMessage(success);}catch(e){setError(e instanceof Error?e.message:'Chưa lưu được dữ liệu.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <>
  <Button variant="outline" size="sm" onClick={()=>setOpen(true)}>Đối soát điểm danh</Button>
  <Dialog open={open} onOpenChange={value=>{if(!lock.current){setOpen(value);if(!value)onSaved();}}}>
   <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
    <DialogHeader><DialogTitle>Đối soát buổi học chưa chốt</DialogTitle>
     <DialogDescription>Xác minh danh sách và đơn giá bằng sổ lớp hoặc thỏa thuận đã lưu. Việc xác minh không tự ghi có mặt hay vắng mặt.</DialogDescription>
    </DialogHeader>
    {loading?<p role="status">Đang tải dữ liệu…</p>:<fieldset disabled={busy || rows.length===0} className="space-y-4 min-w-0">
     <label className="block space-y-1">Căn cứ xác minh
      <Input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Nguồn đối chiếu, ngày và nội dung đã xác nhận" />
     </label>
     <p className="text-sm text-muted-foreground">Chọn học sinh thuộc buổi này. Danh sách ban đầu là gợi ý từ lịch sử hiện có; dữ liệu cũ cần được kiểm tra đầy đủ.</p>
     {rows.map(row=><div key={row.student_id} className="border rounded-md p-3 space-y-2">
      <label className="flex gap-2"><input type="checkbox" checked={row.included} onChange={e=>{setConfirmed(false);setRows(prev=>prev.map(r=>r.student_id===row.student_id?{...r,included:e.target.checked}:r));}} />{row.name}</label>
      <div className="flex flex-wrap items-center gap-2">
       <Input aria-label={'Đơn giá '+row.name} type="number" min="0" step="0.01" className="w-36" value={row.fee} onChange={e=>setRows(prev=>prev.map(r=>r.student_id===row.student_id?{...r,fee:e.target.value}:r))} />
       <Button variant="outline" disabled={!row.included || !reason.trim() || row.fee.trim()==='' || !Number.isFinite(Number(row.fee)) || Number(row.fee)<0} onClick={()=>void perform(()=>changeClass('verify_attendance_fee',classId,{session_id:sessionId,student_id:row.student_id,fee:Number(row.fee),reason}),'Đã xác minh đơn giá cho '+row.name+'. Trạng thái điểm danh được giữ nguyên.')}>Xác minh phí</Button>
       <select aria-label={'Điểm danh '+row.name} className="border rounded-md p-2 bg-background" value={form[row.student_id]?.status || ''} disabled={!row.included} onChange={e=>setForm(prev=>({...prev,[row.student_id]:{notes:prev[row.student_id]?.notes || '',status:(e.target.value || null) as 'attended'|'absent'|null}}))}>
        <option value="">Chưa xác nhận</option><option value="attended">Có mặt</option><option value="absent">Vắng mặt</option>
       </select>
      </div>
     </div>)}
     <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />Tôi đã đối chiếu đầy đủ danh sách học sinh của buổi học này.</label>
     <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={!confirmed || !reason.trim() || !rows.some(r=>r.included)} onClick={()=>void perform(()=>changeClass('verify_session_roster',classId,{session_id:sessionId,student_ids:rows.filter(r=>r.included).map(r=>r.student_id),reason}),'Đã lưu xác minh danh sách. Hãy hoàn tất điểm danh trước khi chốt sổ.')}>Lưu xác minh danh sách</Button>
      <Button onClick={()=>void perform(async()=>{
       const attendanceData=buildAttendancePayload(sessionId,rows.filter(r=>r.included),form);
       const response=await fetch('/api/attendance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,attendanceData})});
       const data=await response.json();if(!response.ok)throw new Error(data.error || 'Chưa lưu được điểm danh.');
      },'Đã lưu các trạng thái được chọn. Học sinh chưa xác nhận vẫn chưa được điểm danh.')}>Lưu điểm danh đã chọn</Button>
     </div>
    </fieldset>}
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {message && <p role="status">{message}</p>}
   </DialogContent>
  </Dialog>
 </>;
}
