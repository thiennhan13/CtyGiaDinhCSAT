'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, BookOpen, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { formatVND } from '@/lib/format';

export default function AdminTutorDetailPage() {
  const params = useParams();
  const tutorId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [tutor, setTutor] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalSessions: 0, activeClasses: 0 });
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    async function fetchAll() {
      setLoading(true);

      // 1. Thông tin gia sư
      const { data: tutorData } = await supabase
        .from('tutors')
        .select('*')
        .eq('tutor_id', tutorId)
        .single();
      if (tutorData) setTutor(tutorData);

      // 2. Danh sách lớp học (đang + đã dạy)
      const { data: classData } = await supabase
        .from('classes')
        .select('class_id, name, class_type, status, start_date, end_date, csat_fee_per_session')
        .eq('tutor_id', tutorId)
        .order('status', { ascending: true })
        .order('start_date', { ascending: false });
      if (classData) {
        setClasses(classData);
        setStats(prev => ({
          ...prev,
          activeClasses: classData.filter(c => c.status === 'active').length,
        }));
      }

      // 3. Tổng số buổi đã dạy (tutor_id_snapshot hoặc class hiện tại)
      const { count: sessionCount } = await supabase
        .from('sessions')
        .select('session_id', { count: 'exact', head: true })
        .eq('tutor_id_snapshot', tutorId)
        .eq('status', 'completed');
      if (sessionCount !== null) setStats(prev => ({ ...prev, totalSessions: sessionCount }));

      // 4. Lịch sử thay đổi liên quan đến gia sư này (đổi vào hoặc đổi ra)
      const { data: logData } = await supabase
        .from('class_change_log')
        .select('*, classes(name)')
        .or(`old_value.eq.${tutorId},new_value.eq.${tutorId}`)
        .eq('change_type', 'tutor_change')
        .order('created_at', { ascending: false })
        .limit(20);
      if (logData) setChangeLogs(logData);

      // 5. Lương theo kỳ đã chốt sổ (từ billing stats)
      const { data: periods } = await supabase
        .from('sessions')
        .select('billing_period')
        .eq('tutor_id_snapshot', tutorId)
        .eq('status', 'completed')
        .not('billing_period', 'is', null);

      if (periods && periods.length > 0) {
        const uniquePeriods = [...new Set(periods.map(p => p.billing_period))];
        const salaryRows: any[] = [];

        for (const period of uniquePeriods.slice(0, 10)) {
          // Lấy sessions của gia sư trong kỳ này
          const { data: periodSessions } = await supabase
            .from('sessions')
            .select('session_id, csat_fee_snapshot')
            .eq('tutor_id_snapshot', tutorId)
            .eq('billing_period', period)
            .eq('status', 'completed');

          if (!periodSessions || periodSessions.length === 0) continue;

          const sessionIds = periodSessions.map(s => s.session_id);
          const { data: atts } = await supabase
            .from('session_attendance')
            .select('session_id, tuition_fee_snapshot, status')
            .in('session_id', sessionIds)
            .eq('status', 'attended');

          let tuitionTotal = 0;
          let csatTotal = 0;

          atts?.forEach(att => {
            const fee = parseFloat(String(att.tuition_fee_snapshot || 0));
            tuitionTotal += fee;
          });

          periodSessions.forEach(sess => {
            const csatFee = parseFloat(String(sess.csat_fee_snapshot || 0));
            // Chỉ trừ CSAT nếu buổi có học sinh đến
            const hasAttended = atts?.some(a => a.session_id === sess.session_id);
            if (hasAttended) csatTotal += csatFee;
          });

          salaryRows.push({
            period,
            sessions: periodSessions.length,
            tuition: tuitionTotal,
            csat: csatTotal,
            net: tuitionTotal - csatTotal,
          });
        }
        setSalaryHistory(salaryRows.sort((a, b) => b.period.localeCompare(a.period)));
      }

      setLoading(false);
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorId]);

  if (loading) return <div className="p-8 text-slate-500">Đang tải dữ liệu gia sư...</div>;
  if (!tutor) return <div className="p-8 text-red-500">Không tìm thấy gia sư.</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/admin/tutors')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{tutor.name}</h2>
          <p className="text-slate-500 text-sm">{tutor.email} · {tutor.phone}</p>
        </div>
        <Badge
          variant="secondary"
          className={tutor.status === 'inactive' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}
        >
          {tutor.status === 'inactive' ? 'Vô hiệu hóa' : 'Đang hoạt động'}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-indigo-500 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Lớp đang dạy</p>
              <p className="text-2xl font-bold text-slate-900">{stats.activeClasses}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Buổi đã dạy</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalSessions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Tổng thu nhập</p>
              <p className="text-xl font-bold text-emerald-700">
                {formatVND(salaryHistory.reduce((s, r) => s + r.net, 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Danh sách lớp */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Các Lớp Phụ Trách
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên Lớp</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng Thái</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="text-right">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes.map(c => (
                <TableRow key={c.class_id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline">{c.class_type || 'Cơ bản'}</Badge></TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                      {c.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {c.start_date ? format(new Date(c.start_date), 'dd/MM/yyyy') : '---'}
                    {c.end_date ? ` → ${format(new Date(c.end_date), 'dd/MM/yyyy')}` : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/classes/${c.class_id}`}>
                      <Button variant="outline" size="sm">Xem</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {classes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-slate-400">Chưa có lớp nào.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lịch sử lương */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-500" />
            Lịch Sử Lương Theo Kỳ
          </CardTitle>
          <CardDescription>10 kỳ gần nhất đã chốt sổ</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kỳ</TableHead>
                <TableHead>Số buổi</TableHead>
                <TableHead>Học phí thu</TableHead>
                <TableHead>Phí CSAT trừ</TableHead>
                <TableHead className="text-right font-bold">Thực nhận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaryHistory.map(row => (
                <TableRow key={row.period}>
                  <TableCell className="font-medium">{row.period}</TableCell>
                  <TableCell>{row.sessions}</TableCell>
                  <TableCell className="text-slate-600">{formatVND(row.tuition)}</TableCell>
                  <TableCell className="text-red-500">-{formatVND(row.csat)}</TableCell>
                  <TableCell className="text-right font-bold text-amber-700">{formatVND(row.net)}</TableCell>
                </TableRow>
              ))}
              {salaryHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-slate-400">Chưa có kỳ chốt sổ nào.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lịch sử thay đổi */}
      {changeLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch Sử Thay Đổi Liên Quan</CardTitle>
            <CardDescription>Các lần gia sư này được thêm vào hoặc rút khỏi lớp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {changeLogs.map(log => (
                <div key={log.log_id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                  <div>
                    <span className="font-semibold">{(log.classes as any)?.name}</span>
                    <span className="text-slate-500 ml-2">
                      {log.old_value === tutorId ? '→ Chuyển sang gia sư khác' : '← Được phân công vào lớp này'}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs">
                    {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
