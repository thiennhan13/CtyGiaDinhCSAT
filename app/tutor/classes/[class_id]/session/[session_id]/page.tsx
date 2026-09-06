'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { useAlert, useConfirm } from '@/components/ui/use-dialog';
import { buildAttendanceForm, buildAttendancePayload, type AttendanceForm, type AttendanceStudent } from '@/lib/attendance-form';

export default function SessionAttendancePage() {
  const params = useParams() as { class_id: string, session_id: string };
  const classId = params.class_id;
  const sessionId = params.session_id;

  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceForm>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const isSubmittingRef = useRef(false);
  const loadSequence = useRef(0);
  const [loadError, setLoadError] = useState('');
  
  const router = useRouter();
  const supabase = createClient();
  const { alert: showAlert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();

  async function fetchData() {
    const sequence = ++loadSequence.current;
    setLoading(true); setLoadError(''); setSessionData(null); setStudents([]); setAttendance({});
    try {
      const [sessionResult, rosterResult, attendanceResult] = await Promise.all([
        supabase.from('sessions').select('*, classes(name)').eq('session_id', sessionId).eq('class_id', classId).single(),
        supabase.from('class_students').select('student_id, students(student_id, name)').eq('class_id', classId).eq('status', 'active'),
        supabase.from('session_attendance').select('student_id, status, notes, students(student_id, name)').eq('session_id', sessionId),
      ]);
      if (sequence !== loadSequence.current) return;
      if (sessionResult.error || !sessionResult.data) throw new Error('Không tải được buổi học hoặc bạn không có quyền truy cập.');
      if (rosterResult.error || attendanceResult.error || !rosterResult.data || !attendanceResult.data)
        throw new Error('Chưa tải đủ danh sách và điểm danh đã lưu. Vui lòng thử lại.');
      const form = buildAttendanceForm(rosterResult.data, attendanceResult.data);
      setSessionData(sessionResult.data); setStudents(form.students); setAttendance(form.attendance);
    } catch (error) {
      if (sequence === loadSequence.current) setLoadError(error instanceof Error ? error.message : 'Không tải được dữ liệu điểm danh.');
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }

  useEffect(() => {
    void fetchData();
    return () => { loadSequence.current++; };
  }, [classId, sessionId]);

  function handleStatusToggle(studentId: string, status: 'attended' | 'absent') {
    setAttendance(prev => ({ ...prev, [studentId]: { notes: prev[studentId]?.notes || '', status } }));
  }

  function handleNotesChange(studentId: string, notes: string) {
    setAttendance(prev => ({ ...prev, [studentId]: { status: prev[studentId]?.status ?? null, notes } }));
  }

  async function handleSave() {
    if (isSubmittingRef.current || loading || loadError || !sessionData) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const attData = buildAttendancePayload(sessionId, students, attendance);
      const res = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, attendanceData: attData }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Chưa lưu được điểm danh. Vui lòng thử lại.');
      }
      await showAlert({ title: 'Thành công!', description: 'Đã lưu các học sinh có trạng thái được chọn. Học sinh chưa điểm danh được giữ nguyên.', variant: 'success' });
      router.push('/tutor/dashboard');
    } catch (error) {
      await showAlert({ title: 'Lỗi', description: error instanceof Error ? error.message : 'Chưa lưu được điểm danh.', variant: 'error' });
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleCancelSession() {
    if (isSubmittingRef.current || loading || loadError || !sessionData) return;
    const ok = await confirm({
      title: 'Hủy buổi học này?', description: 'Buổi học sẽ được đánh dấu đã hủy và không được tính học phí.',
      confirmText: 'Hủy buổi học', variant: 'destructive',
    });
    if (!ok || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('sessions').update({ status: 'cancelled' }).eq('session_id', sessionId);
      if (error) throw error;
      await showAlert({ title: 'Thành công', description: 'Đã hủy buổi học.', variant: 'success' });
      router.push('/tutor/dashboard');
    } catch (error) {
      await showAlert({ title: 'Lỗi khi hủy buổi học', description: error instanceof Error ? error.message : 'Chưa hủy được buổi học.', variant: 'error' });
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (sessionData?.status === 'cancelled') {
    return (
      <div className="space-y-6">
        <AlertDialog />
        <ConfirmDialog />
        <div className="flex justify-between items-center">
          <div>
             <h2 className="text-2xl font-bold tracking-tight text-foreground">Điểm Danh: {sessionData?.classes?.name}</h2>
             <p className="text-muted-foreground">{sessionData?.date}</p>
          </div>
          <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
        </div>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="py-12 flex flex-col items-center justify-center text-destructive">
            <h3 className="text-xl font-bold mb-2">Buổi học này đã bị hủy</h3>
            <p>Học sinh được nghỉ và sẽ không tính học phí cho buổi này.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AlertDialog />
      <ConfirmDialog />
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold tracking-tight text-foreground">Điểm Danh: {sessionData?.classes?.name}</h2>
           <p className="text-muted-foreground">{sessionData?.date}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Học Sinh</CardTitle>
          <CardDescription>Chọn &quot;Có mặt&quot; hoặc &quot;Vắng mặt&quot; cho học sinh cần lưu. Học sinh chưa có trạng thái sẽ không được ghi điểm danh hoặc tính học phí trong lần lưu này.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p role="status" className="text-muted-foreground">Đang tải...</p> : loadError ? (
            <div className="space-y-3"><p role="alert" className="text-destructive">{loadError}</p>
              <Button variant="outline" onClick={() => void fetchData()}>Thử tải lại</Button></div>
          ) : (
            <fieldset disabled={submitting} className="space-y-4 min-w-0">
               {students.map(s => {
                 const currentStatus = attendance[s.student_id]?.status;
                 return (
                   <div key={s.student_id} role="group" aria-label={s.name} className="p-4 border border-border rounded-lg bg-secondary/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="font-medium text-lg min-w-0 text-foreground">{s.name}
                        {!currentStatus && <p className="text-sm text-muted-foreground font-normal">Chưa điểm danh</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          aria-pressed={currentStatus === 'attended'}
                          variant={currentStatus === 'attended' ? 'default' : 'outline'}
                          className={currentStatus === 'attended' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                          onClick={() => handleStatusToggle(s.student_id, 'attended')}
                        >Có mặt</Button>
                        <Button 
                          type="button"
                          aria-pressed={currentStatus === 'absent'}
                          variant={currentStatus === 'absent' ? 'default' : 'outline'}
                          className={currentStatus === 'absent' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}
                          onClick={() => handleStatusToggle(s.student_id, 'absent')}
                        >Vắng mặt</Button>
                      </div>
                      <Input 
                        aria-label={"Ghi chú của " + s.name}
                        placeholder="Ghi chú (Tùy chọn)" 
                        className="max-w-xs"
                        value={attendance[s.student_id]?.notes || ''}
                        onChange={(e) => handleNotesChange(s.student_id, e.target.value)} 
                      />
                   </div>
                 );
               })}

               <div className="pt-6 border-t mt-4 flex flex-col sm:flex-row gap-4">
                 <Button onClick={handleSave} disabled={submitting || students.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                   {submitting ? 'Đang lưu...' : 'Lưu điểm danh'}
                 </Button>
                 <Button onClick={handleCancelSession} disabled={submitting} variant="destructive" className="h-12 px-8">
                   Hủy buổi học
                 </Button>
               </div>
            </fieldset>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
