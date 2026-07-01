'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { DollarSign, TrendingUp, BookOpen, FileSpreadsheet, ChevronDown, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as XLSX from 'xlsx';
import { formatVND } from '@/lib/format';

export default function TutorSalaryPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [tutorInfo, setTutorInfo] = useState<any>(null);
  const [periods, setPeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [salaryData, setSalaryData] = useState<any>(null);
  const [sessionDetails, setSessionDetails] = useState<any[]>([]);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});



  const toggleSession = (sessionId: string) =>
    setExpandedSessions(prev => ({ ...prev, [sessionId]: !prev[sessionId] }));

  // Load tutor info & available periods
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: tutorData } = await supabase
        .from('tutors')
        .select('tutor_id, name, email')
        .eq('auth_uid', user.id)
        .single();
      if (tutorData) setTutorInfo(tutorData);
      if (!tutorData) { setLoading(false); return; }

      // R3 FIX: Lấy danh sách kỳ từ sessions.tutor_id_snapshot (bao gồm cả lớp đã đổi gia sư)
      const { data: periodData } = await supabase
        .from('sessions')
        .select('billing_period, class_id')
        .eq('tutor_id_snapshot', tutorData.tutor_id)
        .eq('status', 'completed')
        .not('billing_period', 'is', null);

      // Lấy class_id từ snapshot để query payments (kể cả lớp đã chuyển sang gia sư khác)
      const classIdsFromSnapshot = [...new Set(
        (periodData || []).map((s: any) => s.class_id).filter(Boolean)
      )];

      let paidPeriodData: any[] = [];
      if (classIdsFromSnapshot.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('billing_period')
          .in('class_id', classIdsFromSnapshot)
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
      setExpandedSessions({});

      // Lấy sessions của gia sư trong kỳ này (theo tutor_id_snapshot — đúng sau khi đổi gia sư)
      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('session_id, date, start_time, end_time, csat_fee_snapshot, classes(class_id, name)')
        .eq('tutor_id_snapshot', tutorInfo.tutor_id)
        .eq('billing_period', selectedPeriod)
        .eq('status', 'completed')
        .order('date', { ascending: true });

      if (!sessionsData || sessionsData.length === 0) { setLoading(false); return; }

      const sessionIds = sessionsData.map(s => s.session_id);

      // Lấy điểm danh + tên học sinh để hiển thị chi tiết từng buổi
      const { data: atts } = await supabase
        .from('session_attendance')
        .select('session_id, student_id, tuition_fee_snapshot, status, students(name)')
        .in('session_id', sessionIds);

      let totalTuition = 0;
      let totalCsat    = 0;

      // Tổng kết theo lớp
      const classMap: Record<string, { class_name: string; session_count: number; tuition: number; csat: number }> = {};

      const detailRows = sessionsData.map(sess => {
        const sessAtts    = (atts || []).filter(a => a.session_id === sess.session_id);
        const attendedAtts = sessAtts.filter(a => a.status === 'attended');
        const sessionTuition = attendedAtts.reduce(
          (sum, a) => sum + parseFloat(String(a.tuition_fee_snapshot || 0)), 0
        );
        const csatFee = attendedAtts.length > 0
          ? parseFloat(String(sess.csat_fee_snapshot || 0))
          : 0;
        const net = sessionTuition - csatFee;

        totalTuition += sessionTuition;
        totalCsat    += csatFee;

        const cls = sess.classes as any;
        const classId   = cls?.class_id   || 'unknown';
        const className = cls?.name        || '---';

        if (!classMap[classId]) {
          classMap[classId] = { class_name: className, session_count: 0, tuition: 0, csat: 0 };
        }
        classMap[classId].session_count += 1;
        classMap[classId].tuition       += sessionTuition;
        classMap[classId].csat          += csatFee;

        return {
          session_id:    sess.session_id,
          date:          sess.date,
          start_time:    sess.start_time,
          end_time:      sess.end_time,
          className,
          classId,
          attendedCount: attendedAtts.length,
          totalStudents: sessAtts.length,
          tuition:       sessionTuition,
          csat:          csatFee,
          net,
          students:      attendedAtts.map(a => ({
            name: (a.students as any)?.name || a.student_id,
            fee:  parseFloat(String(a.tuition_fee_snapshot || 0)),
          })),
        };
      });

      setSessionDetails(detailRows);
      setSalaryData({
        period:   selectedPeriod,
        sessions: sessionsData.length,
        tuition:  totalTuition,
        csat:     totalCsat,
        net:      totalTuition - totalCsat,
        classSummary: Object.values(classMap).sort((a, b) => b.tuition - a.tuition),
      });
      setLoading(false);
    }
    loadSalary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, tutorInfo]);

  function exportExcel() {
    if (!sessionDetails.length || !salaryData) return;

    const wb = XLSX.utils.book_new();
    const period = selectedPeriod || 'ky_luong';
    // Bug 1 prevention: cắt tên sheet ≤ 30 ký tự, xóa ký tự cấm
    const rawSheetName = (tutorInfo?.name || 'Gia Su').replace(/[\[\]*?/\\:]/g, '').trim();
    const sheetName = rawSheetName.slice(0, 30) || 'Gia Su';

    const aoa: any[][] = [];

    // Header
    aoa.push([`BẢNG LƯƠNG: ${tutorInfo?.name || ''}`]);
    aoa.push([`Kỳ lương: ${period}`]);
    aoa.push([`Tổng thực nhận: ${formatVND(salaryData.net)}`]);
    aoa.push([]);

    // Gom buổi học theo lớp
    const classOrder: string[] = [];
    const byClass: Record<string, typeof sessionDetails> = {};
    sessionDetails.forEach(row => {
      if (!byClass[row.classId]) {
        byClass[row.classId] = [];
        classOrder.push(row.classId);
      }
      byClass[row.classId].push(row);
    });

    classOrder.forEach(classId => {
      const rows = byClass[classId];
      const cls = salaryData.classSummary?.find((c: any) => c.class_name === rows[0].className);
      const clsTuition = cls?.tuition ?? rows.reduce((s: number, r: any) => s + r.tuition, 0);
      const clsCsat    = cls?.csat    ?? rows.reduce((s: number, r: any) => s + r.csat, 0);
      const clsNet     = clsTuition - clsCsat;

      // Dòng tiêu đề khối lớp
      aoa.push([
        `--- LỚP: ${rows[0].className}`,
        `${rows.length} buổi`,
        '',
        '',
        `Thực nhận lớp: ${formatVND(clsNet)}`,
      ]);
      // Header cột
      aoa.push(['Ngày Dạy', 'Giờ', 'Số HS Có Mặt', 'Học Phí Thu (₫)', 'Phí CSAT Trừ (₫)', 'Thực Nhận Buổi (₫)']);
      // Từng buổi học
      rows.forEach(r => {
        const giờ = r.start_time ? `${r.start_time?.substring(0, 5)} - ${r.end_time?.substring(0, 5)}` : '';
        aoa.push([r.date, giờ, r.attendedCount, r.tuition, r.csat, r.net]);
      });
      // Dòng tổng lớp
      aoa.push(['TỔNG LỚP', '', rows.length, clsTuition, clsCsat, clsNet]);
      aoa.push([]); // dòng trống
    });

    // Tổng kỳ
    aoa.push([]);
    aoa.push([`TỔNG KỲ ${period}`, '', salaryData.sessions, salaryData.tuition, salaryData.csat, salaryData.net]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    wb.SheetNames.push(sheetName);
    wb.Sheets[sheetName] = ws;
    XLSX.writeFile(wb, `luong_${rawSheetName}_${period}.xlsx`);
  }

  if (!tutorInfo && !loading) {
    return <div className="p-8 text-red-500">Không tìm thấy thông tin gia sư. Vui lòng liên hệ admin.</div>;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
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
            {periods.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            {periods.length === 0 && <SelectItem value="none" disabled>Chưa có kỳ nào được chốt</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* ── Empty state ── */}
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
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

          {/* ── Tổng kết theo lớp ── */}
          {salaryData.classSummary?.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Tổng Kết Theo Lớp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lớp</TableHead>
                      <TableHead className="text-center">Số buổi</TableHead>
                      <TableHead className="text-right">Học phí thu</TableHead>
                      <TableHead className="text-right">Trừ CSAT</TableHead>
                      <TableHead className="text-right font-bold">Thực nhận</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryData.classSummary.map((cls: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{cls.class_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{cls.session_count} buổi</Badge>
                        </TableCell>
                        <TableCell className="text-right text-blue-700">{formatVND(cls.tuition)}</TableCell>
                        <TableCell className="text-right text-red-500">-{formatVND(cls.csat)}</TableCell>
                        <TableCell className="text-right font-bold text-amber-700">{formatVND(cls.tuition - cls.csat)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Dòng tổng */}
                    <TableRow className="bg-slate-50 font-bold border-t-2">
                      <TableCell className="text-slate-700">Tổng kỳ {salaryData.period}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{salaryData.sessions} buổi</Badge>
                      </TableCell>
                      <TableCell className="text-right text-blue-700">{formatVND(salaryData.tuition)}</TableCell>
                      <TableCell className="text-right text-red-500">-{formatVND(salaryData.csat)}</TableCell>
                      <TableCell className="text-right text-amber-800 text-lg">{formatVND(salaryData.net)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── Chi tiết từng buổi (expand/collapse xem HS) ── */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-500" />
                  Chi Tiết Từng Buổi — Kỳ: {salaryData.period}
                </CardTitle>
                <CardDescription>
                  Bấm ▶ vào từng buổi để xem học phí từng học sinh. Học phí tính trên học sinh có mặt.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2 ml-4">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Xuất Excel
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? <p className="text-slate-400 text-sm">Đang tải...</p> : (
                <div className="space-y-1">
                  {/* Header row */}
                  <div className="hidden sm:flex text-xs text-slate-400 px-4 py-2 border-b">
                    <span className="w-7"></span>
                    <span className="w-24">Ngày</span>
                    <span className="flex-1">Lớp / Giờ</span>
                    <span className="w-20 text-center">Có mặt</span>
                    <span className="w-32 text-right">Học phí</span>
                    <span className="w-32 text-right">Phí CSAT</span>
                    <span className="w-36 text-right font-semibold">Thực nhận</span>
                  </div>

                  {sessionDetails.map((row) => {
                    const isExpanded = !!expandedSessions[row.session_id];
                    return (
                      <div key={row.session_id} className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* Buổi học — dòng chính */}
                        <div
                          className="flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-slate-50 bg-white"
                          onClick={() => toggleSession(row.session_id)}
                        >
                          {isExpanded
                            ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
                          <span className="text-slate-600 text-sm w-24 shrink-0">{row.date}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">{row.className}</p>
                            <p className="text-xs text-slate-400">
                              {row.start_time?.substring(0, 5)} – {row.end_time?.substring(0, 5)}
                            </p>
                          </div>
                          <span className="w-20 text-center shrink-0">
                            <Badge
                              variant={row.attendedCount === row.totalStudents ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {row.attendedCount}/{row.totalStudents}
                            </Badge>
                          </span>
                          <span className="text-blue-700 text-sm w-32 text-right hidden sm:block">{formatVND(row.tuition)}</span>
                          <span className="text-red-500 text-sm w-32 text-right hidden sm:block">-{formatVND(row.csat)}</span>
                          <span className={`font-bold text-sm w-36 text-right ${row.net < 0 ? 'text-red-600' : 'text-amber-700'}`}>
                            {formatVND(row.net)}
                            {row.net < 0 && <span className="block text-xs text-red-500">⚠ Âm</span>}
                          </span>
                        </div>

                        {/* Expand: danh sách học sinh có mặt */}
                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-slate-50 px-10 py-2 space-y-1">
                            {row.students.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-1">Không có học sinh nào có mặt trong buổi này.</p>
                            ) : (
                              <>
                                <p className="text-xs text-slate-500 font-semibold uppercase mb-2">Học sinh có mặt:</p>
                                {row.students.map((stu: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-700">{stu.name}</span>
                                    <span className="text-blue-600 font-medium">{formatVND(stu.fee)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between items-center text-sm font-bold border-t border-slate-200 pt-1 mt-1">
                                  <span className="text-slate-600">Tổng thu buổi</span>
                                  <span className="text-blue-700">{formatVND(row.tuition)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Totals row */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold mt-2">
                    <span className="w-7"></span>
                    <span className="text-slate-700 flex-1">Tổng kỳ {salaryData.period}</span>
                    <span className="w-20 text-center text-slate-500 text-sm hidden sm:block">{salaryData.sessions} buổi</span>
                    <span className="text-blue-700 w-32 text-right hidden sm:block">{formatVND(salaryData.tuition)}</span>
                    <span className="text-red-500 w-32 text-right hidden sm:block">-{formatVND(salaryData.csat)}</span>
                    <span className="text-amber-800 text-lg w-36 text-right">{formatVND(salaryData.net)}</span>
                  </div>
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
