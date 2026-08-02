'use client';

import { KPICards } from '@/components/admin/dashboard/KPICards';
import { SessionCalendar } from '@/components/admin/dashboard/SessionCalendar';
import { AnnouncementsWidget } from '@/components/admin/dashboard/AnnouncementsWidget';

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
  return (
    <div className="space-y-6">
      {/* ── 4 KPI Cards — Neo Brutalism Style ── */}
      <KPICards kpis={initialKpis} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Calendar & Sessions ── */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <SessionCalendar initialSessions={initialSessions} currentUserId={currentUserId} />
        </div>

        {/* ── Announcements ── */}
        <div className="col-span-1 space-y-6">
          <AnnouncementsWidget initialAnnouncements={initialAnnouncements} />
        </div>
      </div>
    </div>
  );
}
