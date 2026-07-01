'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Video, Calendar as CalendarIcon, Clock, Link as LinkIcon, Plus, X, BookOpen, AlertTriangle } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, subDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { formatVND } from '@/lib/format';

interface DashboardKpis {
  totalRevenue: number;
  activeClassCount: number;
  unpaidCount: number;
  expiringClasses: any[];
}

interface DashboardClientProps {
  initialKpis: DashboardKpis;
  initialAnnouncements: any[];
  initialSessions: any[];
  currentUserId: string | null;
}

export function DashboardClient({
  initialKpis,
  initialAnnouncements,
  initialSessions,
  currentUserId,
}: DashboardClientProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonthStr, setCurrentMonthStr] = useState(format(new Date(), 'yyyy-MM'));
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, any[]>>(() => {
    // Nhóm sessions ban đầu từ server theo ngày
    const grouped: Record<string, any[]> = {};
    initialSessions.forEach(s => {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(s);
    });
    return grouped;
  });
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', link: '' });
  const [viewingAnnouncement, setViewingAnnouncement] = useState<any>(null);
  const [showExpiringModal, setShowExpiringModal] = useState(false);
  const supabase = createClient();

  // Generate week days
  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

  const handlePrevWeek = () => setSelectedDate(subDays(selectedDate, 7));
  const handleNextWeek = () => setSelectedDate(addDays(selectedDate, 7));

  // Khi user chuyển tháng mới (không có trong cache ban đầu từ server), mới cần fetch client-side
  const fetchSessionsForMonth = async (date: Date) => {
    const monthStr = format(date, 'yyyy-MM');
    if (monthStr === currentMonthStr) return;
    setLoadingSessions(true);
    setCurrentMonthStr(monthStr);
    const startStr = format(subDays(startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1), { weekStartsOn: 1 }), 7), 'yyyy-MM-dd');
    const endStr = format(addDays(new Date(date.getFullYear(), date.getMonth() + 1, 0), 7), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('sessions')
      .select('*, classes(class_id, name, tutor_id, tutors(name, auth_uid))')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('start_time');
    if (data) {
      const grouped: Record<string, any[]> = {};
      data.forEach(s => {
        if (!grouped[s.date]) grouped[s.date] = [];
        grouped[s.date].push(s);
      });
      setSessionsByDate(grouped);
    }
    setLoadingSessions(false);
  };

  // Trigger fetch khi chuyển tháng
  const handleWeekChange = (newDate: Date) => {
    setSelectedDate(newDate);
    fetchSessionsForMonth(newDate);
  };

  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
  const sessionForSelected = sessionsByDate[formattedSelectedDate] || [];

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setAnnouncements(data);
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('announcements').insert([newAnnouncement]);
    if (!error) {
      setIsAnnouncementModalOpen(false);
      setNewAnnouncement({ title: '', content: '', link: '' });
      fetchAnnouncements();
    }
  };

  const { totalRevenue, activeClassCount, unpaidCount, expiringClasses } = initialKpis;

  return (
    <div className="space-y-6">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Doanh thu đã thu ({format(new Date(), 'MM/yyyy')})</p>
            <h3 className="text-xl font-bold text-slate-900">
              {formatVND(totalRevenue)}
            </h3>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Lớp đang hoạt động
            </p>
            <h3 className="text-2xl font-bold text-indigo-700">{activeClassCount}</h3>
          </CardContent>
        </Card>
        <Card className={`border shadow-none ${unpaidCount > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Hóa đơn chưa thu</p>
            <h3 className={`text-2xl font-bold ${unpaidCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{unpaidCount}</h3>
            {unpaidCount > 0 && (
              <Link href="/admin/billing" className="text-[10px] text-amber-600 font-semibold hover:underline">→ Xem ngay</Link>
            )}
          </CardContent>
        </Card>
        <Card
          className={`border shadow-none transition-all ${expiringClasses.length > 0 ? 'border-red-300 bg-red-50 cursor-pointer hover:border-red-400 hover:bg-red-100 active:scale-[0.99]' : 'border-slate-200'}`}
          onClick={() => expiringClasses.length > 0 && setShowExpiringModal(true)}
        >
          <CardContent className="p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Lớp sắp hết hạn (≤14 ngày)
            </p>
            <h3 className={`text-2xl font-bold ${expiringClasses.length > 0 ? 'text-red-700' : 'text-slate-900'}`}>{expiringClasses.length}</h3>
            {expiringClasses.length > 0 && (
              <p className="text-[10px] text-red-500 font-semibold mt-1 flex items-center gap-0.5">
                <ChevronRight className="w-3 h-3" /> Nhấn để xem chi tiết
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar & Lessons */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border border-slate-200 shadow-none">
            <div className="bg-white px-4 md:px-6 py-3 flex items-center justify-between border-b flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleWeekChange(subDays(selectedDate, 7))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 px-1">
                  <CalendarIcon className="w-4 h-4 text-blue-600" />
                  {format(start, 'MM/yyyy')}
                </h3>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleWeekChange(addDays(selectedDate, 7))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch id="show-all" checked={showAllSchedules} onCheckedChange={setShowAllSchedules} />
                  <Label htmlFor="show-all" className="text-xs font-semibold text-slate-600 cursor-pointer">Lịch tất cả</Label>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-sm" onClick={() => { setSelectedDate(new Date()); fetchSessionsForMonth(new Date()); }} title="Về hôm nay">
                  <Clock className="w-4 h-4 text-slate-400" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b bg-[#f8f9fa]">
              {weekDays.map((day, idx) => {
                const isActive = isSameDay(day, selectedDate);
                const dayIndex = day.getDay();
                const shortNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const dayName = shortNames[dayIndex];
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`py-2.5 flex flex-col items-center justify-center cursor-pointer transition-colors relative ${isActive ? 'bg-blue-50/40' : 'hover:bg-slate-100'}`}
                  >
                    <span className={`text-[10px] font-bold uppercase mb-0.5 ${isActive ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                      {dayName}
                    </span>
                    <span className={`text-base font-bold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>
                      {format(day, 'dd')}
                    </span>
                    {isActive && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600" />}
                  </div>
                );
              })}
            </div>

            <div className="bg-[#f8f9fa]/40 p-4 lg:p-6 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3">
              {loadingSessions ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12 text-sm font-medium">
                  Đang tải lịch...
                </div>
              ) : sessionForSelected
                .filter(s => showAllSchedules || s.classes?.tutors?.auth_uid === currentUserId)
                .length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                  <Clock className="w-10 h-10 mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">Không có ca dạy nào trong ngày này</p>
                </div>
              ) : (
                sessionForSelected
                  .filter(s => showAllSchedules || s.classes?.tutors?.auth_uid === currentUserId)
                  .map((session, idx) => {
                    const isAdminSession = session.classes?.tutors?.auth_uid === currentUserId;
                    const classId = session.class_id;
                    return (
                      <Link key={idx} href={`/admin/classes/${classId}`}
                        className={`flex rounded-sm border overflow-hidden transition-all cursor-pointer group ${isAdminSession ? 'bg-blue-50/30 border-blue-100 hover:border-blue-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                      >
                        <div className={`w-20 md:w-24 border-r flex flex-col items-center justify-center py-3 shrink-0 ${isAdminSession ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          <span className="font-bold text-xs md:text-sm">{session.start_time?.substring(0, 5)}</span>
                          <span className={`text-[10px] my-0.5 ${isAdminSession ? 'text-blue-200' : 'text-slate-300'}`}>|</span>
                          <span className="font-bold text-xs md:text-sm">{session.end_time?.substring(0, 5)}</span>
                        </div>
                        <div className="flex-1 p-3 md:p-4 flex flex-col justify-center min-w-0">
                          <h4 className={`font-bold text-sm md:text-base mb-0.5 transition-colors truncate ${isAdminSession ? 'text-blue-900 group-hover:text-blue-700' : 'text-slate-900 group-hover:text-blue-600'}`}>
                            {session.classes?.name}
                          </h4>
                          <p className={`text-xs mb-1.5 truncate ${isAdminSession ? 'text-blue-600' : 'text-slate-500'}`}>Gia sư: {session.classes?.tutors?.name || 'Chưa phân công'}</p>
                          <div className={`flex items-center gap-3 text-[10px] md:text-xs font-semibold ${isAdminSession ? 'text-blue-700' : 'text-slate-500'}`}>
                            <div className="flex items-center gap-1"><Video className="w-3.5 h-3.5" /> Trực tuyến</div>
                            <div className="flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${session.status === 'scheduled' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span> {session.status === 'scheduled' ? 'Sắp diễn ra' : 'Đã hoàn thành'}</div>
                          </div>
                        </div>
                        <div className={`w-10 md:w-12 border-l flex items-center justify-center transition-colors ${isAdminSession ? 'border-blue-100 bg-blue-50/20 group-hover:bg-blue-50 text-blue-500' : 'border-slate-200 bg-white group-hover:bg-slate-50 text-slate-400'}`}>
                          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      </Link>
                    );
                  })
              )}
            </div>
          </Card>
        </div>

        {/* Announcements */}
        <div className="col-span-1 space-y-6">
          <Card className="border border-slate-200 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold text-slate-800">Thông báo</CardTitle>
              <Button variant="google" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setIsAnnouncementModalOpen(true)}>
                <Plus className="w-3 h-3" /> Tạo mới
              </Button>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="space-y-2">
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Chưa có thông báo nào</p>
                ) : (
                  announcements.map((ann, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50 cursor-pointer transition-all group"
                      onClick={() => setViewingAnnouncement(ann)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-slate-800 text-xs md:text-sm group-hover:text-blue-700 leading-snug">{ann.title}</h4>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500 shrink-0 mt-0.5" />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{ann.content}</p>
                      {ann.created_at && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(ann.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thông báo mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAnnouncement} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input value={newAnnouncement.title} onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea value={newAnnouncement.content} onChange={e => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))} rows={4} required />
            </div>
            <div className="space-y-2">
              <Label>Đường Link (Google Meet, Tài liệu...)</Label>
              <Input value={newAnnouncement.link} onChange={e => setNewAnnouncement(prev => ({ ...prev, link: e.target.value }))} placeholder="https://..." />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAnnouncementModalOpen(false)}>Hủy</Button>
              <Button type="submit">Gửi thông báo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Pop-up chi tiết thông báo (Bug 4: overflow-safe) */}
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
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline"
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

      {/* Pop-up danh sách Lớp sắp hết hạn */}
      <Dialog open={showExpiringModal} onOpenChange={setShowExpiringModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-red-700">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Danh Sách Lớp Sắp Hết Hạn (≤ 14 ngày)
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
            {expiringClasses.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-4">Hiện không có lớp nào sắp hết hạn.</p>
            ) : (
              expiringClasses.map((c: any) => (
                <div key={c.class_id} className="p-3 rounded-lg border border-red-100 bg-red-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Gia sư: <span className="font-semibold">{c.tutors?.name || 'Chưa phân công'}</span>
                    </p>
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      Ngày kết thúc: {c.end_date}
                    </p>
                  </div>
                  <Link
                    href={`/admin/classes/${c.class_id}`}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-white border border-red-200 text-red-700 hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
                    onClick={() => setShowExpiringModal(false)}
                  >
                    Xem / Gia hạn <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpiringModal(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
