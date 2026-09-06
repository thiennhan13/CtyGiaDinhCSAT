'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { formatVND } from '@/lib/utils';

interface BillingHeaderProps {
  stats: any;
  viewMode: 'preview' | 'historical';
  setViewMode: (v: 'preview' | 'historical') => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  historicalPeriods: string[];
  selectedHistoricalPeriod: string;
  setSelectedHistoricalPeriod: (v: string) => void;
  generating: boolean;
  isBillingDialogOpen: boolean;
  setIsBillingDialogOpen: (v: boolean) => void;
  billingPeriodName: string;
  setBillingPeriodName: (v: string) => void;
  triggerBillingCron: () => Promise<void>;
  handleRollbackBilling: () => Promise<void>;
}

export function BillingHeader({
  stats,
  viewMode,
  setViewMode,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  historicalPeriods,
  selectedHistoricalPeriod,
  setSelectedHistoricalPeriod,
  generating,
  isBillingDialogOpen,
  setIsBillingDialogOpen,
  billingPeriodName,
  setBillingPeriodName,
  triggerBillingCron,
  handleRollbackBilling,
}: BillingHeaderProps) {
  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Kế Toán & Chốt Sổ</h2>
            <p className="text-sm text-muted-foreground mt-1">Tổng hợp chuyên cần, tính toán học phí học sinh và thanh toán lương gia sư</p>
          </div>
          <div className="bg-secondary p-1.5 rounded-xl flex items-center gap-1 border border-border shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                viewMode === 'preview' ? 'bg-card text-primary shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-border/60'
              }`}
            >
              <span>⚡</span><span>Dự Kiến Chốt Sổ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('historical')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                viewMode === 'historical' ? 'bg-card text-primary shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-border/60'
              }`}
            >
              <span>📁</span><span>Lịch Sử Chốt Sổ</span>
            </button>
          </div>
        </div>

        <Card className="bg-secondary/50 border-border/80 shadow-sm">
          <CardContent className="p-4">
            {viewMode === 'preview' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <span className="font-semibold text-foreground">Khoảng thời gian dự kiến:</span>
                  <Input type="date" aria-label="Ngày bắt đầu kỳ" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-[140px] h-9 bg-card" />
                  <span>đến</span>
                  <Input type="date" aria-label="Ngày kết thúc kỳ" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-[140px] h-9 bg-card" />
                  {(() => {
                    const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
                    return days > 90 ? (
                      <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
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
                <div className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <span className="font-semibold text-foreground">Kỳ hóa đơn đã chốt:</span>
                  <div className="w-[220px]">
                    <Combobox
                      options={historicalPeriods.map(p => ({ value: p, label: p }))}
                      value={selectedHistoricalPeriod}
                      onValueChange={(val) => val && setSelectedHistoricalPeriod(val)}
                      placeholder="Chọn kỳ hóa đơn"
                      searchPlaceholder="Tìm kỳ hóa đơn..."
                      emptyText="Không có dữ liệu"
                    />
                  </div>
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
              <Input type="text" value={billingPeriodName} onChange={(e) => setBillingPeriodName(e.target.value)} placeholder="VD: Tháng 06/2026" />
            </div>
            {stats && (
              <div className="bg-secondary/50 border border-border rounded-lg p-3 text-sm space-y-1">
                <p className="font-semibold text-foreground mb-2">Tóm tắt dự kiến:</p>
                <div className="flex justify-between"><span className="text-muted-foreground">Hóa đơn sẽ tạo:</span><span className="font-bold text-primary">{stats.studentInvoicePreview?.length || 0} hóa đơn</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tổng học phí:</span><span className="font-bold">{formatVND(stats.totalStudentTuition)}</span></div>
                {stats.studentInvoicePreview?.some((s: any) => s.has_zero_fee || s.total_amount === 0) && (
                  <div className="mt-2 flex items-center gap-2 text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{stats.studentInvoicePreview.filter((s: any) => s.total_amount === 0).length} học sinh có phí = 0đ sẽ không được tạo hóa đơn.</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBillingDialogOpen(false)}>Hủy</Button>
            <Button onClick={triggerBillingCron} disabled={generating}>{generating ? 'Đang chạy...' : 'Chốt sổ ngay'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Học phí thu vào</CardTitle>
          </CardHeader>
          <CardContent><h3 className="text-2xl font-bold text-foreground">{formatVND(stats?.totalStudentTuition || 0)}</h3></CardContent>
        </Card>
        <Card className="border-t-4 border-t-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Lương Gia sư</CardTitle>
          </CardHeader>
          <CardContent><h3 className="text-2xl font-bold text-foreground">{formatVND(stats?.totalTutorSalary || 0)}</h3></CardContent>
        </Card>
        <Card className="border-t-4 border-t-emerald-500 bg-emerald-500/10 border-x-0 border-b-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400 uppercase">Doanh thu trung tâm</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">{formatVND(stats?.totalCenterRevenue || 0)}</h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400/80 mt-1">Từ định mức Battle Pass CSAT</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
