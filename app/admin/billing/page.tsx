'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAlert, useConfirm } from '@/components/ui/use-dialog';
import { BillingHeader } from '@/features/billing/components/BillingHeader';
import { BillingControls } from '@/features/billing/components/BillingControls';
import { StudentTuitionTable } from '@/features/billing/components/StudentTuitionTable';
import { TutorSalaryTable } from '@/features/billing/components/TutorSalaryTable';

export default function BillingPage() {
  const [viewMode, setViewMode] = useState<'preview' | 'historical'>('preview');
  const [activeSection, setActiveSection] = useState<'students' | 'tutors'>('students');

  // Preview State
  const defaultStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  // Historical State
  const [historicalPeriods, setHistoricalPeriods] = useState<string[]>([]);
  const [selectedHistoricalPeriod, setSelectedHistoricalPeriod] = useState<string>('');

  // Data State
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Actions State
  const [isBillingDialogOpen, setIsBillingDialogOpen] = useState(false);
  const [billingPeriodName, setBillingPeriodName] = useState('');
  const [generating, setGenerating] = useState(false);

  const supabase = createClient();
  const { alert: showAlert } = useAlert();
  const { confirm } = useConfirm();

  // Load Historical Periods
  useEffect(() => {
    async function loadPeriods() {
      const { data, error } = await supabase
        .from('payments')
        .select('billing_period')
        .not('billing_period', 'is', null);
      if (!error && data) {
        const unique = Array.from(new Set(data.map(d => d.billing_period)));
        setHistoricalPeriods(unique);
        if (unique.length > 0) setSelectedHistoricalPeriod(unique[0]);
      }
    }
    loadPeriods();
  }, [supabase]);

  // Load Data
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      if (viewMode === 'preview') {
        try {
          const res = await fetch(`/api/admin/billing/stats?startDate=${startDate}&endDate=${endDate}`);
          const data = await res.json();
          if (mounted) {
            setStats(data);
            setPayments([]);
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        if (!selectedHistoricalPeriod) {
          if (mounted) { setStats(null); setPayments([]); setLoading(false); }
          return;
        }
        try {
          const [statsRes, payRes] = await Promise.all([
            fetch(`/api/admin/billing/stats?billingPeriod=${encodeURIComponent(selectedHistoricalPeriod)}`),
            supabase
              .from('payments')
              .select('payment_id, student_id, class_id, amount, status, billing_period, students(name), classes(name)')
              .eq('billing_period', selectedHistoricalPeriod)
          ]);
          const statsData = await statsRes.json();
          if (mounted) {
            setStats(statsData);
            setPayments(payRes.data || []);
          }
        } catch (error) {
          console.error(error);
        }
      }
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
        await showAlert({
          title: '⚠️ Cảnh báo học phí = 0đ',
          description: `${data.message}\n\nCác học sinh sau có học phí = 0đ và KHÔNG được tạo hóa đơn:\n${names}\n\nHãy kiểm tra lại điểm danh và mức học phí.`,
          variant: 'warning',
        });
      } else {
        await showAlert({ title: 'Chốt sổ thành công', description: data.message || 'Xong', variant: 'success' });
      }
      
      setHistoricalPeriods(prev => Array.from(new Set([billingPeriodName, ...prev])));
      setSelectedHistoricalPeriod(billingPeriodName);
      setViewMode('historical');
      setIsBillingDialogOpen(false);
    } catch (e: any) {
      await showAlert({ title: 'Lỗi chốt sổ', description: e.message, variant: 'error' });
    }
    setGenerating(false);
  }

  async function handleRollbackBilling() {
    if (!selectedHistoricalPeriod) return;
    const ok = await confirm({
      title: 'Hủy chốt sổ đợt này?',
      description: `Hủy các hóa đơn CHƯA THU của đợt "${selectedHistoricalPeriod}".\n\nCác hóa đơn ĐÃ THU sẽ được GIỮ NGUYÊN. Chỉ hóa đơn chưa thu mới bị xóa.`,
      confirmText: 'Hủy chốt sổ',
      cancelText: 'Không',
      variant: 'destructive',
    });
    if (!ok) return;
    
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/billing/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingPeriod: selectedHistoricalPeriod })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi hệ thống');
      
      await showAlert({ title: 'Hủy chốt sổ thành công', description: data.message, variant: 'success' });
      
      if (data.details?.paid_kept > 0) {
        setPayments([]); setStats(null);
      } else {
        const remaining = historicalPeriods.filter(p => p !== selectedHistoricalPeriod);
        setHistoricalPeriods(remaining);
        setSelectedHistoricalPeriod(remaining[0] || '');
        if (remaining.length === 0) setViewMode('preview');
      }
    } catch (e: any) {
      await showAlert({ title: 'Lỗi', description: e.message, variant: 'error' });
    }
    setGenerating(false);
  }

  return (
    <div className="space-y-6">
      <BillingHeader
        stats={stats}
        viewMode={viewMode}
        setViewMode={setViewMode}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        historicalPeriods={historicalPeriods}
        selectedHistoricalPeriod={selectedHistoricalPeriod}
        setSelectedHistoricalPeriod={setSelectedHistoricalPeriod}
        generating={generating}
        isBillingDialogOpen={isBillingDialogOpen}
        setIsBillingDialogOpen={setIsBillingDialogOpen}
        billingPeriodName={billingPeriodName}
        setBillingPeriodName={setBillingPeriodName}
        triggerBillingCron={triggerBillingCron}
        handleRollbackBilling={handleRollbackBilling}
      />

      <BillingControls
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        viewMode={viewMode}
        stats={stats}
        paymentsLength={payments.length}
      />

      {activeSection === 'students' && (
        <StudentTuitionTable
          stats={stats}
          payments={payments}
          viewMode={viewMode}
          loading={loading}
          selectedHistoricalPeriod={selectedHistoricalPeriod}
          startDate={startDate}
          endDate={endDate}
          ITEMS_PER_PAGE={20}
          handleMarkAsPaid={handleMarkAsPaid}
        />
      )}

      {activeSection === 'tutors' && (
        <TutorSalaryTable
          stats={stats}
          viewMode={viewMode}
          loading={loading}
          selectedHistoricalPeriod={selectedHistoricalPeriod}
          ITEMS_PER_PAGE={20}
        />
      )}
    </div>
  );
}
