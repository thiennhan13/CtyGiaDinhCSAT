'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { formatVND } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface StudentTuitionTableProps {
  stats: any;
  payments: any[];
  viewMode: 'preview' | 'historical';
  loading: boolean;
  selectedHistoricalPeriod: string;
  startDate: string;
  endDate: string;
  ITEMS_PER_PAGE: number;
  handleMarkAsPaid: (id: string) => Promise<void>;
}

export function StudentTuitionTable({
  stats,
  payments,
  viewMode,
  loading,
  selectedHistoricalPeriod,
  startDate,
  endDate,
  ITEMS_PER_PAGE,
  handleMarkAsPaid,
}: StudentTuitionTableProps) {
  const [paymentPage, setPaymentPage] = useState(1);
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  const sessionCountMap: Record<string, number> = {};
  (stats?.studentInvoicePreview || []).forEach((inv: any) => {
    sessionCountMap[`${inv.student_id}|${inv.class_id}`] = inv.session_count || 0;
  });

  const unpaidCount = payments.filter(p => p.status === 'unpaid').length;
  const paidCount   = payments.filter(p => p.status === 'paid').length;

  const exportCustomerPayments = async () => {
    try {
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
        const safeStart = String(startDate || '').replace(/[\[\]*?/\\:|<>"]/g, '_');
        const safeEnd = String(endDate || '').replace(/[\[\]*?/\\:|<>"]/g, '_');
        XLSX.writeFile(wb, `du_kien_hoc_phi_${safeStart}_${safeEnd}.xlsx`);
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
          'Số Buổi Đã Học': sessCount,
          'Học Phí Phải Đóng (₫)': p.amount || 0,
          'Học Phí TB/Buổi (₫)': avg,
          'Trạng Thái': p.status === 'paid' ? 'Đã thu' : 'Chưa thu',
          'Kỳ Hóa Đơn': selectedHistoricalPeriod || '---',
        };
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Học Phí Học Viên');
      const safePeriod = String(selectedHistoricalPeriod || 'historical').replace(/[\[\]*?/\\:|<>"]/g, '_');
      XLSX.writeFile(wb, `hoc_phi_hoc_vien_${safePeriod}.xlsx`);
    } catch (err: any) {
      alert('Lỗi khi xuất file Excel Hóa Đơn: ' + (err.message || String(err)));
    }
  };

  return (
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
              {unpaidCount > 0 && <Badge variant="destructive" className="text-xs">{unpaidCount} chưa thu</Badge>}
              {paidCount > 0 && <Badge className="bg-green-600 text-xs">{paidCount} đã thu</Badge>}
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
          <Button variant="outline" size="sm" onClick={exportCustomerPayments} className="gap-2 border-border text-foreground">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Xuất Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-muted-foreground/70 text-sm">Đang tải...</p> : (
          <>
            {viewMode === 'preview' && (
              <>
                {(!stats?.studentInvoicePreview || stats.studentInvoicePreview.length === 0) ? (
                  <p className="text-center py-6 text-muted-foreground/70 italic text-sm">Không có buổi học nào chưa chốt sổ trong khoảng thời gian này.</p>
                ) : (
                  <>
                    {stats.studentInvoicePreview.some((s: any) => s.total_amount === 0) && (
                      <div className="mb-3 flex items-start gap-2 text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
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
                          <TableHead className="text-right">TB/Buổi</TableHead>
                          <TableHead className="text-center">Trạng Thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats.studentInvoicePreview.map((inv: any) => (
                          <TableRow key={`${inv.student_id}|${inv.class_id}`} className={inv.total_amount === 0 ? 'bg-amber-500/10 dark:bg-amber-950/20' : ''}>
                            <TableCell className="font-medium">{inv.student_name}</TableCell>
                            <TableCell className="text-muted-foreground">{inv.class_name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{inv.session_count} buổi</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {formatVND(inv.total_amount)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">
                              {inv.session_count > 0 ? formatVND(Math.round(inv.total_amount / inv.session_count)) : '---'}
                            </TableCell>
                            <TableCell className="text-center">
                              {inv.total_amount === 0
                                ? <Badge className="bg-amber-500 text-xs">⚠ Phí = 0</Badge>
                                : <Badge variant="outline" className="text-muted-foreground text-xs">Sẽ tạo HĐ</Badge>
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

            {viewMode === 'historical' && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Học Sinh</TableHead>
                      <TableHead>Lớp</TableHead>
                      <TableHead className="text-center">Số Buổi</TableHead>
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
                        const sessCount = sessionCountMap[mapKey];
                        const sessDisplay = loading ? '...' : (sessCount != null ? sessCount : '---');
                        const avgDisplay = typeof sessCount === 'number' && sessCount > 0
                          ? formatVND(Math.round(p.amount / sessCount))
                          : '---';
                        return (
                          <TableRow key={p.payment_id}>
                            <TableCell className="font-medium">{p.students?.name || '---'}</TableCell>
                            <TableCell className="text-muted-foreground">{p.classes?.name || '---'}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{sessDisplay} buổi</Badge>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary">{formatVND(p.amount)}</TableCell>
                            <TableCell className="text-right text-muted-foreground text-sm">{avgDisplay}</TableCell>
                            <TableCell>
                              {p.status === 'paid' ? <Badge className="bg-green-600">Đã thu</Badge> : <Badge variant="destructive">Chưa thu</Badge>}
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
                        <TableCell colSpan={7} className="text-center py-4 text-muted-foreground/70">Chưa có dữ liệu học phí</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                {payments.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-muted-foreground">Trang {paymentPage} / {Math.ceil(payments.length / ITEMS_PER_PAGE)}</span>
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
  );
}
