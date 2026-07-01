'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Video, Calendar as CalendarIcon, Clock, Link as LinkIcon, X, Plus } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatVND } from '@/lib/format';

export default function TutorDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, any[]>>({});
  const [currentMonthStr, setCurrentMonthStr] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [currentMonthStats, setCurrentMonthStats] = useState({ sessionsCount: 0, earning: 0 });
  
  // Makeup Request Modal
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [makeupClassId, setMakeupClassId] = useState('');
  const [makeupDate, setMakeupDate] = useState('');
  const [makeupStart, setMakeupStart] = useState('');
  const [makeupEnd, setMakeupEnd] = useState('');
  const [submittingMakeup, setSubmittingMakeup] = useState(false);

  // Announcement popup
  const [viewingAnnouncement, setViewingAnnouncement] = useState<any>(null);

  const supabase = createClient();
  const router = useRouter();

  // Generate week days
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

  const handlePrevWeek = () => setSelectedDate(subDays(selectedDate, 7));
  const handleNextWeek = () => setSelectedDate(addDays(selectedDate, 7));

  const fetchTutorDataAndClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: tutor } = await supabase.from('tutors').select('tutor_id').eq('auth_uid', user.id).single();
      if (tutor) {
        setTutorId(tutor.tutor_id);
        const { data: myClassesData } = await supabase.from('classes').select('*').eq('tutor_id', tutor.tutor_id).eq('status', 'active');
        if (myClassesData && myClassesData.length > 0) {
          setMyClasses(myClassesData);
          return myClassesData.map(c => c.class_id);
        }
      }
    }
    return [];
  };

  const fetchSessionsForMonth = async (date: Date) => {
    const monthStr = format(date, 'yyyy-MM');
    if (monthStr === currentMonthStr) return; // already fetched
    
    setLoadingSessions(true);
    setCurrentMonthStr(monthStr);

    let classIds = myClasses.map(c => c.class_id);
    if (classIds.length === 0) {
        classIds = await fetchTutorDataAndClasses();
        // Fetch stats here once we know classes
        fetchCurrentMonthStats(classIds);
    }
    
    if (classIds.length === 0) {
        setLoadingSessions(false);
        return;
    }

    const startStr = format(subDays(startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1), { weekStartsOn: 1 }), 7), 'yyyy-MM-dd');
    const endStr = format(addDays(new Date(date.getFullYear(), date.getMonth() + 1, 0), 7), 'yyyy-MM-dd');

    const { data: mySessions } = await supabase
      .from('sessions')
      .select('*, classes(name, class_id)')
      .in('class_id', classIds)
      .gte('date', startStr)
      .lte('date', endStr)
      .order('start_time');
      
    if (mySessions) {
      const grouped: Record<string, any[]> = {};
      mySessions.forEach(s => {
        if (!grouped[s.date]) grouped[s.date] = [];
        grouped[s.date].push(s);
      });
      setSessionsByDate(grouped);
    }
    setLoadingSessions(false);
  };

  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
  const sessionForSelected = sessionsByDate[formattedSelectedDate] || [];

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
      alert('Xin dạy bù thành công! Lịch sẽ hiển thị ngay bây giờ.');
      setIsMakeupModalOpen(false);
      setCurrentMonthStr(''); // reset to force refetch
      fetchSessionsForMonth(selectedDate);
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

  const fetchCurrentMonthStats = async (classes: string[]) => {
    if (classes.length === 0) return;
    
    const today = new Date();
    const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const startStr = format(firstDayThisMonth, 'yyyy-MM-dd');
    const endStr = format(lastDayThisMonth, 'yyyy-MM-dd');

    const { data: sessionData } = await supabase
        .from('sessions')
        .select(`
            session_id, 
            csat_fee_snapshot,
            status,
            session_attendance(status, student_id),
            classes!inner(class_students(student_id, tuition_fee_per_session))
        `)
        .in('class_id', classes)
        .gte('date', startStr)
        .lte('date', endStr)
        .eq('status', 'completed');

    if (sessionData) {
        let totalEarnings = 0;
        let sessionsCount = sessionData.length;

        sessionData.forEach((session: any) => {
            let sessionIncome = 0;
            const attendances = session.session_attendance || [];
            const classStudents = session.classes?.class_students || [];
            
            // Lấy những học sinh có mặt
            const presentStudentIds = attendances.filter((a: any) => a.status === 'attended').map((a: any) => a.student_id);
            
            // Tính học phí
            presentStudentIds.forEach((sid: string) => {
                const cs = classStudents.find((c: any) => c.student_id === sid);
                if (cs) {
                    sessionIncome += (cs.tuition_fee_per_session || 0);
                }
            });

            // Có buổi học nhưng không có học sinh thì có thể csat_fee_snapshot trừ lẹm vào, hoặc nếu <= 0 thì bằng 0. (Tuỳ logic, ở đây cho phép âm nếu không ai đi học nhưng vẫn mở lớp, hoặc không)
            // Thường thì nếu không có ai đi học = phí 0.
            if (presentStudentIds.length > 0) {
               sessionIncome -= (session.csat_fee_snapshot || 0);
            } else {
               sessionIncome = 0;
            }
            
            if (sessionIncome > 0) {
                totalEarnings += sessionIncome;
            }
        });
        
        setCurrentMonthStats({ sessionsCount, earning: totalEarnings });
    }
  };

  useEffect(() => {
    fetchSessionsForMonth(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format(selectedDate, 'yyyy-MM')]);

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2 px-2">
                <CalendarIcon className="w-5 h-5 text-indigo-500" />
                {format(start, 'MM/yyyy')}
              </h3>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedDate(new Date())} title="Về hôm nay">
              <Clock className="w-4 h-4 text-slate-400" />
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
             {loadingSessions ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                 Đang tải lịch...
               </div>
             ) : sessionForSelected.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                 <Clock className="w-12 h-12 mb-3 text-slate-300" />
                 <p className="text-sm font-medium">Không có ca dạy nào trong ngày này</p>
               </div>
             ) : (
               sessionForSelected.map((session, idx) => (
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
        {/* Thu nhập tháng này */}
        <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500 bg-white">
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-2">Thống Kê Tháng Hiện Tại ({format(new Date(), 'MM/yyyy')})</h3>
            <div className="space-y-4">
              <div>
                 <p className="text-sm text-slate-500 mb-1">Thu Nhập Ước Tính</p>
                 <h2 className="text-3xl font-black text-slate-900">{formatVND(currentMonthStats.earning)}</h2>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                 <p className="text-sm text-slate-500">Số buổi hoàn thành</p>
                 <span className="font-bold text-slate-800">{currentMonthStats.sessionsCount} buổi</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm border-t-2 border-slate-200">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-lg font-bold text-slate-800">Thông báo từ TT</CardTitle>
             {announcements.length > 0 && (
               <span className="text-xs text-slate-400">{announcements.length} thông báo</span>
             )}
           </CardHeader>
           <CardContent className="pt-2">
             <div className="space-y-2">
               {announcements.length === 0 ? (
                 <p className="text-sm text-slate-500 italic text-center py-4">Chưa có thông báo nào</p>
               ) : (
                 announcements.map((ann, idx) => (
                   <div
                     key={idx}
                     className="p-3 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 cursor-pointer transition-all group"
                     onClick={() => setViewingAnnouncement(ann)}
                   >
                     <div className="flex items-start justify-between gap-2">
                       <h4 className="font-bold text-slate-900 text-sm group-hover:text-emerald-800 leading-snug">{ann.title}</h4>
                       <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 shrink-0 mt-0.5" />
                     </div>
                     <p className="text-xs text-slate-500 line-clamp-2 mt-1">{ann.content}</p>
                     {ann.created_at && (
                       <p className="text-[10px] text-slate-400 mt-1.5">
                         {new Date(ann.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                       </p>
                     )}
                   </div>
                 ))
               )}
             </div>
           </CardContent>
        </Card>
      </div>

      {/* ── Pop-up chi tiết thông báo (Bug 4: overflow-safe) ── */}
      <Dialog open={!!viewingAnnouncement} onOpenChange={() => setViewingAnnouncement(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold leading-snug pr-4">
              {viewingAnnouncement?.title}
            </DialogTitle>
            {viewingAnnouncement?.created_at && (
              <p className="text-xs text-slate-400 pt-1">
                Đăng lúc: {new Date(viewingAnnouncement.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </DialogHeader>
          {/* Bug 4 prevention: max-h + overflow-y-auto + whitespace-pre-wrap */}
          <div className="max-h-[55vh] overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed py-2">
            {viewingAnnouncement?.content || ''}
          </div>
          {viewingAnnouncement?.link && (
            <div className="pt-2 border-t border-slate-100">
              <a
                href={viewingAnnouncement.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline"
              >
                <LinkIcon className="w-4 h-4" /> Xem tài liệu đính kèm
              </a>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingAnnouncement(null)}>Dóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
