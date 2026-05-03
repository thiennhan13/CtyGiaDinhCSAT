'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';
import { format, subMonths } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function BillingPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const [selectedPeriod, setSelectedPeriod] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [stats, setStats] = useState<any>(null);
  
  // Create last 6 months options
  const monthOptions = Array.from({ length: 6 }).map((_, i) => format(subMonths(new Date(), i), 'yyyy-MM'));

  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      if (!mounted) return;
      setLoading(true);
      
      // Load Payments
      const { data: pData } = await supabase
        .from('payments')
        .select('*, students(name), classes(name)')
        .eq('billing_period', selectedPeriod)
        .order('created_at', { ascending: false });
        
      if (pData) setPayments(pData);
      
      // Load Stats
      try {
        const res = await fetch(`/api/admin/billing/stats?period=${selectedPeriod}`);
        if (res.ok) {
          const sData = await res.json();
          setStats(sData);
        }
      } catch (err) {}
      
      setLoading(false);
    }
    loadData();
    return () => { mounted = false; };
  }, [selectedPeriod, supabase]);

  async function handleMarkAsPaid(id: string) {
    const { error } = await supabase.from('payments').update({ status: 'paid' }).eq('payment_id', id);
    if (!error) {
      setPayments(prev => prev.map(p => p.payment_id === id ? { ...p, status: 'paid' } : p));
    }
  }

  async function triggerBillingCron() {
    if (!confirm('Hệ thống thường tự động chốt sổ vào mùng 1. Bạn có chắc muốn chạy thủ công tiến trình chốt sổ ngay bây giờ?')) return;
    
    setGenerating(true);
    try {
      const res = await fetch('/api/cron/generate-billing');
      const data = await res.json();
      alert(data.message || 'Xong');
      // Reload current period
      setSelectedPeriod(format(subMonths(new Date(), 1), 'yyyy-MM')); // assuming it generated last month
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
    setGenerating(false);
  }

  const formatVND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

  const exportTutorSalaries = () => {
    if (!stats || !stats.tutorSalaries || stats.tutorSalaries.length === 0) {
      alert("Không có liệu lương gia sư để xuất!");
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
    XLSX.writeFile(wb, `luong_gia_su_${selectedPeriod}.xlsx`);
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
    XLSX.writeFile(wb, `hoc_phi_hoc_vien_${selectedPeriod}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
         <h2 className="text-3xl font-bold tracking-tight text-gray-900">Kế Toán & Chốt Sổ</h2>
         <div className="flex items-center gap-3">
           <Select value={selectedPeriod} onValueChange={(val) => val && setSelectedPeriod(val)}>
             <SelectTrigger className="w-[180px]">
               <SelectValue placeholder="Chọn tháng" />
             </SelectTrigger>
             <SelectContent>
               {monthOptions.map(m => (
                 <SelectItem key={m} value={m}>Tháng {m}</SelectItem>
               ))}
             </SelectContent>
           </Select>
           <Button onClick={triggerBillingCron} disabled={generating} variant="secondary">
              {generating ? 'Đang chạy...' : 'Chạy Chốt Sổ Thủ Công'}
           </Button>
         </div>
      </div>

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
            <Button variant="outline" size="sm" onClick={exportCustomerPayments} className="ml-4 gap-2 border-slate-300 text-slate-700">
               <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Xuất Excel
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? <p>Đang tải...</p> : (
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
                  {payments.map(p => (
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
                  {payments.length === 0 && (
                    <TableRow>
                       <TableCell colSpan={5} className="text-center py-4">Chưa có dữ liệu học phí tháng này</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
                   {stats?.tutorSalaries?.map((t: any) => (
                      <TableRow key={t.tutor_id}>
                        <TableCell className="font-semibold text-slate-800">{t.name}</TableCell>
                        <TableCell className="text-slate-500">{formatVND(t.tuition_collected)}</TableCell>
                        <TableCell className="text-red-500">-{formatVND(t.csat_deducted)}</TableCell>
                        <TableCell className="text-right font-black text-amber-700 text-lg">{formatVND(t.salary)}</TableCell>
                      </TableRow>
                   ))}
                   {(!stats?.tutorSalaries || stats?.tutorSalaries?.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">Không có dữ liệu buổi dạy tháng {selectedPeriod}</TableCell>
                      </TableRow>
                   )}
                </TableBody>
              </Table>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
