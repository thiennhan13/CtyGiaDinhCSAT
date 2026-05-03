'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Video, Calendar as CalendarIcon, Clock, Link as LinkIcon, X, Plus } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TutorDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  
  // Makeup Request Modal
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [makeupClassId, setMakeupClassId] = useState('');
  const [makeupDate, setMakeupDate] = useState('');
  const [makeupStart, setMakeupStart] = useState('');
  const [makeupEnd, setMakeupEnd] = useState('');
  const [submittingMakeup, setSubmittingMakeup] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // Generate week days
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

  const fetchSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: tutor } = await supabase.from('tutors').select('tutor_id').eq('auth_uid', user.id).single();
      if (tutor) {
        const { data: myClassesData } = await supabase.from('classes').select('*').eq('tutor_id', tutor.tutor_id);
        if (myClassesData && myClassesData.length > 0) {
          setMyClasses(myClassesData);
          const classIds = myClassesData.map(c => c.class_id);
          const formattedDate = format(selectedDate, 'yyyy-MM-dd');
          const { data: mySessions } = await supabase
            .from('sessions')
            .select('*, classes(name, class_id)')
            .in('class_id', classIds)
            .eq('date', formattedDate)
            .order('start_time', { ascending: true });
          
          if (mySessions) setSessions(mySessions);
          else setSessions([]);
        }
      }
    }
  };

  const submitMakeupClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!makeupClassId || !makeupDate || !makeupStart || !makeupEnd) {
      alert('Vui lòng điền đủ thông tin');
      return;
    }
    setSubmittingMakeup(true);
    try {
      const res = await fetch('/api/tutor/makeup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: makeupClassId,
          date: makeupDate,
          start_time: makeupStart,
          end_time: makeupEnd
        })
      });
      if (!res.ok) throw new Error('Không thể gửi yêu cầu xin dạy bù.');
      alert('Xin dạy bù thành công!');
      setIsMakeupModalOpen(false);
      fetchSessions();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmittingMakeup(false);
    }
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setAnnouncements(data);
  };

  useEffect(() => {
    fetchSessions();
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar & Lessons */}
      <div className="col-span-1 lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
           <h2 className="text-2xl font-bold text-slate-800">Lịch Dạy</h2>
           <Button onClick={() => setIsMakeupModalOpen(true)} className="gap-2">
             <Plus className="w-4 h-4" /> Xin Dạy Bù / Tạo Lịch Tạm
           </Button>
        </div>

        <Card className="overflow-hidden border-0 shadow-sm border-t-2 border-indigo-500">
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-500" />
              {format(selectedDate, 'dd MMMM, yyyy')}
            </h3>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedDate(new Date())}>
              <X className="w-4 h-4 text-slate-400" />
            </Button>
          </div>
          
          <div className="grid grid-cols-7 border-b bg-slate-50">
            {weekDays.map((day, idx) => {
              const isActive = isSameDay(day, selectedDate);
              return (
                <div 
                  key={idx} 
                  onClick={() => setSelectedDate(day)}
                  className={`py-3 flex flex-col items-center justify-center cursor-pointer transition-colors relative ${isActive ? 'bg-indigo-50' : 'hover:bg-slate-100'}`}
                >
                  <span className={`text-[10px] font-bold uppercase mb-1 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {format(day, 'EEE')}
                  </span>
                  <span className={`text-lg font-bold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {format(day, 'dd')}
                  </span>
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                </div>
              );
            })}
          </div>

          <div className="bg-slate-50 p-4 lg:p-6 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3">
             {sessions.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                 <Clock className="w-12 h-12 mb-3 text-slate-300" />
                 <p className="text-sm font-medium">Không có ca dạy nào trong ngày này</p>
               </div>
             ) : (
               sessions.map((session, idx) => (
                 <div key={idx} onClick={() => router.push(`/tutor/classes/${session.class_id}/session/${session.session_id}`)} className="flex bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group">
                   <div className="w-24 bg-slate-50 border-r border-slate-100 flex flex-col items-center justify-center py-4 shrink-0 text-slate-500">
                     <span className="font-bold text-sm text-slate-700">{session.start_time?.substring(0,5)}</span>
                     <span className="text-[10px] my-0.5 text-slate-300">|</span>
                     <span className="font-bold text-sm">{session.end_time?.substring(0,5)}</span>
                   </div>
                   <div className="flex-1 p-4 flex flex-col justify-center">
                     <h4 className="font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                       {session.classes?.name}
                     </h4>
                     <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Trực tuyến</div>
                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {session.status === 'scheduled' ? 'Sắp diễn ra' : 'Đã hoàn thành'}</div>
                     </div>
                   </div>
                   <div className="w-12 border-l border-slate-50 flex items-center justify-center bg-white group-hover:bg-indigo-50 transition-colors text-slate-400 group-hover:text-indigo-600">
                     <ChevronRight className="w-5 h-5" />
                   </div>
                 </div>
               ))
             )}
          </div>
        </Card>
      </div>

      {/* Announcements */}
      <div className="col-span-1 space-y-6">
        <Card className="border-0 shadow-sm border-t-2 border-emerald-500">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-lg font-bold text-slate-800">Thông báo từ TT</CardTitle>
           </CardHeader>
           <CardContent className="pt-2">
             <div className="space-y-4">
               {announcements.length === 0 ? (
                 <p className="text-sm text-slate-500 italic text-center py-4">Chưa có thông báo nào</p>
               ) : (
                 announcements.map((ann, idx) => (
                   <div key={idx} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                     <h4 className="font-bold text-slate-900 text-sm mb-1">{ann.title}</h4>
                     <p className="text-xs text-slate-500 line-clamp-2 mb-2">{ann.content}</p>
                     {ann.link && (
                       <a href={ann.link} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold flex items-center gap-1 text-emerald-600 hover:underline">
                         <LinkIcon className="w-3 h-3" /> Xem chi tiết
                       </a>
                     )}
                   </div>
                 ))
               )}
             </div>
           </CardContent>
        </Card>
      </div>

      <Dialog open={isMakeupModalOpen} onOpenChange={setIsMakeupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xin Dạy Bù / Tạo Lịch Tạm</DialogTitle>
            <DialogDescription>
              Tạo một buổi học đột xuất cho lớp học của bạn. Buổi học này sẽ báo trạng thái &quot;Sắp diễn ra&quot; ở Lịch dạy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitMakeupClass} className="space-y-4">
            <div className="space-y-2">
              <Label>Chọn Lớp Học</Label>
              <Select value={makeupClassId} onValueChange={(val) => val && setMakeupClassId(val)} required>
                <SelectTrigger><SelectValue placeholder="-- Danh sách lớp phụ trách --" /></SelectTrigger>
                <SelectContent>
                  {myClasses.map(c => (
                    <SelectItem key={c.class_id} value={c.class_id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ngày dạy bù</Label>
              <Input type="date" value={makeupDate} onChange={e => setMakeupDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Bắt đầu (Ví dụ 19:00)</Label>
                 <Input type="time" value={makeupStart} onChange={e => setMakeupStart(e.target.value)} required />
               </div>
               <div className="space-y-2">
                 <Label>Kết thúc (Ví dụ 21:00)</Label>
                 <Input type="time" value={makeupEnd} onChange={e => setMakeupEnd(e.target.value)} required />
               </div>
            </div>
            <DialogFooter className="pt-2">
               <Button type="button" variant="outline" onClick={() => setIsMakeupModalOpen(false)}>Hủy</Button>
               <Button type="submit" disabled={submittingMakeup}>{submittingMakeup ? 'Đang gửi...' : 'Xác nhận tạo'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
