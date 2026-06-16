import { createClient } from '@/lib/supabase/server';
import { format, addDays, startOfWeek, subDays } from 'date-fns';
import { DashboardClient } from './DashboardClient';

// Luôn lấy data mới nhất, không cache (dữ liệu KPI thay đổi liên tục)
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Lấy thông tin user hiện tại để lọc lịch
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date();
  const currentMonthStr = format(today, 'yyyy-MM');
  const in14 = new Date(today);
  in14.setDate(today.getDate() + 14);
  const todayStr = today.toISOString().split('T')[0];
  const in14Str = in14.toISOString().split('T')[0];

  // Tính khoảng thời gian tuần hiện tại để lấy sessions ban đầu
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  // Lấy rộng hơn: từ đầu tháng đến cuối tháng (để cache đủ dữ liệu cho cả tháng hiện tại)
  const monthStart = format(subDays(startOfWeek(new Date(today.getFullYear(), today.getMonth(), 1), { weekStartsOn: 1 }), 7), 'yyyy-MM-dd');
  const monthEnd = format(addDays(new Date(today.getFullYear(), today.getMonth() + 1, 0), 7), 'yyyy-MM-dd');

  // Fetch song song tất cả dữ liệu trên server (Vercel Tokyo ↔ Supabase Tokyo: ~0ms latency)
  const [
    paymentsResult,
    classCountResult,
    unpaidCountResult,
    expiringResult,
    announcementsResult,
    sessionsResult,
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'paid')
      .eq('billing_period', currentMonthStr),
    supabase
      .from('classes')
      .select('class_id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('payments')
      .select('payment_id', { count: 'exact', head: true })
      .eq('status', 'unpaid'),
    supabase
      .from('classes')
      .select('class_id, name, end_date, tutors(name)')
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .gte('end_date', todayStr)
      .lte('end_date', in14Str)
      .order('end_date'),
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('sessions')
      .select('*, classes(class_id, name, tutor_id, tutors(name, auth_uid))')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('start_time'),
  ]);

  const totalRevenue = paymentsResult.data?.reduce((acc, p) => acc + (p.amount || 0), 0) ?? 0;

  return (
    <DashboardClient
      initialKpis={{
        totalRevenue,
        activeClassCount: classCountResult.count ?? 0,
        unpaidCount: unpaidCountResult.count ?? 0,
        expiringClasses: expiringResult.data ?? [],
      }}
      initialAnnouncements={announcementsResult.data ?? []}
      initialSessions={sessionsResult.data ?? []}
      currentUserId={user?.id ?? null}
    />
  );
}
