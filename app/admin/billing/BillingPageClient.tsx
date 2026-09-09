'use client';
import { useEffect, useState } from 'react';
import type { CalendarRange } from '@/lib/calendar';
import { createClient } from '@/lib/supabase/client';
import { postBusiness } from '@/lib/business-client';
import type { billingPresentation, BillingPayment } from '@/lib/billing-report';
import { useAlert, useConfirm } from '@/components/ui/use-dialog';
import { BillingHeader } from '@/features/billing/components/BillingHeader';
import { BillingControls } from '@/features/billing/components/BillingControls';
import { StudentTuitionTable } from '@/features/billing/components/StudentTuitionTable';
import { TutorSalaryTable } from '@/features/billing/components/TutorSalaryTable';
import { BillingLedgerTools } from '@/features/billing/components/BillingLedgerTools';
type Stats = ReturnType<typeof billingPresentation>;
export default function BillingPageClient({ initialRange }: { initialRange: CalendarRange }) {
  const [viewMode,setViewMode]=useState<'preview'|'historical'>('preview');
  const [activeSection,setActiveSection]=useState<'students'|'tutors'>('students');
  const [startDate,setStartDate]=useState(initialRange.startDate),[endDate,setEndDate]=useState(initialRange.endDate);
  const [historicalPeriods,setHistoricalPeriods]=useState<string[]>([]),[selectedHistoricalPeriod,setSelectedHistoricalPeriod]=useState('');
  const [stats,setStats]=useState<Stats|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const [generating,setGenerating]=useState(false),[isBillingDialogOpen,setIsBillingDialogOpen]=useState(false);
  const [billingPeriodName,setBillingPeriodName]=useState(''),[revision,setRevision]=useState(0);
  const {alert:showAlert,AlertDialog}=useAlert(),{confirm,ConfirmDialog}=useConfirm();
  const payments=stats?.payments??[];
  useEffect(()=>{
    let active=true;
    createClient().rpc('get_unique_billing_periods').then(({data,error})=>{
      if(!active)return;
      if(error){setLoadError(error.message);return;}
      const periods=(data??[]).map((p:{billing_period:string})=>p.billing_period);
      setHistoricalPeriods(periods);setSelectedHistoricalPeriod(old=>old||periods[0]||'');
    });
    return()=>{active=false;};
  },[revision]);
  useEffect(()=>{
    let active=true;setLoading(true);setLoadError('');setStats(null);
    if(viewMode==='historical'&&!selectedHistoricalPeriod){setLoading(false);return;}
    const params=viewMode==='preview'?new URLSearchParams({startDate,endDate}):new URLSearchParams({billingPeriod:selectedHistoricalPeriod});
    fetch('/api/admin/billing/stats?'+params).then(async response=>{
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(active)setStats(data);
    }).catch(error=>{if(active)setLoadError(error.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[viewMode,startDate,endDate,selectedHistoricalPeriod,revision]);
  async function handleMarkAsPaid(id:string){
    const payment=payments.find(p=>p.payment_id===id);if(!payment||payment.balance===0)return;
    const refund=payment.balance<0;
    if(!await confirm({title:refund?'Xác nhận đã hoàn tiền?':'Xác nhận đã thu tiền?',description:'Số tiền: '+Math.abs(payment.balance).toLocaleString('vi-VN')+' đồng. Chỉ xác nhận sau khi đã thực hiện giao dịch.',confirmText:'Xác nhận'}))return;
    try{await postBusiness('/api/admin/billing/payments',{paymentId:id,expectedBalance:payment.balance,reason:refund?'Ghi nhận hoàn tiền':'Ghi nhận thu học phí'});setRevision(r=>r+1);}
    catch(error){await showAlert({title:'Không ghi nhận được giao dịch',description:(error as Error).message,variant:'error'});}
  }
  async function triggerBillingCron(){
    if(generating||loading||!stats||!billingPeriodName.trim())return;
    if(stats.zeroFeeAttendanceIds.length && !await confirm({title:'Xác nhận học phí 0 đồng',description:'Có '+stats.zeroFeeAttendanceIds.length+' lượt có mặt với học phí 0 đồng. Xác nhận đây là các lượt được miễn học phí trước khi chốt.',confirmText:'Xác nhận miễn học phí'}))return;
    setGenerating(true);
    try{
      const result=await postBusiness<{message:string;period_id?:string}>('/api/admin/billing/generate',{
        startDate,endDate,billingPeriod:billingPeriodName.trim(),previewToken:stats.previewToken,zeroFeeAttendanceIds:stats.zeroFeeAttendanceIds});
      await showAlert({title:'Kết quả chốt sổ',description:result.message,variant:'success'});
      if(result.period_id){setSelectedHistoricalPeriod(billingPeriodName.trim());setViewMode('historical');}
      setIsBillingDialogOpen(false);setRevision(r=>r+1);
    }catch(error){await showAlert({title:'Chưa chốt sổ',description:(error as Error).message,variant:'error'});setRevision(r=>r+1);}
    finally{setGenerating(false);}
  }
  return <div className="space-y-6">
    <AlertDialog/><ConfirmDialog/>
    {loadError&&<p role="alert" className="rounded border border-destructive p-3 text-destructive">{loadError}</p>}
    <BillingHeader stats={stats} viewMode={viewMode} setViewMode={setViewMode} startDate={startDate} setStartDate={setStartDate}
      endDate={endDate} setEndDate={setEndDate} historicalPeriods={historicalPeriods} selectedHistoricalPeriod={selectedHistoricalPeriod}
      setSelectedHistoricalPeriod={setSelectedHistoricalPeriod} generating={generating||loading||!!loadError} isBillingDialogOpen={isBillingDialogOpen}
      setIsBillingDialogOpen={setIsBillingDialogOpen} billingPeriodName={billingPeriodName} setBillingPeriodName={setBillingPeriodName} triggerBillingCron={triggerBillingCron}/>
    {stats?.period?.source==='legacy'&&<p className="rounded border p-3 text-sm text-muted-foreground">Kỳ cũ được giữ nguyên. Học phí trên chứng từ: {stats.originalInvoiceTotal?.toLocaleString('vi-VN')} đồng; đối chiếu từ điểm danh hiện có: {stats.snapshotTuitionTotal.toLocaleString('vi-VN')} đồng. Sai lệch cần đối soát riêng.</p>}
    <BillingControls activeSection={activeSection} setActiveSection={setActiveSection} viewMode={viewMode} stats={stats} paymentsLength={payments.length}/>
    {activeSection==='students'?<StudentTuitionTable stats={stats} payments={payments} viewMode={viewMode} loading={loading}
      selectedHistoricalPeriod={selectedHistoricalPeriod} startDate={startDate} endDate={endDate} ITEMS_PER_PAGE={20} handleMarkAsPaid={handleMarkAsPaid}/>
      :<TutorSalaryTable stats={stats} viewMode={viewMode} loading={loading} selectedHistoricalPeriod={selectedHistoricalPeriod} ITEMS_PER_PAGE={20}/>}
    {viewMode==='historical'&&stats&&<BillingLedgerTools key={selectedHistoricalPeriod} report={stats} payments={payments as BillingPayment[]} onUpdated={()=>setRevision(r=>r+1)}/>}
  </div>;
}
