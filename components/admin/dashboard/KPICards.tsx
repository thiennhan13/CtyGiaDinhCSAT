'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { BookOpen, ChevronRight, AlertTriangle } from 'lucide-react';
import { formatVND } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardKpis {
  totalRevenue: number;
  activeClassCount: number;
  unpaidCount: number;
  expiringClasses: any[];
}

interface KPICardsProps {
  kpis: DashboardKpis;
}

// KPICardWrapper implements the Neo-Brutalism style using utility classes
function KPICardWrapper({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border-2 border-foreground rounded-2xl overflow-hidden flex flex-col transition-all",
        "shadow-neo md:shadow-neo-md hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-neo-hover md:hover:shadow-neo-md-hover",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function KPICards({ kpis }: KPICardsProps) {
  const { totalRevenue, activeClassCount, unpaidCount, expiringClasses } = kpis;
  const [showExpiringModal, setShowExpiringModal] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        {/* Doanh thu */}
        <KPICardWrapper>
          <div className="p-4 md:p-5 flex-1">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Doanh thu ({format(new Date(), 'MM/yyyy')})
            </p>
            <h3 className="text-xl font-extrabold text-foreground leading-tight">
              {formatVND(totalRevenue)}
            </h3>
          </div>
          <div className="h-1 shrink-0 bg-primary" />
        </KPICardWrapper>

        {/* Lớp hoạt động */}
        <KPICardWrapper>
          <div className="p-4 md:p-5 flex-1">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
              <BookOpen className="w-4 h-4 text-green-600 dark:text-green-500" />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Lớp đang hoạt động
            </p>
            <h3 className="text-2xl font-black text-green-600 dark:text-green-500 leading-tight">
              {activeClassCount}
            </h3>
          </div>
          <div className="h-1 shrink-0 bg-green-600 dark:bg-green-500" />
        </KPICardWrapper>

        {/* Hóa đơn chưa thu */}
        <KPICardWrapper className={unpaidCount > 0 ? 'border-destructive' : ''}>
          <div className="p-4 md:p-5 flex-1">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${unpaidCount > 0 ? 'bg-destructive/10' : 'bg-secondary'}`}>
              <svg className={`w-4 h-4 ${unpaidCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Hóa đơn chưa thu
            </p>
            <h3 className={`text-2xl font-black leading-tight ${unpaidCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {unpaidCount}
            </h3>
            {unpaidCount > 0 && (
              <Link
                href="/admin/billing"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive mt-1 hover:underline"
              >
                → Xem ngay
              </Link>
            )}
          </div>
          <div className={`h-1 shrink-0 ${unpaidCount > 0 ? 'bg-destructive' : 'bg-border'}`} />
        </KPICardWrapper>

        {/* Lớp sắp hết hạn */}
        <KPICardWrapper
          onClick={() => expiringClasses.length > 0 && setShowExpiringModal(true)}
          className={expiringClasses.length > 0 ? 'border-destructive' : ''}
        >
          <div className="p-4 md:p-5 flex-1">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${expiringClasses.length > 0 ? 'bg-destructive/10' : 'bg-secondary'}`}>
              <AlertTriangle className={`w-4 h-4 ${expiringClasses.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Lớp sắp hết hạn (≤14 ngày)
            </p>
            <h3 className={`text-2xl font-black leading-tight ${expiringClasses.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {expiringClasses.length}
            </h3>
            {expiringClasses.length > 0 && (
              <p className="flex items-center gap-1 text-[11px] font-bold text-destructive mt-1">
                <ChevronRight className="w-3 h-3" /> Nhấn để xem chi tiết
              </p>
            )}
          </div>
          <div className={`h-1 shrink-0 ${expiringClasses.length > 0 ? 'bg-destructive' : 'bg-border'}`} />
        </KPICardWrapper>
      </div>

      {/* ── Dialog: Lớp sắp hết hạn ── */}
      <Dialog open={showExpiringModal} onOpenChange={setShowExpiringModal}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Danh Sách Lớp Sắp Hết Hạn (≤ 14 ngày)
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2">
            {expiringClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">Hiện không có lớp nào sắp hết hạn.</p>
            ) : (
              expiringClasses.map((c: any) => (
                <div
                  key={c.class_id}
                  className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 dark:bg-destructive/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-semibold text-foreground text-sm">{c.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Gia sư: <span className="font-semibold text-foreground">{c.tutors?.name || 'Chưa phân công'}</span>
                    </p>
                    <p className="text-xs text-destructive font-semibold mt-1">
                      Ngày kết thúc: {c.end_date}
                    </p>
                  </div>
                  <Link
                    href={`/admin/classes/${c.class_id}`}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-card border border-destructive/30 text-destructive hover:bg-destructive hover:text-white text-xs font-semibold transition-colors shrink-0 shadow-sm"
                    onClick={() => setShowExpiringModal(false)}
                  >
                    Xem / Gia hạn <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExpiringModal(false)}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
