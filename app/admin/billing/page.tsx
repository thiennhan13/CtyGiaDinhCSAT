'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/client';

export default function BillingPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    setLoading(true);
    const { data, error } = await supabase
      .from('payments')
      .select('*, students(name), classes(name)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPayments(data);
    }
    setLoading(false);
  }

  async function handleMarkAsPaid(id: string) {
    const { error } = await supabase.from('payments').update({ status: 'paid' }).eq('payment_id', id);
    if (!error) fetchPayments();
  }

  async function triggerBillingCron() {
    if (!confirm('Hệ thống thường tự động chốt sổ vào mùng 1. Bạn có chắc muốn chạy thủ công tiến trình chốt sổ tháng trước ngay bây giờ?')) return;
    
    setGenerating(true);
    try {
      const res = await fetch('/api/cron/generate-billing');
      const data = await res.json();
      alert(data.message || 'Xong');
      fetchPayments();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-3xl font-bold tracking-tight text-gray-900">Kế Toán & Chốt Sổ</h2>
         <Button onClick={triggerBillingCron} disabled={generating} variant="secondary">
            {generating ? 'Đang chạy...' : 'Chạy Cron Chốt Sổ Thủ Công'}
         </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Hóa Đơn Tự Động (Payments)</CardTitle>
          <CardDescription>Các hóa đơn được sinh ra tự động dựa trên số buổi điểm danh "Có mặt"</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p>Đang tải...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kỳ (Tháng)</TableHead>
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
                    <TableCell className="font-medium">{p.billing_period}</TableCell>
                    <TableCell>{p.students?.name || '---'}</TableCell>
                    <TableCell>{p.classes?.name || '---'}</TableCell>
                    <TableCell className="font-bold text-blue-700">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.amount)}
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
                     <TableCell colSpan={6} className="text-center py-4">Chưa có dữ liệu</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
