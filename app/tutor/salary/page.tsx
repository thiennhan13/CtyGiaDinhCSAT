'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, TrendingUp, BookOpen, FileSpreadsheet } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';

export default function TutorSalaryPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [tutorInfo, setTutorInfo] = useState<any>(null);
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [salaryData, setSalaryData] = useState<any>(null);
  const [sessionDetails, setSessionDetails] = useState<any[]>([]);

  const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);

  // Load tutor info & available periods
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Lấy thông tin gia sư từ auth
      const { data: tutorData } = await supabase
        .from('tutors')
        .select('tutor_id, name, email')
        .eq('auth_uid', user.id)
        .single();
      if (tutorData) setTutorInfo(tutorData);

      if (!tutorData) { setLoading(false); return; }

      // Lấy danh sách kỳ từ sessions (buổi học còn billing_period)
      const { data: periodData } = await supabase
        .from('sessions')
        .select('billing_period')
        .eq('tutor_id_snapshot', tutorData.tutor_id)
        .eq('status', 'completed')
        .not('billing_period', 'is', null);

      // L7 FIX: Tránh join không có khóa ngoại trực tiếp giữa sessions và payments gây crash.
      // Đầu tiên, lấy danh sách class_id của các lớp mà gia sư này dạy.
      const { data: tutorClasses } = await supabase
        .from('classes')
        .select('class_id')
        .eq('tutor_id', tutorData.tutor_id);
      
      const classIds = (tutorClasses || []).map(c => c.class_id);

      let paidPeriodData: any[] = [];
      if (classIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('billing_period')
          .in('class_id', classIds)
          .eq('status', 'paid');
        if (paymentsData) paidPeriodData = paymentsData;
      }

      const periodsFromSessions = (periodData || []).map(p => p.billing_period as string);
      const periodsFromPayments = (paidPeriodData || []).map(p => p.billing_period as string);
      const unique = [...new Set([...periodsFromSessions, ...periodsFromPayments])]
        .filter(Boolean)
        .sort((a, b) => b.localeCompare(a));
      setPeriods(unique);
      if (unique.length > 0) setSelectedPeriod(unique[0]);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load salary data for selected period
  useEffect(() => {
    if (!selectedPeriod || !tutorInfo) return;

    async function loadSalary() {
      setLoading(true);
      setSalaryData(null);
      setSessionDetails([]);

      // Lấy sessions của gia sư trong kỳ này
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('session_id, date, start_time, end_time, csat_fee_snapshot, classes(name)')
        .eq('tutor_id_snapshot', tutorInfo.tutor_id)
        .eq('billing_period', selectedPeriod)
        .eq('status', 'completed')
        .order('date', { ascending: true });

      if (!sessionsData || sessionsData.length === 0) {
        setLoading(false);
        return;
      }

      const sessionIds = sessionsData.map(s => s.session_id);

      // Lấy điểm danh
      const { data: atts } = await supabase
        .from('session_attendance')
        .select('session_id, student_id, tuition_fee_snapshot, status, students(name)')
        .in('session_id', sessionIds);

      let totalTuition = 0;
      let totalCsat = 0;

      const detailRows = sessionsData.map(sess => {
        const sessAtts = (atts || []).filter(a => a.session_id === sess.session_id);
        const attendedAtts = sessAtts.filter(a => a.status === 'attended');
        const sessionTuition = attendedAtts.reduce((sum, a) => sum + parseFloat(String(a.tuition_fee_snapshot || 0)), 0);
        const csatFee = attendedAtts.length > 0 ? parseFloat(String(sess.csat_fee_snapshot || 0)) : 0;

        totalTuition += sessionTuition;
        totalCsat += csatFee;

        return {
          date: sess.date,
          className: (sess.classes as any)?.name || '---',
          attendedCount: attendedAtts.length,
          totalStudents: sessAtts.length,
          tuition: sessionTuition,
          csat: csatFee,
          net: sessionTuition - csatFee,
        };
      });

      setSessionDetails(detailRows);
      setSalaryData({
        period: selectedPeriod,
        sessions: sessionsData.length,
        tuition: totalTuition,
        csat: totalCsat,
        net: totalTuition - totalCsat,
      });
      setLoading(false);
    }
    loadSalary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, tutorInfo]);

  function exportExcel() {
    if (!sessionDetails.length || !salaryData) return;
    const ws = XLSX.utils.json_to_sheet(sessionDetails.map(r => ({
      'Ngày dạy': r.date,
      'Tên lớp': r.className,
      'HS có mặt': r.attendedCount,
      'Tổng HS': r.totalStudents,
      'Học phí thu': r.tuition,
      'Phí CSAT trừ': r.csat,
      'Thực nhận buổi': r.net,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chi tiết lương');
    XLSX.writeFile(wb, `luong_${tutorInfo?.name || 'gia_su'}_${selectedPeriod}.xlsx`);
  }

  if (!tutorInfo && !loading) {
    return <div className="p-8 text-red-500">Không tìm thấy thông tin gia sư. Vui lòng liên hệ admin.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Bảng Lương Của Tôi</h2>
          <p className="text-slate-500 text-sm mt-1">{tutorInfo?.name}</p>
        </div>
        <Select value={selectedPeriod} onValueChange={v => v && setSelectedPeriod(v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Chọn kỳ lương" />
          </SelectTrigger>
          <SelectContent>
            {periods.map(p => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
            {periods.length === 0 && (
              <SelectItem value="none" disabled>Chưa có kỳ nào được chốt</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {periods.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold">Chưa có kỳ lương nào được chốt sổ.</p>
            <p className="text-sm mt-1">Liên hệ Admin để biết thêm thông tin.</p>
          </CardContent>
        </Card>
      )}

      {salaryData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Số buổi</p>
                <p className="text-2xl font-bold text-slate-900">{salaryData.sessions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Học phí thu vào</p>
                <p className="text-xl font-bold text-blue-700">{formatVND(salaryData.tuition)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Phí CSAT bị trừ</p>
                <p className="text-xl font-bold text-red-500">-{formatVND(salaryData.csat)}</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="p-4">
                <p className="text-xs text-amber-700 font-semibold uppercase mb-1">💰 Thực Nhận</p>
                <p className="text-2xl font-bold text-amber-800">{formatVND(salaryData.net)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Detail Table */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Chi Tiết Từng Buổi — Kỳ: {salaryData.period}
                </CardTitle>
                <CardDescription>Học phí tính trên học sinh có mặt, phí CSAT được trừ mỗi buổi có học sinh</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2 ml-4">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Xuất Excel
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-slate-400">Đang tải...</p> : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ngày</TableHead>
                        <TableHead>Lớp</TableHead>
                        <TableHead>Có mặt / Tổng HS</TableHead>
                        <TableHead>Học phí</TableHead>
                        <TableHead>Phí CSAT</TableHead>
                        <TableHead className="text-right font-bold">Thực nhận buổi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sessionDetails.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-slate-600 text-sm">{row.date}</TableCell>
                          <TableCell className="font-medium">{row.className}</TableCell>
                          <TableCell>
                            <Badge variant={row.attendedCount === row.totalStudents ? 'default' : 'secondary'}>
                              {row.attendedCount}/{row.totalStudents}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-blue-700">{formatVND(row.tuition)}</TableCell>
                          <TableCell className="text-red-500">-{formatVND(row.csat)}</TableCell>
                          <TableCell className="text-right font-bold text-amber-700">{formatVND(row.net)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-slate-50 font-bold border-t-2">
                        <TableCell colSpan={3} className="text-slate-700">Tổng kỳ {salaryData.period}</TableCell>
                        <TableCell className="text-blue-700">{formatVND(salaryData.tuition)}</TableCell>
                        <TableCell className="text-red-500">-{formatVND(salaryData.csat)}</TableCell>
                        <TableCell className="text-right text-amber-800 text-lg">{formatVND(salaryData.net)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!salaryData && !loading && selectedPeriod && (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Không có dữ liệu cho kỳ này.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
