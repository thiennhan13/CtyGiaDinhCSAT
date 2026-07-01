'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { format, subMonths, startOfMonth } from 'date-fns';
import { formatVND } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSpreadsheet, ChevronDown, ChevronRight, AlertTriangle, Users, BookOpen, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BillingPage() {
  const [viewMode, setViewMode] = useState<'preview' | 'historical'>('preview');
  const [activeSection, setActiveSection] = useState<'students' | 'tutors'>('students');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Preview Mode State
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Historical Mode State
  const [historicalPeriods, setHistoricalPeriods] = useState<string[]>([]);
  const [selectedHistoricalPeriod, setSelectedHistoricalPeriod] = useState<string>('');

  // Billing Dialog state
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);
  const [billingPeriodName, setBillingPeriodName] = useState(`Đợt ${format(new Date(), 'dd/MM/yyyy')}`);

  // Pagination State
  const [paymentPage, setPaymentPage] = useState(1);
  const [salaryPage, setSalaryPage] = useState(1);
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const ITEMS_PER_PAGE = 20;

  // Preview expand state — tutor_id → expanded lớp
  const [expandedTutors, setExpandedTutors] = useState<Record<string, boolean>>({});
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const toggleTutor  = (id: string) => setExpandedTutors(prev  => ({ ...prev, [id]: !prev[id] }));
  const toggleClass  = (id: string) => setExpandedClasses(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    setPaymentPage(1);
    setSalaryPage(1);
  }, [selectedHistoricalPeriod, viewMode, activeSection]);

  const supabase = createClient();

  // Fetch unique historical periods
  useEffect(() => {
    async function loadHistoricalPeriods() {
      const { data, error } = await supabase.rpc('get_unique_billing_periods');
      if (error) { console.error('Error fetching unique billing periods:', error); return; }
      if (data) {
        const periods = data.map((d: any) => d.billing_period);
        setHistoricalPeriods(periods);
        if (periods.length > 0 && !selectedHistoricalPeriod) {
          setSelectedHistoricalPeriod(periods[0]);
        }
      }
    }
    loadHistoricalPeriods();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!mounted) return;
      setLoading(true);
      try {
        if (viewMode === 'historical' && selectedHistoricalPeriod) {
          const { data: pData } = await supabase
            .from('payments')
            .select('*, students(name), classes(name)')
            .eq('billing_period', selectedHistoricalPeriod)
            .order('created_at', { ascending: false });
          if (pData) setPayments(pData);
          const res = await fetch(`/api/admin/billing/stats?billingPeriod=${encodeURIComponent(selectedHistoricalPeriod)}`);
          if (res.ok) { const sData = await res.json(); if (mounted) setStats(sData); }
        } else if (viewMode === 'preview') {
          setPayments([]);
          const res = await fetch(`/api/admin/billing/stats?startDate=${startDate}&endDate=${endDate}`);
          if (res.ok) { const sData = await res.json(); if (mounted) setStats(sData); }
        }
      } catch (err) {}
      if (mounted) setLoading(false);
    }
    loadData();
    return () => { mounted = false; };
  }, [viewMode, selectedHistoricalPeriod, startDate, endDate, supabase]);

  async function handleMarkAsPaid(id: string) {
    const { error } = await supabase.from('payments').update({ status: 'paid' }).eq('payment_id', id);
    if (!error) {
      setPayments(prev => prev.map(p => p.payment_id === id ? { ...p, status: 'paid' } : p));
    }
  }

  async function triggerBillingCron() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/billing/generate?startDate=${startDate}&endDate=${endDate}&billingPeriod=${encodeURIComponent(billingPeriodName)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Lỗi hệ thống');
      if (data.zero_amount_count > 0) {
        const names = data.zero_amount_students?.join(', ') || `${data.zero_amount_count} học sinh`;
        alert(`${data.message}\n\n⚠️ Cảnh báo: Các học sinh sau có học phí = 0đ và KHÔNG được tạo hóa đơn:\n${names}\n\nHãy kiểm tra lại điểm danh và mức học phí của những học sinh này.`);
      } else {
        alert(data.message || 'Xong');
      }
      setHistoricalPeriods(prev => Array.from(new Set([billingPeriodName, ...prev])));
      setSelectedHistoricalPeriod(billingPeriodName);
      setViewMode('historical');
      setIsBillingDialogOpen(false);
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
    setGenerating(false);
  }

  async function handleRollbackBilling() {
    if (!selectedHistoricalPeriod) return;
    if (!confirm(`Bạn có chắc chắn muốn HỦY các hóa đơn CHƯА THU của đợt "${selectedHistoricalPeriod}"?\n\nCác hóa đơn ĐÃ THU sẽ được GIỮ NGUYÊN. Chỉ các hóa đơn chưa thu mới bị xóa và các buổi học tương ứng sẽ được mở khóa để chốt sổ lại.`)) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/billing/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingPeriod: selectedHistoricalPeriod })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi hệ thống');
      alert(data.message);
      if (data.details?.paid_kept > 0) {
        setPayments([]); setStats(null);
      } else {
        const remaining = historicalPeriods.filter(p => p !== selectedHistoricalPeriod);
        setHistoricalPeriods(remaining);
        setSelectedHistoricalPeriod(remaining[0] || '');
        if (remaining.length === 0) setViewMode('preview');
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
    setGenerating(false);
  }



  // Tạo map student|class -> session_count từ stats.studentInvoicePreview
  // Dùng để hiển thị cột "Số Buổi" trong bảng lịch sử thu
  const sessionCountMap: Record<string, number> = {};
  (stats?.studentInvoicePreview || []).forEach((inv: any) => {
    sessionCountMap[`${inv.student_id}|${inv.class_id}`] = inv.session_count || 0;
  });

  // ──────────────────────────────────────────────────────────────────
  // EXPORT: Lương Gia Sư — Multi-sheet workbook, mỗi gia sư 1 sheet
  // ──────────────────────────────────────────────────────────────────
  const exportTutorSalaries = () => {
    const detail = stats?.tutorSalaryDetail ?? stats?.tutorSalaries;
    if (!detail?.length) { alert('Không có dữ liệu lương gia sư để xuất!'); return; }

    const wb = XLSX.utils.book_new();
    const period = selectedHistoricalPeriod || 'preview';

    // — Sheet 0: Tổng hợp chung —
    const summaryRows = detail.map((t: any) => ({
      'Tên Gia Sư': t.name,
      'Số Buổi': t.classes
        ? t.classes.reduce((s: number, c: any) => s + (c.session_count || 0), 0)
        : '---',
      'Học Phí Thu Vào (₫)': t.tuition_collected,
      'Phí CSAT Bị Trừ (₫)': t.csat_deducted,
      'Thực Nhận (₫)': t.salary,
    }));
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'TỔNG HỢP CHUNG');

    // — Sheet 1…N: Mỗi gia sư 1 sheet —
    detail.forEach((tutor: any) => {
      // Bug 1 prevention: cắt tên sheet ≤ 30 ký tự, xóa ký tự cấm của Excel
      const rawName = (tutor.name || 'Gia Su').replace(/[\[\]*?/\\:]/g, '').trim();
      const sheetName = rawName.slice(0, 30) || 'Gia Su';

      const aoa: any[][] = [];

      // Header thẻ gia sư
      aoa.push([`GIA SƯ: ${tutor.name}`]);
      aoa.push([`Kỳ lương: ${period}`]);
      aoa.push([`Tổng thực nhận: ${formatVND(tutor.salary)}`]);
      aoa.push([]);

      const classes = tutor.classes ?? [];
      if (classes.length === 0) {
        // Fallback nếu chỉ có dữ liệu tổng (không có tutorSalaryDetail)
        aoa.push(['Không có dữ liệu chi tiết buổi dạy.']);
      } else {
        classes.forEach((cls: any) => {
          // Tiêu đề khối lớp
          aoa.push([
            `--- LỚP: ${cls.class_name}`,
            `${cls.session_count} buổi`,
            '',
            '',
            `Thực nhận lớp: ${formatVND(cls.tuition - cls.csat)}`,
          ]);
          // Header cột buổi học
          aoa.push(['Ngày Dạy', 'Số HS Có Mặt', 'Học Phí Thu (₫)', 'Phí CSAT Trừ (₫)', 'Thực Nhận Buổi (₫)']);
          // Chi tiết từng buổi
          (cls.sessions || []).forEach((sess: any) => {
            aoa.push([
              sess.date,
              sess.attended_count,
              sess.tuition,
              sess.csat,
              sess.net,
            ]);
          });
          // Dòng tổng cộng lớp
          aoa.push(['TỔNG LỚP', cls.session_count, cls.tuition, cls.csat, cls.tuition - cls.csat]);
          aoa.push([]); // dòng trống ngăn cách
        });
      }

      // Dòng tổng cộng toàn kỳ
      aoa.push([]);
      aoa.push([`TỔNG KỲ ${period}`, '', tutor.tuition_collected, tutor.csat_deducted, tutor.salary]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `luong_gia_su_${period}.xlsx`);
  };

  // ──────────────────────────────────────────────────────────────────
  // EXPORT: Học Phí Học Sinh — thêm Số Buổi, Học Phí TB/Buổi
  // ──────────────────────────────────────────────────────────────────
  const exportCustomerPayments = () => {
    if (viewMode === 'preview') {
      const list = stats?.studentInvoicePreview || [];
      if (!list.length) { alert('Không có dữ liệu dự kiến hóa đơn để xuất!'); return; }
      const ws = XLSX.utils.json_to_sheet(list.map((inv: any) => ({
        'Tên Học Sinh': inv.student_name || '---',
        'Lớp Học': inv.class_name || '---',
        'Số Buổi Dự Kiến': inv.session_count || 0,
        'Học Phí Dự Kiến (₫)': inv.total_amount || 0,
        'Học Phí TB/Buổi (₫)': inv.session_count > 0 ? Math.round(inv.total_amount / inv.session_count) : 0,
        'Trạng Thái': 'Dự kiến (Chưa chốt)',
        'Kỳ': `Dự kiến từ ${startDate} đến ${endDate}`,
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dự Kiến Hóa Đơn');
      XLSX.writeFile(wb, `du_kien_hoc_phi_${startDate}_${endDate}.xlsx`);
      return;
    }

    if (!payments.length) { alert('Không có dữ liệu học phí học viên để xuất!'); return; }
    const ws = XLSX.utils.json_to_sheet(payments.map(p => {
      const key = `${p.student_id}|${p.class_id}`;
      const sessCount = sessionCountMap[key] ?? '---';
      const avg = typeof sessCount === 'number' && sessCount > 0
        ? Math.round(p.amount / sessCount)
        : '---';
      return {
        'Tên Học Sinh': p.students?.name || '---',
        'Lớp Học': p.classes?.name || '---',
        // Bug 2 note: số buổi = số buổi có mặt điểm danh (attended)
        'Số Buổi Đã Học': sessCount,
        'Học Phí Phải Đóng (₫)': p.amount,
        'Học Phí TB/Buổi (₫)': avg,
        'Trạng Thái': p.status === 'paid' ? 'Đã thu' : 'Chưa thu',
        'Kỳ Hóa Đơn': selectedHistoricalPeriod || '---',
      };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Học Phí Học Viên');
    XLSX.writeFile(wb, `hoc_phi_hoc_vien_${selectedHistoricalPeriod}.xlsx`);
  };

  // =====================
  // Helpers for preview counts
  // =====================
  const unpaidCount = payments.filter(p => p.status === 'unpaid').length;
  const paidCount   = payments.filter(p => p.status === 'paid').length;

  return (
    <div className="space-y-6">
      {/* ── Header & Mode Switcher Card ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Kế Toán &amp; Chốt Sổ</h2>
            <p className="text-sm text-slate-500 mt-1">Tổng hợp chuyên cần, tính toán học phí học sinh và thanh toán lương gia sư</p>
          </div>
          {/* Mode Switcher Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>⚡</span>
              <span>Dự Kiến Chốt Sổ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('historical')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                viewMode === 'historical'
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>📁</span>
              <span>Lịch Sử Chốt Sổ</span>
            </button>
          </div>
        </div>

        {/* Mode Action Bar Card */}
        <Card className="bg-slate-50/80 border-slate-200/80 shadow-sm">
          <CardContent className="p-4">
            {viewMode === 'preview' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Khoảng thời gian dự kiến:</span>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[140px] h-9 bg-white" />
                  <span>đến</span>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[140px] h-9 bg-white" />
                  {(() => {
                    const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
                    return days > 90 ? (
                      <span className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        ⚠️ {days} ngày — API có thể chậm
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={() => setIsBillingDialogOpen(true)} disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium h-9">
                    {generating ? 'Đang chạy...' : '🚀 Thực Hiện Chốt Sổ Đợt Này'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Kỳ hóa đơn đã chốt:</span>
                  <Select value={selectedHistoricalPeriod} onValueChange={(val) => val && setSelectedHistoricalPeriod(val)}>
                    <SelectTrigger className="w-[220px] h-9 bg-white font-medium">
                      <SelectValue placeholder="Chọn kỳ hóa đơn" />
                    </SelectTrigger>
                    <SelectContent>
                      {historicalPeriods.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                      {historicalPeriods.length === 0 && <SelectItem value="none" disabled>Không có dữ liệu</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  {historicalPeriods.length > 0 && (
                    <Button variant="destructive" size="sm" onClick={handleRollbackBilling} disabled={generating} className="gap-1.5 shadow-sm h-9">
                      <AlertTriangle className="w-4 h-4" /> Hủy chốt sổ đợt này
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Confirm Dialog ── */}
      <Dialog open={isBillingDialogOpen} onOpenChange={setIsBillingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tạo hóa đơn (Chốt sổ)</DialogTitle>
            <DialogDescription>
              Hệ thống sẽ tổng hợp các buổi học CHƯA CHỐT SỔ từ <strong>{startDate}</strong> đến <strong>{endDate}</strong> và đưa vào kỳ hóa đơn bên dưới.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên kỳ hóa đơn</Label>
              <Input
                type="text"
                value={billingPeriodName}
                onChange={(e) => setBillingPeriodName(e.target.value)}
                placeholder="VD: Tháng 06/2026"
              />
            </div>
            {/* Summary trước khi chốt */}
            {stats && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1">
                <p className="font-semibold text-slate-700 mb-2">Tóm tắt dự kiến:</p>
                <div className="flex justify-between"><span className="text-slate-500">Hóa đơn sẽ tạo:</span><span className="font-bold text-blue-700">{stats.studentInvoicePreview?.length || 0} hóa đơn</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tổng học phí:</span><span className="font-bold">{formatVND(stats.totalStudentTuition)}</span></div>
                {stats.studentInvoicePreview?.some((s: any) => s.has_zero_fee || s.total_amount === 0) && (
                  <div className="mt-2 flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{stats.studentInvoicePreview.filter((s: any) => s.total_amount === 0).length} học sinh có phí = 0đ sẽ không được tạo hóa đơn.</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBillingDialogOpen(false)}>Hủy</Button>
            <Button onClick={triggerBillingCron} disabled={generating}>
              {generating ? 'Đang chạy...' : 'Chốt sổ ngay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Học phí thu vào</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-slate-900">{formatVND(stats?.totalStudentTuition || 0)}</h3>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 uppercase">Lương Gia sư</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-slate-900">{formatVND(stats?.totalTutorSalary || 0)}</h3>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-emerald-500 bg-emerald-50 border-x-0 border-b-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 uppercase">Doanh thu trung tâm</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-emerald-900">{formatVND(stats?.totalCenterRevenue || 0)}</h3>
            <p className="text-xs text-emerald-700 mt-1">Từ các khoản phí CSAT</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Section Switcher Bar (2 Nút Riêng Biệt cho Phần 1 và Phần 2) ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-slate-100 p-2 rounded-xl border border-slate-200 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveSection('students')}
          className={`flex-1 flex items-center justify-between px-5 py-3.5 rounded-lg transition-all cursor-pointer ${
            activeSection === 'students'
              ? 'bg-white text-blue-700 shadow-md ring-1 ring-blue-500/20 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${activeSection === 'students' ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
              <Users className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-base">Phần 1: {viewMode === 'preview' ? 'Dự Kiến Hóa Đơn Học Sinh' : 'Học Phí Khách Hàng (Học Sinh)'}</div>
              <div className="text-xs font-normal opacity-75">{viewMode === 'preview' ? 'Tổng hợp từ buổi học chưa chốt sổ' : 'Các hóa đơn đã phát hành'}</div>
            </div>
          </div>
          <Badge className={`ml-2 px-2.5 py-0.5 text-xs font-bold ${activeSection === 'students' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
            {viewMode === 'preview' ? (stats?.studentInvoicePreview?.length || 0) : payments.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('tutors')}
          className={`flex-1 flex items-center justify-between px-5 py-3.5 rounded-lg transition-all cursor-pointer ${
            activeSection === 'tutors'
              ? 'bg-white text-amber-700 shadow-md ring-1 ring-amber-500/20 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 font-medium'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${activeSection === 'tutors' ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-base">Phần 2: Lương Gia Sư</div>
              <div className="text-xs font-normal opacity-75">{viewMode === 'preview' ? 'Dự kiến theo từng lớp & buổi dạy' : 'Chi phí trả gia sư thực tế'}</div>
            </div>
          </div>
          <Badge className={`ml-2 px-2.5 py-0.5 text-xs font-bold ${activeSection === 'tutors' ? 'bg-amber-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
            {(stats?.tutorSalaryDetail ?? stats?.tutorSalaries ?? []).length}
          </Badge>
        </button>
      </div>

      {/* ── PHẦN 1: DỰ KIẾN / HÓA ĐƠN HỌC SINH ── */}
      {activeSection === 'students' && (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Phần 1: {viewMode === 'preview' ? 'Dự Kiến Hóa Đơn Học Sinh' : 'Học Phí Khách Hàng (Học Sinh)'}
            </CardTitle>
            <CardDescription>
              {viewMode === 'preview'
                ? 'Tổng hợp từ buổi học đã điểm danh, chưa chốt sổ'
                : 'Các hóa đơn đã được tạo sau khi chốt sổ'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {viewMode === 'historical' && (
              <>
                {unpaidCount > 0 && (
                  <Badge variant="destructive" className="text-xs">{unpaidCount} chưa thu</Badge>
                )}
                {paidCount > 0 && (
                  <Badge className="bg-green-600 text-xs">{paidCount} đã thu</Badge>
                )}
                <Button
                  variant={unpaidOnly ? 'default' : 'outline'}
                  size="sm"
                  className={unpaidOnly ? 'bg-amber-500 hover:bg-amber-600' : 'border-amber-300 text-amber-700'}
                  onClick={() => { setUnpaidOnly(v => !v); setPaymentPage(1); }}
                >
                  {unpaidOnly ? '✔ Chỉ chưa thu' : '💰 Lọc chưa thu'}
                </Button>
              </>
            )}
            <Button
              variant="outline" size="sm"
              onClick={exportCustomerPayments}
              className="gap-2 border-slate-300 text-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Xuất Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-slate-400 text-sm">Đang tải...</p> : (
            <>
              {/* Preview mode: bảng dự kiến từ stats API */}
              {viewMode === 'preview' && (
                <>
                  {(!stats?.studentInvoicePreview || stats.studentInvoicePreview.length === 0) ? (
                    <p className="text-center py-6 text-slate-400 italic text-sm">Không có buổi học nào chưa chốt sổ trong khoảng thời gian này.</p>
                  ) : (
                    <>
                      {/* Cảnh báo HS phí = 0 */}
                      {stats.studentInvoicePreview.some((s: any) => s.total_amount === 0) && (
                        <div className="mb-3 flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                          <div>
                            <strong>Cảnh báo:</strong> Các học sinh sau có học phí = 0đ và sẽ KHÔNG được tạo hóa đơn:{' '}
                            <strong>{stats.studentInvoicePreview.filter((s: any) => s.total_amount === 0).map((s: any) => s.student_name).join(', ')}</strong>.
                            Vui lòng kiểm tra lại điểm danh và học phí.
                          </div>
                        </div>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Học Sinh</TableHead>
                            <TableHead>Lớp</TableHead>
                            <TableHead className="text-center">Số Buổi</TableHead>
                            <TableHead className="text-right">Tổng Tiền</TableHead>
                            <TableHead className="text-center">Trạng Thái</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats.studentInvoicePreview.map((inv: any) => (
                            <TableRow key={`${inv.student_id}|${inv.class_id}`} className={inv.total_amount === 0 ? 'bg-amber-50' : ''}>
                              <TableCell className="font-medium">{inv.student_name}</TableCell>
                              <TableCell className="text-slate-600">{inv.class_name}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{inv.session_count} buổi</Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold text-blue-700">
                                {formatVND(inv.total_amount)}
                              </TableCell>
                              <TableCell className="text-center">
                                {inv.total_amount === 0
                                  ? <Badge className="bg-amber-500 text-xs">⚠ Phí = 0</Badge>
                                  : <Badge variant="outline" className="text-slate-600 text-xs">Sẽ tạo HĐ</Badge>
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </>
              )}

              {/* Historical mode: bảng hóa đơn thực tế */}
              {viewMode === 'historical' && (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Học Sinh</TableHead>
                        <TableHead>Lớp</TableHead>
                        <TableHead className="text-center">Số Buổi
                          <span className="block text-[10px] text-slate-400 font-normal">(có mặt)</span>
                        </TableHead>
                        <TableHead className="text-right">Tổng Tiền</TableHead>
                        <TableHead className="text-right">TB/Buổi</TableHead>
                        <TableHead>Trạng Thái</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.filter(p => !unpaidOnly || p.status === 'unpaid')
                        .slice((paymentPage - 1) * ITEMS_PER_PAGE, paymentPage * ITEMS_PER_PAGE)
                        .map(p => {
                          const mapKey = `${p.student_id}|${p.class_id}`;
                          // Bug 3 prevention: fallback '---' nếu stats chưa tải
                          const sessCount = sessionCountMap[mapKey];
                          const sessDisplay = loading ? '...' : (sessCount != null ? sessCount : '---');
                          const avgDisplay = typeof sessCount === 'number' && sessCount > 0
                            ? formatVND(Math.round(p.amount / sessCount))
                            : '---';
                          return (
                        <TableRow key={p.payment_id}>
                          <TableCell className="font-medium">{p.students?.name || '---'}</TableCell>
                          <TableCell className="text-slate-600">{p.classes?.name || '---'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{sessDisplay} buổi</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-blue-700">{formatVND(p.amount)}</TableCell>
                          <TableCell className="text-right text-slate-500 text-sm">{avgDisplay}</TableCell>
                          <TableCell>
                            {p.status === 'paid'
                              ? <Badge className="bg-green-600">Đã thu</Badge>
                              : <Badge variant="destructive">Chưa thu</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.status === 'unpaid' && (
                              <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(p.payment_id)}>
                                Đánh dấu đã thu
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                          );
                        })}
                      {payments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-slate-400">Chưa có dữ liệu học phí</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {payments.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-slate-500">Trang {paymentPage} / {Math.ceil(payments.length / ITEMS_PER_PAGE)}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={paymentPage === 1} onClick={() => setPaymentPage(p => Math.max(1, p - 1))}>Trước</Button>
                        <Button variant="outline" size="sm" disabled={paymentPage >= Math.ceil(payments.length / ITEMS_PER_PAGE)} onClick={() => setPaymentPage(p => p + 1)}>Sau</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* ── PHẦN 2: LƯƠNG GIA SƯ (chi tiết expand/collapse) ── */}
      {activeSection === 'tutors' && (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              Phần 2: Lương Gia Sư
            </CardTitle>
            <CardDescription>
              {viewMode === 'preview' ? 'Dự kiến — bấm ▶ để xem chi tiết từng lớp và từng buổi' : 'Chi phí trả gia sư sau khi trừ phí CSAT'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportTutorSalaries} className="ml-4 gap-2 border-slate-300 text-slate-700">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Xuất Excel
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-slate-400 text-sm">Đang tải...</p> : (
            <>
              {/* Preview & Historical: dùng tutorSalaryDetail nếu có, fallback tutorSalaries */}
              {(stats?.tutorSalaryDetail ?? stats?.tutorSalaries ?? []).length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">Không có dữ liệu buổi dạy</p>
              ) : (
                <div className="space-y-2">
                  {(stats?.tutorSalaryDetail ?? stats?.tutorSalaries ?? [])
                    .slice((salaryPage - 1) * ITEMS_PER_PAGE, salaryPage * ITEMS_PER_PAGE)
                    .map((tutor: any) => {
                      const isExpanded = !!expandedTutors[tutor.tutor_id];
                      const hasDetail  = !!tutor.classes?.length;
                      return (
                        <div key={tutor.tutor_id} className="border border-slate-200 rounded-lg overflow-hidden">
                          {/* Gia sư — row tổng */}
                          <div
                            className={`flex items-center gap-3 px-4 py-3 ${hasDetail ? 'cursor-pointer hover:bg-slate-50' : ''} bg-white`}
                            onClick={() => hasDetail && toggleTutor(tutor.tutor_id)}
                          >
                            {hasDetail ? (
                              isExpanded
                                ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            ) : <span className="w-4" />}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 truncate">{tutor.name || 'Chưa rõ'}</span>
                                <span className="text-xs text-slate-400">ID: {tutor.tutor_id ? tutor.tutor_id.slice(0, 8) : '---'}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {tutor.classes ? tutor.classes.reduce((acc: number, c: any) => acc + (c.session_count || 0), 0) : 0} buổi · {tutor.classes?.length || 0} lớp
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-amber-600">{formatVND(tutor.salary)}</div>
                              <div className="text-xs text-slate-400">Net nhận</div>
                            </div>
                          </div>

                          {/* Chi tiết từng lớp (khi expand) */}
                          {isExpanded && hasDetail && (
                            <div className="bg-slate-50 border-t border-slate-200 divide-y divide-slate-100 px-4 py-2">
                              {tutor.classes.map((cls: any) => {
                                const clsKey = `${tutor.tutor_id}_${cls.class_id}`;
                                const isClsExpanded = !!expandedClasses[clsKey];
                                const hasSessions   = !!cls.sessions?.length;
                                return (
                                  <div key={cls.class_id} className="py-2">
                                    {/* Row lớp */}
                                    <div
                                      className={`flex items-center justify-between text-sm ${hasSessions ? 'cursor-pointer hover:text-blue-600' : ''}`}
                                      onClick={() => hasSessions && toggleClass(clsKey)}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {hasSessions ? (
                                          isClsExpanded
                                            ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        ) : <span className="w-3.5" />}
                                        <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="font-medium text-slate-800 truncate">
                                          {cls.class_name || `Lớp #${cls.class_id}`}
                                        </span>
                                        <span className="text-xs text-slate-400 shrink-0">({cls.session_count} buổi)</span>
                                      </div>
                                      <div className="text-right shrink-0 ml-2">
                                        <span className="font-semibold text-slate-800">{formatVND((cls.tuition || 0) - (cls.csat || 0))}</span>
                                      </div>
                                    </div>

                                    {/* Chi tiết từng buổi học */}
                                    {isClsExpanded && hasSessions && (
                                      <div className="mt-1.5 ml-6 space-y-1 text-xs bg-white rounded border border-slate-200 p-2">
                                        <div className="grid grid-cols-12 text-slate-400 font-medium pb-1 border-b border-slate-100">
                                          <div className="col-span-3">Ngày học</div>
                                          <div className="col-span-3 text-right">HP thu</div>
                                          <div className="col-span-3 text-right">Phí CSAT</div>
                                          <div className="col-span-3 text-right font-semibold">GS nhận</div>
                                        </div>
                                        {cls.sessions.map((sess: any, idx: number) => (
                                          <div key={idx} className="grid grid-cols-12 py-0.5 text-slate-600">
                                            <div className="col-span-3">{sess.date}</div>
                                            <div className="col-span-3 text-right">{formatVND(sess.tuition)}</div>
                                            <div className="col-span-3 text-right text-rose-500">-{formatVND(sess.csat)}</div>
                                            <div className="col-span-3 text-right font-semibold text-amber-600">{formatVND(sess.net)}</div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {/* Pagination lương */}
                  {(stats?.tutorSalaryDetail ?? stats?.tutorSalaries ?? []).length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-slate-500">Trang {salaryPage} / {Math.ceil((stats?.tutorSalaryDetail ?? stats?.tutorSalaries ?? []).length / ITEMS_PER_PAGE)}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={salaryPage === 1} onClick={() => setSalaryPage(p => Math.max(1, p - 1))}>Trước</Button>
                        <Button variant="outline" size="sm" disabled={salaryPage >= Math.ceil((stats?.tutorSalaryDetail ?? stats?.tutorSalaries ?? []).length / ITEMS_PER_PAGE)} onClick={() => setSalaryPage(p => p + 1)}>Sau</Button>
                      </div>
                    </div>
                  )}

                  {/* Chú thích cột (header ẩn trên mobile) */}
                  <div className="hidden sm:flex text-xs text-slate-400 px-4 pt-2 gap-3">
                    <span className="flex-1"></span>
                    <span className="w-36 text-right">Học phí thu</span>
                    <span className="w-36 text-right">Trừ CSAT</span>
                    <span className="w-40 text-right font-semibold">Thực nhận</span>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
