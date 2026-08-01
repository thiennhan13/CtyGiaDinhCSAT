'use client';

import { Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BillingControlsProps {
  activeSection: 'students' | 'tutors';
  setActiveSection: (v: 'students' | 'tutors') => void;
  viewMode: 'preview' | 'historical';
  stats: any;
  paymentsLength: number;
}

export function BillingControls({
  activeSection,
  setActiveSection,
  viewMode,
  stats,
  paymentsLength,
}: BillingControlsProps) {
  const studentsBadgeCount = viewMode === 'preview' ? (stats?.studentInvoicePreview?.length || 0) : paymentsLength;
  const tutorsBadgeCount = (stats?.tutorSalaryDetail ?? stats?.tutorSalaries ?? []).length;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-secondary p-2 rounded-xl border border-border shadow-inner">
      <button
        type="button"
        onClick={() => setActiveSection('students')}
        className={`flex-1 flex items-center justify-between px-5 py-3.5 rounded-lg transition-all cursor-pointer ${
          activeSection === 'students'
            ? 'bg-card text-primary shadow-md ring-1 ring-blue-500/20 font-bold'
            : 'text-muted-foreground hover:text-foreground hover:bg-border/70 font-medium'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${activeSection === 'students' ? 'bg-blue-100 text-primary' : 'bg-border text-muted-foreground'}`}>
            <Users className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-base">Phần 1: {viewMode === 'preview' ? 'Dự Kiến Hóa Đơn Học Sinh' : 'Hóa Đơn Học Sinh (Đã chốt)'}</div>
            <div className="text-xs font-normal opacity-75">{viewMode === 'preview' ? 'Tổng hợp từ buổi học chưa chốt sổ' : 'Các hóa đơn đã phát hành'}</div>
          </div>
        </div>
        <Badge className={`ml-2 px-2.5 py-0.5 text-xs font-bold ${activeSection === 'students' ? 'bg-blue-600 text-white' : 'bg-slate-300 text-foreground'}`}>
          {studentsBadgeCount}
        </Badge>
      </button>

      <button
        type="button"
        onClick={() => setActiveSection('tutors')}
        className={`flex-1 flex items-center justify-between px-5 py-3.5 rounded-lg transition-all cursor-pointer ${
          activeSection === 'tutors'
            ? 'bg-card text-amber-700 shadow-md ring-1 ring-amber-500/20 font-bold'
            : 'text-muted-foreground hover:text-foreground hover:bg-border/70 font-medium'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${activeSection === 'tutors' ? 'bg-amber-100 text-amber-600' : 'bg-border text-muted-foreground'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="text-base">Phần 2: Lương Gia Sư</div>
            <div className="text-xs font-normal opacity-75">{viewMode === 'preview' ? 'Dự kiến theo từng lớp & buổi dạy' : 'Chi phí trả gia sư thực tế'}</div>
          </div>
        </div>
        <Badge className={`ml-2 px-2.5 py-0.5 text-xs font-bold ${activeSection === 'tutors' ? 'bg-amber-600 text-white' : 'bg-slate-300 text-foreground'}`}>
          {tutorsBadgeCount}
        </Badge>
      </button>
    </div>
  );
}
