'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Video, Calendar as CalendarIcon, Clock, Link as LinkIcon, Plus, X } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const supabase = createClient();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', link: '' });

  // Generate week days
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

  const handlePrevWeek = () => setSelectedDate(subDays(selectedDate, 7));
  const handleNextWeek = () => setSelectedDate(addDays(selectedDate, 7));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
  }, []);

  const fetchSessions = async () => {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const { data } = await supabase
      .from('sessions')
      .select('*, classes(name, tutor_id, tutors(name, auth_uid))')
      .eq('date', formattedDate)
      .order('start_time');
      
    if (data) setSessions(data);
  };

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) setAnnouncements(data);
  };

  const fetchStats = async () => {
    // Current month string
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const { data } = await supabase.from('payments').select('amount').eq('status', 'paid').eq('billing_period', currentMonthStr);
    if (data) {
      const sum = data.reduce((acc, p) => acc + (p.amount || 0), 0);
      setTotalRevenue(sum);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchAnnouncements();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('announcements').insert([newAnnouncement]);
    if (!error) {
      setIsAnnouncementModalOpen(false);
      setNewAnnouncement({ title: '', content: '', link: '' });
      fetchAnnouncements();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
           <CardContent className="p-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm font-medium text-slate-500 mb-1">Doanh thu đã thu ({format(new Date(), 'MM/yyyy')})</p>
                 <h3 className="text-2xl font-bold text-slate-900">
                   {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalRevenue)}
                 </h3>
               </div>
               <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                 <span className="text-xl font-black">₫</span>
               </div>
             </div>
           </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar & Lessons */}
      <div className="col-span-1 lg:col-span-2 space-y-6">
        <Card className="overflow-hidden border-0 shadow-sm border-t-2 border-indigo-500">
          <div className="bg-white px-6 py-4 flex items-center justify-between border-b flex-wrap gap-4">
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
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch id="show-all" checked={showAllSchedules} onCheckedChange={setShowAllSchedules} />
                <Label htmlFor="show-all" className="text-sm font-medium cursor-pointer">Lịch tất cả mọi người</Label>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setSelectedDate(new Date())} title="Về hôm nay">
                <Clock className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
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
             {sessions
               .filter(s => showAllSchedules || s.classes?.tutors?.auth_uid === currentUser?.id)
               .length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                 <Clock className="w-12 h-12 mb-3 text-slate-300" />
                 <p className="text-sm font-medium">Không có ca dạy nào trong ngày này</p>
               </div>
             ) : (
               sessions
                .filter(s => showAllSchedules || s.classes?.tutors?.auth_uid === currentUser?.id)
                .map((session, idx) => {
                 const isAdminSession = session.classes?.tutors?.auth_uid === currentUser?.id;
                 return (
                 <div key={idx} className={`flex rounded-xl shadow-sm border overflow-hidden transition-all cursor-pointer group ${isAdminSession ? 'bg-blue-50 border-blue-200 hover:border-blue-400' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'}`}>
                   <div className={`w-24 border-r flex flex-col items-center justify-center py-4 shrink-0 ${isAdminSession ? 'bg-blue-100/50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                     <span className={`font-bold text-sm ${isAdminSession ? 'text-blue-800' : 'text-slate-700'}`}>{session.start_time?.substring(0,5)}</span>
                     <span className={`text-[10px] my-0.5 ${isAdminSession ? 'text-blue-300' : 'text-slate-300'}`}>|</span>
                     <span className="font-bold text-sm">{session.end_time?.substring(0,5)}</span>
                   </div>
                   <div className="flex-1 p-4 flex flex-col justify-center">
                     <h4 className={`font-bold mb-1 transition-colors ${isAdminSession ? 'text-blue-900 group-hover:text-blue-700' : 'text-slate-900 group-hover:text-indigo-600'}`}>
                       {session.classes?.name}
                     </h4>
                     <p className={`text-xs mb-2 ${isAdminSession ? 'text-blue-600' : 'text-slate-500'}`}>Gia sư: {session.classes?.tutors?.name || 'Chưa phân công'}</p>
                     <div className={`flex items-center gap-4 text-xs font-medium ${isAdminSession ? 'text-blue-700' : 'text-slate-500'}`}>
                        <div className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> Trực tuyến</div>
                        <div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${session.status === 'scheduled' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span> {session.status === 'scheduled' ? 'Sắp diễn ra' : 'Đã hoàn thành'}</div>
                     </div>
                   </div>
                   <div className={`w-12 border-l flex items-center justify-center transition-colors ${isAdminSession ? 'border-blue-200 bg-blue-50 group-hover:bg-blue-100 text-blue-500 group-hover:text-blue-700' : 'border-slate-50 bg-white group-hover:bg-indigo-50 text-slate-400 group-hover:text-indigo-600'}`}>
                     <ChevronRight className="w-5 h-5" />
                   </div>
                 </div>
                 );
               })
             )}
          </div>
        </Card>
      </div>

      {/* Announcements */}
      <div className="col-span-1 space-y-6">
        <Card className="border-0 shadow-sm border-t-2 border-emerald-500">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-lg font-bold text-slate-800">Thông báo mới nhất</CardTitle>
             <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setIsAnnouncementModalOpen(true)}>
               <Plus className="w-3.5 h-3.5" /> Tạo mới
             </Button>
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

      <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thông báo mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAnnouncement} className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Tiêu đề</Label>
               <Input value={newAnnouncement.title} onChange={e => setNewAnnouncement(prev => ({...prev, title: e.target.value}))} required />
             </div>
             <div className="space-y-2">
               <Label>Nội dung</Label>
               <Textarea value={newAnnouncement.content} onChange={e => setNewAnnouncement(prev => ({...prev, content: e.target.value}))} rows={4} required />
             </div>
             <div className="space-y-2">
               <Label>Đường Link (Google Meet, Tài liệu...)</Label>
               <Input value={newAnnouncement.link} onChange={e => setNewAnnouncement(prev => ({...prev, link: e.target.value}))} placeholder="https://..." />
             </div>
             <DialogFooter className="pt-4">
               <Button type="button" variant="outline" onClick={() => setIsAnnouncementModalOpen(false)}>Hủy</Button>
               <Button type="submit">Gửi thông báo</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
