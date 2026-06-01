'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { format, subMonths, startOfMonth } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function BillingPage() {
  const [viewMode, setViewMode] = useState<'preview' | 'historical'>('preview');
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
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setPaymentPage(1);
    setSalaryPage(1);
  }, [selectedHistoricalPeriod, viewMode]);
  
  const supabase = createClient();

  // Fetch unique historical periods
  useEffect(() => {
    async function loadHistoricalPeriods() {
      const { data } = await supabase.from('payments').select('billing_period');
      if (data) {
        const unique = Array.from(new Set(data.map(d => d.billing_period)));
        setHistoricalPeriods(unique as string[]);
        if (unique.length > 0 && !selectedHistoricalPeriod) {
          setSelectedHistoricalPeriod(unique[0] as string);
        }
      }
    }
    loadHistoricalPeriods();
  }, [supabase]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!mounted) return;
      setLoading(true);
      
      try {
        if (viewMode === 'historical' && selectedHistoricalPeriod) {
          // Load Payments
          const { data: pData } = await supabase
            .from('payments')
            .select('*, students(name), classes(name)')
            .eq('billing_period', selectedHistoricalPeriod)
            .order('created_at', { ascending: false });
            
          if (pData) setPayments(pData);
          
          // Load Stats
          const res = await fetch(`/api/admin/billing/stats?billingPeriod=${encodeURIComponent(selectedHistoricalPeriod)}`);
          if (res.ok) {
            const sData = await res.json();
            if (mounted) setStats(sData);
          }
        } else if (viewMode === 'preview') {
          setPayments([]); // Preview mode does not have payments yet
          
          const res = await fetch(`/api/admin/billing/stats?startDate=${startDate}&endDate=${endDate}`);
          if (res.ok) {
            const sData = await res.json();
            if (mounted) setStats(sData);
          }
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
      alert(data.message || 'Xong');
      
      // Reload historical periods and switch to historical view
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
    if (!confirm(`Bạn có chắc chắn muốn HỦY TOÀN BỘ hóa đơn chưa thu của đợt "${selectedHistoricalPeriod}"?\n\nThao tác này sẽ xóa các hóa đơn chưa thu và cho phép bạn chốt sổ lại từ đầu. Các hóa đơn ĐÃ THU sẽ không bị ảnh hưởng (Và nếu có hóa đơn đã thu, hệ thống sẽ chặn không cho hủy).`)) return;
    
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
      
      // Remove from list and switch to preview mode
      setHistoricalPeriods(prev => prev.filter(p => p !== selectedHistoricalPeriod));
      setSelectedHistoricalPeriod(historicalPeriods.filter(p => p !== selectedHistoricalPeriod)[0] || '');
      if (historicalPeriods.length <= 1) {
          setViewMode('preview');
      }
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
    setGenerating(false);
  }

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const exportTutorSalaries = () => {
    if (!stats || !stats.tutorSalaries || stats.tutorSalaries.length === 0) {
      alert("Không có dữ liệu lương gia sư để xuất!");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(stats.tutorSalaries.map((t: any) => ({
      "Tên Gia Sư": t.name,
      "Tổng Học Phí Thu Vào": t.tuition_collected,
      "Phí CSAT Bị Trừ": t.csat_deducted,
      "Thực Nhận": t.salary
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lương Gia Sư");
    XLSX.writeFile(wb, `luong_gia_su_${selectedHistoricalPeriod || 'preview'}.xlsx`);
  };

  const exportCustomerPayments = () => {
    if (payments.length === 0) {
      alert("Không có dữ liệu học phí học viên để xuất!");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(payments.map(p => ({
      "Tên Học Sinh": p.students?.name || '---',
      "Lớp Học": p.classes?.name || '---',
      "Học Phí Phải Đóng": p.amount,
      "Trạng Thái": p.status === 'paid' ? 'Đã thu' : 'Chưa thu'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Học Phí Học Viên");
    XLSX.writeFile(wb, `hoc_phi_hoc_vien_${selectedHistoricalPeriod}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
         <h2 className="text-3xl font-bold tracking-tight text-gray-900">Kế Toán & Chốt Sổ</h2>
         
         <div className="flex items-center gap-3">
           <Select value={viewMode} onValueChange={(val: any) => setViewMode(val)}>
             <SelectTrigger className="w-[180px]">
               <SelectValue placeholder="Chế độ xem" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="preview">Dự kiến (Chưa chốt)</SelectItem>
               <SelectItem value="historical">Lịch sử (Đã chốt)</SelectItem>
             </SelectContent>
           </Select>

           {viewMode === 'preview' ? (
             <div className="flex items-center gap-2">
               <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[140px]" />
               <span>đến</span>
               <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[140px]" />
               <Button onClick={() => setIsBillingDialogOpen(true)} disabled={generating} variant="secondary">
                 {generating ? 'Đang chạy...' : 'Thực Hiện Chốt Sổ'}
               </Button>
             </div>
           ) : (
             <div className="flex items-center gap-2">
                <Select value={selectedHistoricalPeriod} onValueChange={(val) => val && setSelectedHistoricalPeriod(val)}>
                  <SelectTrigger className="w-[200px]">
                   <SelectValue placeholder="Chọn kỳ hóa đơn" />
                 </SelectTrigger>
                 <SelectContent>
                   {historicalPeriods.map(m => (
                     <SelectItem key={m} value={m}>{m}</SelectItem>
                   ))}
                   {historicalPeriods.length === 0 && <SelectItem value="none" disabled>Không có dữ liệu</SelectItem>}
                 </SelectContent>
               </Select>
               {historicalPeriods.length > 0 && (
                 <Button variant="destructive" onClick={handleRollbackBilling} disabled={generating}>Hủy chốt sổ</Button>
               )}
             </div>
           )}
         </div>
      </div>

      <Dialog open={isBillingDialogOpen} onOpenChange={setIsBillingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận tạo hóa đơn (Chốt sổ)</DialogTitle>
            <DialogDescription>
              Hệ thống sẽ tổng hợp các buổi học CHƯA CHỐT SỔ từ <strong>{startDate}</strong> đến <strong>{endDate}</strong> và đưa vào kỳ hóa đơn bên dưới. Lưu ý: Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tên kỳ hóa đơn (Tùy chọn ghi chú)</Label>
              <Input 
                type="text" 
                value={billingPeriodName} 
                onChange={(e) => setBillingPeriodName(e.target.value)} 
                placeholder="VD: Kỳ 1 tháng 5/2026"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBillingDialogOpen(false)}>Hủy</Button>
            <Button onClick={triggerBillingCron} disabled={generating}>
              {generating ? 'Đang chạy...' : 'Chốt sổ ngay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
               <CardTitle>Phần 1: Học Phí Khách Hàng (Học Sinh)</CardTitle>
               <CardDescription>Các hóa đơn tính toán từ buổi học đã điểm danh</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={exportCustomerPayments} className="ml-4 gap-2 border-slate-300 text-slate-700" disabled={viewMode === 'preview'}>
               <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Xuất Excel
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? <p>Đang tải...</p> : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học Sinh</TableHead>
                    <TableHead>Lớp</TableHead>
                    <TableHead>Tổng Tiền</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewMode === 'preview' && (
                    <TableRow>
                       <TableCell colSpan={5} className="text-center py-4 text-slate-500 italic">
                         Danh sách hóa đơn chỉ hiển thị trong chế độ Lịch sử (Đã chốt sổ).
                       </TableCell>
                    </TableRow>
                  )}
                  {viewMode === 'historical' && payments.slice((paymentPage - 1) * ITEMS_PER_PAGE, paymentPage * ITEMS_PER_PAGE).map(p => (
                    <TableRow key={p.payment_id}>
                      <TableCell>{p.students?.name || '---'}</TableCell>
                      <TableCell>{p.classes?.name || '---'}</TableCell>
                      <TableCell className="font-bold text-blue-700">
                        {formatVND(p.amount)}
                      </TableCell>
                      <TableCell>
                        {p.status === 'paid' ? 
                          <Badge className="bg-green-600">Đã thu</Badge> : 
                          <Badge variant="destructive">Chưa thu</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status === 'unpaid' && (
                          <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(p.payment_id)}>
                            Đánh dấu đã thu
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {viewMode === 'historical' && payments.length === 0 && (
                    <TableRow>
                       <TableCell colSpan={5} className="text-center py-4">Chưa có dữ liệu học phí</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {viewMode === 'historical' && payments.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-slate-500">
                    Trang {paymentPage} / {Math.ceil(payments.length / ITEMS_PER_PAGE)}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={paymentPage === 1} onClick={() => setPaymentPage(p => Math.max(1, p - 1))}>Trước</Button>
                    <Button variant="outline" size="sm" disabled={paymentPage >= Math.ceil(payments.length / ITEMS_PER_PAGE)} onClick={() => setPaymentPage(p => p + 1)}>Sau</Button>
                  </div>
                </div>
              )}
            </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
             <div>
                <CardTitle>Phần 2: Lương Gia Sư</CardTitle>
                <CardDescription>Chi phí trả gia sư sau khi đã trừ CSAT</CardDescription>
             </div>
             <Button variant="outline" size="sm" onClick={exportTutorSalaries} className="ml-4 gap-2 border-slate-300 text-slate-700">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Xuất Excel
             </Button>
          </CardHeader>
          <CardContent>
             {loading ? <p>Đang tải...</p> : (
              <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gia Sư</TableHead>
                    <TableHead>Thu Nhập (trước CSAT)</TableHead>
                    <TableHead>Phí CSAT Trừ</TableHead>
                    <TableHead className="text-right font-bold text-black">Thực Nhận</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {stats?.tutorSalaries?.slice((salaryPage - 1) * ITEMS_PER_PAGE, salaryPage * ITEMS_PER_PAGE).map((t: any) => (
                      <TableRow key={t.tutor_id}>
                        <TableCell className="font-semibold text-slate-800">{t.name}</TableCell>
                        <TableCell className="text-slate-500">{formatVND(t.tuition_collected)}</TableCell>
                        <TableCell className="text-red-500">-{formatVND(t.csat_deducted)}</TableCell>
                        <TableCell className="text-right font-black text-amber-700 text-lg">{formatVND(t.salary)}</TableCell>
                      </TableRow>
                   ))}
                   {(!stats?.tutorSalaries || stats?.tutorSalaries?.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">Không có dữ liệu buổi dạy</TableCell>
                      </TableRow>
                   )}
                </TableBody>
              </Table>
              {stats?.tutorSalaries && stats.tutorSalaries.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-slate-500">
                    Trang {salaryPage} / {Math.ceil(stats.tutorSalaries.length / ITEMS_PER_PAGE)}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={salaryPage === 1} onClick={() => setSalaryPage(p => Math.max(1, p - 1))}>Trước</Button>
                    <Button variant="outline" size="sm" disabled={salaryPage >= Math.ceil(stats.tutorSalaries.length / ITEMS_PER_PAGE)} onClick={() => setSalaryPage(p => p + 1)}>Sau</Button>
                  </div>
                </div>
              )}
             </>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
