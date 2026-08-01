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

      {/* ── 4 KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* Doanh thu */}
        <Card className="shadow-none overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Doanh thu ({format(new Date(), 'MM/yyyy')})
              </p>
              <h3 className="text-lg font-semibold text-foreground leading-tight">
                {formatVND(totalRevenue)}
              </h3>
            </div>
            <div className="h-1 bg-blue-500 dark:bg-blue-400 opacity-60" />
          </CardContent>
        </Card>

        {/* Lớp hoạt động */}
        <Card className="shadow-none overflow-hidden">
          <CardContent className="p-0">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                Lớp đang hoạt động
              </p>
              <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{activeClassCount}</h3>
            </div>
            <div className="h-1 bg-green-500 dark:bg-green-400 opacity-60" />
          </CardContent>
        </Card>

        {/* Hóa đơn chưa thu */}
        <Card className={`shadow-none overflow-hidden ${unpaidCount > 0 ? 'border-warning/40' : ''}`}>
          <CardContent className="p-0">
            <div className={`p-5 ${unpaidCount > 0 ? 'bg-yellow-50 dark:bg-yellow-900/15' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${unpaidCount > 0 ? 'bg-yellow-100 dark:bg-yellow-900/40' : 'bg-secondary'}`}>
                  <svg className={`w-4 h-4 ${unpaidCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Hóa đơn chưa thu
              </p>
              <h3 className={`text-2xl font-bold ${unpaidCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}`}>
                {unpaidCount}
              </h3>
              {unpaidCount > 0 && (
                <Link href="/admin/billing" className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold hover:underline">
                  → Xem ngay
                </Link>
              )}
            </div>
            <div className={`h-1 ${unpaidCount > 0 ? 'bg-yellow-400' : 'bg-border'} opacity-60`} />
          </CardContent>
        </Card>

        {/* Lớp sắp hết hạn */}
        <Card
          className={`shadow-none overflow-hidden transition-all ${expiringClasses.length > 0 ? 'border-destructive/40 cursor-pointer hover:border-destructive/70 active:scale-[0.99]' : ''}`}
          onClick={() => expiringClasses.length > 0 && setShowExpiringModal(true)}
        >
          <CardContent className="p-0">
            <div className={`p-5 ${expiringClasses.length > 0 ? 'bg-red-50 dark:bg-red-900/15' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${expiringClasses.length > 0 ? 'bg-red-100 dark:bg-red-900/40' : 'bg-secondary'}`}>
                  <AlertTriangle className={`w-4 h-4 ${expiringClasses.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`} />
                </div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Lớp sắp hết hạn (≤14 ngày)
              </p>
              <h3 className={`text-2xl font-bold ${expiringClasses.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {expiringClasses.length}
              </h3>
              {expiringClasses.length > 0 && (
                <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold mt-1 flex items-center gap-0.5">
                  <ChevronRight className="w-3 h-3" /> Nhấn để xem chi tiết
                </p>
              )}
            </div>
            <div className={`h-1 ${expiringClasses.length > 0 ? 'bg-red-500' : 'bg-border'} opacity-60`} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Calendar & Sessions ── */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <Card className="overflow-hidden shadow-none">

            {/* Calendar toolbar */}
            <div className="bg-card px-4 md:px-6 py-3 flex items-center justify-between border-b border-border flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleWeekChange(subDays(selectedDate, 7))}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="font-semibold text-foreground text-base flex items-center gap-2 px-1">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  {format(start, 'MM/yyyy')}
                </h3>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleWeekChange(addDays(selectedDate, 7))}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Switch id="show-all" checked={showAllSchedules} onCheckedChange={setShowAllSchedules} />
                  <Label htmlFor="show-all" className="text-xs font-semibold text-muted-foreground cursor-pointer">
                    Lịch tất cả
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-sm"
                  onClick={() => { setSelectedDate(new Date()); fetchSessionsForMonth(new Date()); }}
                  title="Về hôm nay"
                >
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Week day picker */}
            <div className="grid grid-cols-7 border-b border-border bg-secondary/50 dark:bg-secondary/30">
              {weekDays.map((day, idx) => {
                const isActive = isSameDay(day, selectedDate);
                const dayIndex = day.getDay();
                const shortNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const dayName = shortNames[dayIndex];
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`py-2.5 flex flex-col items-center justify-center cursor-pointer transition-colors relative select-none
                      ${isActive
                        ? 'bg-primary/8 dark:bg-primary/15'
                        : 'hover:bg-secondary dark:hover:bg-secondary/70'
                      }`}
                  >
                    <span className={`text-[10px] font-bold uppercase mb-0.5
                      ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                      {dayName}
                    </span>
                    <span className={`text-base font-bold
                      ${isActive ? 'text-primary' : 'text-foreground'}`}>
                      {format(day, 'dd')}
                    </span>
                    {isActive && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-full" />}
                  </div>
                );
              })}
            </div>

            {/* Session list */}
            <div className="bg-secondary/20 dark:bg-secondary/10 p-4 lg:p-6 min-h-[300px] max-h-[500px] overflow-y-auto space-y-3">
              {loadingSessions ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12 text-sm font-medium gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  Đang tải lịch...
                </div>
              ) : sessionForSelected
                  .filter(s => showAllSchedules || s.classes?.tutors?.auth_uid === currentUserId)
                  .length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
                  <Clock className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-semibold">Không có ca dạy nào trong ngày này</p>
                </div>
              ) : (
                sessionForSelected
                  .filter(s => showAllSchedules || s.classes?.tutors?.auth_uid === currentUserId)
                  .map((session, idx) => {
                    const isAdminSession = session.classes?.tutors?.auth_uid === currentUserId;
                    const classId = session.class_id;
                    const isCompleted = session.status !== 'scheduled';
                    return (
                      <Link
                        key={idx}
                        href={`/admin/classes/${classId}`}
                        className={`flex rounded-lg border overflow-hidden transition-all duration-150 cursor-pointer group
                          ${isAdminSession
                            ? 'bg-blue-50/40 dark:bg-blue-900/15 border-blue-100 dark:border-blue-800/50 hover:border-primary/50 dark:hover:border-primary/60'
                            : 'bg-card border-border hover:border-border hover:shadow-sm'
                          }`}
                      >
                        {/* Time column */}
                        <div className={`w-20 md:w-24 border-r flex flex-col items-center justify-center py-3 shrink-0
                          ${isAdminSession
                            ? 'bg-primary/10 dark:bg-primary/20 border-primary/20 dark:border-primary/30 text-primary dark:text-primary'
                            : 'bg-secondary dark:bg-secondary/60 border-border text-muted-foreground'
                          }`}>
                          <span className="font-bold text-xs md:text-sm">{session.start_time?.substring(0, 5)}</span>
                          <span className="opacity-30 my-0.5 text-xs">|</span>
                          <span className="font-bold text-xs md:text-sm">{session.end_time?.substring(0, 5)}</span>
                        </div>

                        {/* Info column */}
                        <div className="flex-1 p-3 md:p-4 flex flex-col justify-center min-w-0">
                          <h4 className={`font-semibold text-sm md:text-base mb-0.5 transition-colors truncate
                            ${isAdminSession ? 'text-foreground group-hover:text-primary' : 'text-foreground group-hover:text-primary'}`}>
                            {session.classes?.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-1.5 truncate">
                            Gia sư: {session.classes?.tutors?.name || 'Chưa phân công'}
                          </p>
                          <div className="flex items-center gap-3 text-[10px] md:text-xs font-semibold text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Video className="w-3.5 h-3.5" /> Trực tuyến
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              {isCompleted ? 'Đã hoàn thành' : 'Sắp diễn ra'}
                            </div>
                          </div>
                        </div>

                        {/* Arrow */}
                        <div className="w-10 md:w-12 border-l border-border flex items-center justify-center bg-card group-hover:bg-accent transition-colors">
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                        </div>
                      </Link>
                    );
                  })
              )}
            </div>
          </Card>
        </div>

        {/* ── Announcements ── */}
        <div className="col-span-1 space-y-6">
          <Card className="shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Thông báo</CardTitle>
              <Button
                variant="default"
                size="sm"
                className="h-7 gap-1 text-[11px]"
                onClick={() => setIsAnnouncementModalOpen(true)}
              >
                <Plus className="w-3 h-3" /> Tạo mới
              </Button>
            </CardHeader>
            <CardContent className="pt-1">
              <div className="space-y-2">
                {announcements.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-4">Chưa có thông báo nào</p>
                ) : (
                  announcements.map((ann, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-accent/40 cursor-pointer transition-all duration-150 group"
                      onClick={() => setViewingAnnouncement(ann)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground text-xs md:text-sm group-hover:text-primary leading-snug transition-colors">
                          {ann.title}
                        </h4>
                        <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{ann.content}</p>
                      {ann.created_at && (
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
                          {new Date(ann.created_at).toLocaleDateString('vi-VN', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                          })}
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

      {/* ── Dialog: Tạo thông báo ── */}
      <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo thông báo mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAnnouncement} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={newAnnouncement.title}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea
                value={newAnnouncement.content}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Đường Link (Google Meet, Tài liệu...)</Label>
              <Input
                value={newAnnouncement.link}
                onChange={e => setNewAnnouncement(prev => ({ ...prev, link: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAnnouncementModalOpen(false)}>
                Hủy
              </Button>
              <Button type="submit">Gửi thông báo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Chi tiết thông báo ── */}
      <Dialog open={!!viewingAnnouncement} onOpenChange={() => setViewingAnnouncement(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold leading-snug pr-4 text-foreground">
              {viewingAnnouncement?.title}
            </DialogTitle>
            {viewingAnnouncement?.created_at && (
              <p className="text-xs text-muted-foreground pt-1">
                Đăng lúc: {new Date(viewingAnnouncement.created_at).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed py-2">
            {viewingAnnouncement?.content || ''}
          </div>
          {viewingAnnouncement?.link && (
            <div className="pt-2 border-t border-border">
              <a
                href={viewingAnnouncement.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                <LinkIcon className="w-4 h-4" /> Xem tài liệu đính kèm
              </a>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingAnnouncement(null)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Lớp sắp hết hạn ── */}
      <Dialog open={showExpiringModal} onOpenChange={setShowExpiringModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Danh Sách Lớp Sắp Hết Hạn (≤ 14 ngày)
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
            {expiringClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">Hiện không có lớp nào sắp hết hạn.</p>
            ) : (
              expiringClasses.map((c: any) => (
                <div
                  key={c.class_id}
                  className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{c.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Gia sư: <span className="font-semibold text-foreground">{c.tutors?.name || 'Chưa phân công'}</span>
                    </p>
                    <p className="text-xs text-destructive font-semibold mt-1">
                      Ngày kết thúc: {c.end_date}
                    </p>
                  </div>
                  <Link
                    href={`/admin/classes/${c.class_id}`}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-destructive/30 text-destructive hover:bg-destructive hover:text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
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
