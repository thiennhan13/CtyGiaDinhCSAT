'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronRight, ChevronLeft, Video, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface SessionCalendarProps {
  initialSessions: any[];
  currentUserId: string | null;
}

export function SessionCalendar({ initialSessions, currentUserId }: SessionCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonthStr, setCurrentMonthStr] = useState(format(new Date(), 'yyyy-MM'));
  const [sessionsByDate, setSessionsByDate] = useState<Record<string, any[]>>(() => {
    const grouped: Record<string, any[]> = {};
    initialSessions.forEach(s => {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(s);
    });
    return grouped;
  });
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showAllSchedules, setShowAllSchedules] = useState(true);
  const supabase = createClient();

  const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(start, i));

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

  const handleWeekChange = (newDate: Date) => {
    setSelectedDate(newDate);
    fetchSessionsForMonth(newDate);
  };

  const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
  const sessionForSelected = sessionsByDate[formattedSelectedDate] || [];
  
  const filteredSessions = sessionForSelected.filter(s => showAllSchedules || s.classes?.tutors?.auth_uid === currentUserId);

  return (
    <div className="csat-card overflow-hidden h-full flex flex-col">
      {/* Calendar toolbar */}
      <div className="bg-card px-4 md:px-6 py-3 flex items-center justify-between border-b border-border flex-wrap gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 md:h-8 md:w-8"
            onClick={() => handleWeekChange(subDays(selectedDate, 7))}
          >
            <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" />
          </Button>
          <h3 className="font-semibold text-foreground text-base flex items-center gap-2 px-1">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {format(start, 'MM/yyyy')}
          </h3>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 md:h-8 md:w-8"
            onClick={() => handleWeekChange(addDays(selectedDate, 7))}
          >
            <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />
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
            className="h-11 w-11 md:h-8 md:w-8 rounded-sm hover:bg-secondary"
            onClick={() => { setSelectedDate(new Date()); fetchSessionsForMonth(new Date()); }}
            title="Về hôm nay"
          >
            <Clock className="w-5 h-5 md:w-4 md:h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Week day picker */}
      <div className="grid grid-cols-7 border-b border-border bg-secondary/50 dark:bg-secondary/30 shrink-0">
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
      <div className="bg-secondary/20 dark:bg-secondary/10 p-3 md:p-6 flex-1 overflow-y-auto space-y-3 min-h-[300px]">
        {loadingSessions ? (
          // Skeleton UI
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex rounded-lg border border-border bg-card overflow-hidden shimmer h-[76px]">
                <div className="w-20 md:w-24 border-r border-border/50 bg-secondary/20 shrink-0" />
                <div className="flex-1 p-3" />
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-12">
            <Clock className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-xs font-semibold">Không có ca dạy nào trong ngày này</p>
          </div>
        ) : (
          filteredSessions.map((session, idx) => {
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
                  <h4 className="font-semibold text-sm md:text-base mb-0.5 transition-colors truncate text-foreground group-hover:text-primary">
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
    </div>
  );
}
