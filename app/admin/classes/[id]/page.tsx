'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Trash2, AlertTriangle, History, FileSpreadsheet, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { formatVND } from '@/lib/format';
import { Combobox } from '@/components/ui/combobox';
import { useAlert, useConfirm } from '@/components/ui/use-dialog';



const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ClassDetailPage() {
  const params = useParams() as { id: string };
  const classId = params.id;

  const [classInfo, setClassInfo] = useState<any>(null);
  const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allTutors, setAllTutors] = useState<any[]>([]);
  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // assign student form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [tuitionFee, setTuitionFee] = useState('100000');
  
  // session form
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');

  // bulk delete state
  const [bulkDeleteSession, setBulkDeleteSession] = useState<any>(null);
  const [bulkDelStart, setBulkDelStart] = useState('');
  const [bulkDelEnd, setBulkDelEnd] = useState('');

  // schedule manage state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');
  const [scheduleConfigs, setScheduleConfigs] = useState([{ id: Date.now(), dayOfWeek: 1, start_time: '18:00', end_time: '20:00' }]);

  // edit session state
  const [isEditSessionOpen, setIsEditSessionOpen] = useState(false);
  const [editSessionData, setEditSessionData] = useState({ session_id: '', date: '', start_time: '', end_time: '' });

  const [studentStatusFilter, setStudentStatusFilter] = useState('active');

  // Change tutor state
  const [isChangeTutorOpen, setIsChangeTutorOpen] = useState(false);
  const [newTutorId, setNewTutorId] = useState('');
  const [changeTutorDate, setChangeTutorDate] = useState(todayStr());
  const [changeTutorNotes, setChangeTutorNotes] = useState('');
  const [changeTutorLoading, setChangeTutorLoading] = useState(false);

  // Update CSAT fee state
  const [isUpdateCsatOpen, setIsUpdateCsatOpen] = useState(false);
  const [newCsatFee, setNewCsatFee] = useState('');
  const [csatEffectiveDate, setCsatEffectiveDate] = useState(todayStr());
  const [csatNotes, setCsatNotes] = useState('');
  const [csatLoading, setCsatLoading] = useState(false);

  // Update Student fee state
  const [isUpdateFeeOpen, setIsUpdateFeeOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [newStudentFee, setNewStudentFee] = useState('');
  const [updateFeeLoading, setUpdateFeeLoading] = useState(false);

  // Rename class state
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  const supabase = createClient();
  const { alert: showAlert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();

  async function fetchData() {
    setLoading(true);
    const { data: cls } = await supabase.from('classes').select('*, tutors(name)').eq('class_id', classId).single();
    if (cls) {
      setClassInfo(cls);
      setNewCsatFee(String(cls.csat_fee_per_session || 0));
    }

    const { data: classStds } = await supabase.from('class_students').select('*, students(name)').eq('class_id', classId);
    if (classStds) setStudentsInClass(classStds);

    const { data: stds } = await supabase.from('students').select('*').neq('is_deleted', true);
    if (stds) setAllStudents(stds);

    const { data: tutors } = await supabase.from('tutors').select('tutor_id, name').eq('status', 'active').neq('is_deleted', true);
    if (tutors) setAllTutors(tutors);

    const { data: sessions } = await supabase.from('sessions').select('*').eq('class_id', classId).order('date', { ascending: false });
    if (sessions) setClassSessions(sessions);

    const { data: logs } = await supabase
      .from('class_change_log')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (logs) setChangeLogs(logs);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function handleAssignStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudentId) return;

    const fee = parseFloat(tuitionFee) || 0;
    const { error } = await supabase.from('class_students').upsert([
       { class_id: classId, student_id: selectedStudentId, tuition_fee_per_session: fee, status: 'active' }
    ], { onConflict: 'class_id, student_id' });
    if (!error) {
       setSelectedStudentId('');
       setTuitionFee('100000');
       fetchData();
    } else {
       await showAlert({ title: 'Lỗi', description: error.message, variant: 'error' });
    }
  }

  async function handleRemoveStudent(studentId: string) {
    const ok = await confirm({
      title: 'Dừng học sinh này?',
      description: 'Học sinh sẽ được chuyển sang trạng thái Đã nghỉ. Học sinh sẽ không bị xóa khỏi hệ thống, nhưng sẽ không được điểm danh và không bị tính học phí.',
      confirmText: 'Dừng học',
      variant: 'destructive',
    });
    if (!ok) return;
    const { error } = await supabase.from('class_students').update({ status: 'dropped' }).eq('class_id', classId).eq('student_id', studentId);
    if (!error) {
      await showAlert({ title: 'Thành công', description: 'Đã cập nhật trạng thái học sinh thành Đã nghỉ.', variant: 'success' });
      fetchData();
    } else {
      await showAlert({ title: 'Lỗi', description: error.message, variant: 'error' });
    }
  }

  async function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionDate || !startTime || !endTime) return;

    const { error } = await supabase.from('sessions').insert([
       { 
         class_id: classId, 
         date: sessionDate, 
         start_time: startTime, 
         end_time: endTime,
         csat_fee_snapshot: classInfo?.csat_fee_per_session || 0,
         tutor_id_snapshot: classInfo?.tutor_id || null, // Fix Bug #1: chốt gia sư tại thời điểm tạo buổi
       }
    ]);
    
    if (!error) {
       await showAlert({ title: 'Tạo buổi học thành công', description: 'Buổi học đã được thêm vào lịch.', variant: 'success' });
       setSessionDate('');
       fetchData();
    } else {
       await showAlert({ title: 'Lỗi', description: error.message, variant: 'error' });
    }
  }

  async function handleCancelSession(sessionId: string) {
    const ok = await confirm({ title: 'Hủy buổi học này?', description: 'Buổi học sẽ được đánh dấu Đã Hủy.', confirmText: 'Hủy buổi', variant: 'destructive' });
    if (!ok) return;
    const { error } = await supabase.from('sessions').update({ status: 'cancelled' }).eq('session_id', sessionId);
    if (!error) {
       await showAlert({ title: 'Đã hủy buổi học', description: '', variant: 'success' });
       fetchData();
    }
  }

  const openBulkDelete = (s: any) => {
    setBulkDeleteSession(s);
    setBulkDelStart(s.date);
    setBulkDelEnd(s.date);
  };

  const handleMassUpdate = async (action: 'cancel' | 'delete') => {
    if(!bulkDelStart || !bulkDelEnd || !bulkDeleteSession) return;
    
    const parseLocalDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    };

    const dDate = parseLocalDate(bulkDeleteSession.date);
    const dayOfWeek = dDate.getDay();

    const { data: toUpdate } = await supabase.from('sessions')
      .select('session_id, date')
      .eq('class_id', classId)
      .eq('start_time', bulkDeleteSession.start_time)
      .eq('end_time', bulkDeleteSession.end_time)
      .gte('date', bulkDelStart)
      .lte('date', bulkDelEnd)
      .eq('status', 'scheduled');

    if(!toUpdate || toUpdate.length === 0) {
      await showAlert({ title: 'Không tìm thấy buổi học', description: 'Không tìm thấy buổi học nào phù hợp.', variant: 'warning' });
      return;
    }
    
    const filteredToUpdate = toUpdate.filter(s => parseLocalDate(s.date).getDay() === dayOfWeek);

    if(filteredToUpdate.length === 0) {
       await showAlert({ title: 'Không tìm thấy buổi học', description: 'Không tìm thấy buổi học nào phù hợp.', variant: 'warning' });
       return;
    }

    const actionText = action === 'cancel' ? 'BÁO NGHỈ LỄ (Hủy)' : 'XÓA VĨNH VIỄN';
    const ok = await confirm({
      title: `${actionText} ${filteredToUpdate.length} buổi học?`,
      description: `Tìm thấy ${filteredToUpdate.length} buổi học. Bạn có chắc muốn ${actionText} tất cả?`,
      confirmText: actionText,
      variant: 'destructive',
    });
    if (!ok) return;

    const sessionIds = filteredToUpdate.map(s => s.session_id);
    
    if (action === 'cancel') {
       await supabase.from('sessions').update({ status: 'cancelled' }).in('session_id', sessionIds);
       await showAlert({ title: 'Thành công', description: 'Đã cập nhật trạng thái các buổi học thành Đã Hủy (Nghỉ Lễ).', variant: 'success' });
    } else {
       await supabase.from('sessions').delete().in('session_id', sessionIds);
       await showAlert({ title: 'Thành công', description: 'Đã xóa vĩnh viễn các buổi học.', variant: 'success' });
    }
    
    setBulkDeleteSession(null);
    fetchData();
  };

  const handleManageSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!scheduleStart || !scheduleEnd || scheduleConfigs.length === 0) return;
    
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend',
          class_id: classId,
          start_date: scheduleStart,
          end_date: scheduleEnd,
          schedule_configs: scheduleConfigs.map(c => ({
            dayOfWeek: Number(c.dayOfWeek),
            start_time: c.start_time,
            end_time: c.end_time
          }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await showAlert({ title: 'Thành công', description: data.message, variant: 'success' });
      setIsScheduleOpen(false);
      fetchData();
    } catch(err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    }
  };

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit_session', ...editSessionData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await showAlert({ title: 'Thành công', description: data.message, variant: 'success' });
      setIsEditSessionOpen(false);
      fetchData();
    } catch(err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    }
  };

  const handleChangeTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTutorId) return;
    const newTutorName = allTutors.find(t => t.tutor_id === newTutorId)?.name || '';
    const ok = await confirm({
      title: `Đổi sang gia sư "${newTutorName}"?`,
      description: `Thông tin thay đổi sẽ có hiệu lực từ ${changeTutorDate} và được ghi lại vào lịch sử.`,
      confirmText: 'Xác nhận',
    });
    if (!ok) return;
    setChangeTutorLoading(true);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_tutor',
          class_id: classId,
          new_tutor_id: newTutorId,
          effective_date: changeTutorDate,
          notes: changeTutorNotes || undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await showAlert({ title: 'Thành công', description: data.message, variant: 'success' });
      setIsChangeTutorOpen(false);
      setNewTutorId('');
      setChangeTutorNotes('');
      setChangeTutorDate(todayStr());
      fetchData();
    } catch(err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    } finally {
      setChangeTutorLoading(false);
    }
  };

  const handleUpdateCsatFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = parseFloat(newCsatFee);
    if (isNaN(fee) || fee < 0) { await showAlert({ title: 'Giá trị không hợp lệ', description: 'Phí CSAT không hợp lệ.', variant: 'warning' }); return; }
    const ok = await confirm({
      title: `Cập nhật phí CSAT sang ${formatVND(fee)}?`,
      description: `Hiệu lực từ ${csatEffectiveDate}. Hệ thống sẽ tự động cập nhật snapshot phí cho tất cả các buổi chưa dạy từ ngày này. Các buổi đã dạy sẽ KHÔNG bị thay đổi.`,
      confirmText: 'Xác nhận',
    });
    if (!ok) return;
    setCsatLoading(true);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_csat_fee',
          class_id: classId,
          new_csat_fee: fee,
          effective_date: csatEffectiveDate,
          notes: csatNotes || undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await showAlert({ title: 'Cập nhật thành công', description: data.message, variant: 'success' });
      setIsUpdateCsatOpen(false);
      setCsatNotes('');
      setCsatEffectiveDate(todayStr());
      fetchData();
    } catch(err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    } finally {
      setCsatLoading(false);
    }
  };

  const addScheduleConfig = () => {
    setScheduleConfigs([...scheduleConfigs, { id: Date.now(), dayOfWeek: 1, start_time: '18:00', end_time: '20:00' }]);
  };
  const removeScheduleConfig = (id: number) => {
    setScheduleConfigs(scheduleConfigs.filter(c => c.id !== id));
  };
  const updateScheduleConfig = (id: number, field: string, value: any) => {
    setScheduleConfigs(scheduleConfigs.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleUpdateStudentFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = parseFloat(newStudentFee);
    if (isNaN(fee) || fee < 0) { await showAlert({ title: 'Giá trị không hợp lệ', description: 'Học phí không hợp lệ.', variant: 'warning' }); return; }
    const ok = await confirm({
      title: `Cập nhật học phí cho ${editingStudent?.students?.name}?`,
      description: `Sang ${formatVND(fee)}. Chỉ các buổi điểm danh kể từ bây giờ mới áp dụng mức phí mới.`,
      confirmText: 'Xác nhận',
    });
    if (!ok) return;
    
    setUpdateFeeLoading(true);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_student_fee',
          class_id: classId,
          student_id: editingStudent.student_id,
          new_fee: fee,
          student_name: editingStudent.students?.name
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await showAlert({ title: 'Cập nhật thành công', description: data.message, variant: 'success' });
      setIsUpdateFeeOpen(false);
      fetchData();
    } catch(err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    } finally {
      setUpdateFeeLoading(false);
    }
  };

  const handleExportReport = () => {
    if (!classInfo) return;
    const wb = XLSX.utils.book_new();
    
    const wsStudents = XLSX.utils.json_to_sheet(studentsInClass.map(cs => ({
      'Mã HS': cs.student_id.split('-')[0],
      'Tên Học Sinh': cs.students?.name,
      'Học Phí / Buổi': cs.tuition_fee_per_session,
      'Trạng Thái': cs.status === 'active' ? 'Đang học' : 'Đã nghỉ'
    })));
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Danh sách học sinh');
    
    const wsSessions = XLSX.utils.json_to_sheet(classSessions.map(s => ({
      'Ngày dạy': s.date,
      'Giờ học': `${s.start_time?.substring(0,5)} - ${s.end_time?.substring(0,5)}`,
      'Gia sư': s.tutor_id_snapshot || classInfo?.tutors?.name,
      'Phí CSAT': s.csat_fee_snapshot || classInfo?.csat_fee_per_session,
      'Trạng thái': s.status === 'completed' ? 'Đã dạy' : s.status === 'cancelled' ? 'Đã hủy' : 'Sắp diễn ra'
    })));
    XLSX.utils.book_append_sheet(wb, wsSessions, 'Lịch sử buổi học');
    
    XLSX.writeFile(wb, `Bao_cao_lop_${classInfo.name}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  async function handleRenameClass() {
    if (!newClassName.trim() || newClassName.trim().length < 2) {
      await showAlert({ title: 'Tên lớp không hợp lệ', description: 'Tên lớp phải có ít nhất 2 ký tự.', variant: 'warning' });
      return;
    }
    setRenameLoading(true);
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename_class', class_id: classId, new_name: newClassName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await showAlert({ title: 'Đổi tên thành công', description: data.message, variant: 'success' });
      setIsRenameOpen(false);
      fetchData();
    } catch (err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    } finally {
      setRenameLoading(false);
    }
  }

  if (loading) return <div className="p-4 text-center text-muted-foreground">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <AlertDialog />
      <ConfirmDialog />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              {classInfo?.name}
            </h2>
            <button
              type="button"
              onClick={() => { setNewClassName(classInfo?.name || ''); setIsRenameOpen(true); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary border border-border hover:border-primary/40 rounded-md px-2 py-1 transition-colors"
              title="Đổi tên lớp"
            >
              <Edit className="w-3 h-3" /> Đổi tên
            </button>
          </div>
          <p className="text-muted-foreground mt-1">
            Gia sư phụ trách: <span className="font-semibold text-foreground">{classInfo?.tutors?.name}</span>
            <span className="mx-2 text-border">|</span>
            Battle Pass CSAT/buổi: <span className="font-semibold text-foreground">{formatVND(classInfo?.csat_fee_per_session || 0)}</span>
          </p>
        </div>
        <Button variant="outline" onClick={handleExportReport} className="gap-2 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Xuất Báo Cáo
        </Button>
      </div>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Đổi Tên Lớp</DialogTitle>
            <DialogDescription>
              Tên lớp hiện tại: <strong>{classInfo?.name}</strong>.
              Thay đổi sẽ có hiệu lực ngay và được ghi lại vào lịch sử điều chỉnh.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tên lớp mới</label>
              <Input
                value={newClassName}
                onChange={e => setNewClassName(e.target.value)}
                placeholder="Nhập tên lớp mới..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && !renameLoading && handleRenameClass()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)} disabled={renameLoading}>Hủy</Button>
            <Button onClick={handleRenameClass} disabled={renameLoading || !newClassName.trim()}>
              {renameLoading ? 'Đang lưu...' : 'Xác nhận đổi tên'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-t-4 border-t-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Điều Chỉnh Lớp Học
          </CardTitle>
          <CardDescription>
            Đổi gia sư hoặc thay đổi định mức Battle Pass CSAT. Mọi thay đổi đều được ghi lại vào lịch sử để đảm bảo an toàn dữ liệu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <h4 className="font-semibold text-amber-800 dark:text-amber-300">Đổi Gia Sư Dạy Lớp</h4>
              <p className="text-xs text-amber-700 dark:text-amber-400">Gia sư hiện tại: <strong>{classInfo?.tutors?.name}</strong></p>
              <Button
                variant="outline"
                className="w-full border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                onClick={() => { setIsChangeTutorOpen(true); setNewTutorId(''); }}
              >
                Chọn Gia Sư Mới...
              </Button>
            </div>

            <div className="space-y-2 p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Điều Chỉnh Định Mức Battle Pass CSAT</h4>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">Định mức hiện tại: <strong>{formatVND(classInfo?.csat_fee_per_session || 0)} / buổi</strong></p>
              <Button
                variant="outline"
                className="w-full border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                onClick={() => { setIsUpdateCsatOpen(true); setNewCsatFee(String(classInfo?.csat_fee_per_session || 0)); }}
              >
                Thay Đổi Battle Pass CSAT...
              </Button>
            </div>
          </div>

          <div className="mt-4 bg-secondary/50 border border-border rounded-lg p-4 text-sm text-foreground">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Lưu ý quan trọng khi sửa đổi (Edge Cases)
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Sửa ngày của buổi học qua mặt "Ngày hiệu lực":</strong> Nếu bạn đổi Gia sư/Phí có hiệu lực từ ngày 01/06, thì các buổi từ 01/06 trở đi sẽ tự động áp dụng giá trị mới.
              </li>
              <li>
                <strong>Chọn sai "Ngày hiệu lực":</strong> Hãy đảm bảo ngày hiệu lực được chọn chuẩn xác. Các thay đổi sẽ không ảnh hưởng đến những buổi học nằm trước ngày hiệu lực này.
              </li>
            </ul>
          </div>

        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gán Học Sinh Vào Lớp</CardTitle>
            <CardDescription>Thiết lập mức học phí riêng biệt (VND / 1 buổi) cho từng học sinh.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssignStudent} className="space-y-4">
              <Combobox
                options={allStudents
                  .filter(s => !studentsInClass.find(cs => cs.student_id === s.student_id && cs.status === 'active'))
                  .map(s => ({ value: s.student_id, label: s.name }))}
                value={selectedStudentId}
                onValueChange={(val) => setSelectedStudentId(val || '')}
                placeholder="Chọn học sinh..."
                searchPlaceholder="Tìm học sinh..."
              />
              
              <div>
                <label className="text-sm font-medium">Học phí / Buổi (VND)</label>
                <Input 
                  type="number"
                  value={tuitionFee}
                  onChange={e => setTuitionFee(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <Button type="submit" className="w-full">Thêm Học Sinh</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-amber-500">
           <CardHeader>
             <CardTitle>Quản lý Lịch Học</CardTitle>
             <CardDescription>Tạo buổi học đơn lẻ hoặc tạo loạt lịch cố định.</CardDescription>
           </CardHeader>
           <CardContent>
             <form onSubmit={handleCreateSession} className="space-y-4">
               <div>
                 <label className="text-sm font-medium">Ngày Học</label>
                 <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} required />
               </div>
               <div className="flex gap-4">
                 <div className="w-full">
                   <label className="text-sm font-medium">Bắt Đầu</label>
                   <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                 </div>
                 <div className="w-full">
                   <label className="text-sm font-medium">Kết Thúc</label>
                   <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                 </div>
               </div>
               <div className="flex flex-col gap-2">
                 <div className="flex gap-2">
                   <Button type="submit" variant="secondary" className="w-full">Tạo Buổi Lẻ</Button>
                 </div>
                 <Button type="button" variant="outline" className="w-full" onClick={() => setIsScheduleOpen(true)}>Thêm Loạt Lịch Cố Định</Button>
               </div>
             </form>
           </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle>Danh Sách Học Sinh Trong Lớp ({studentsInClass.filter(cs => studentStatusFilter === 'all' || cs.status === studentStatusFilter).length})</CardTitle>
          </div>
          <div className="w-[180px]">
            <Combobox
              options={[
                { value: 'active', label: 'Đang học' },
                { value: 'dropped', label: 'Đã nghỉ' },
                { value: 'all', label: 'Tất cả' },
              ]}
              value={studentStatusFilter}
              onValueChange={(val) => setStudentStatusFilter(val || 'active')}
              placeholder="Lọc trạng thái"
              searchPlaceholder="Tìm..."
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Mã HS</TableHead>
                 <TableHead>Tên Học Sinh</TableHead>
                 <TableHead>Học Phí / Buổi</TableHead>
                 <TableHead>Trạng Thái</TableHead>
                 <TableHead className="text-right">Action</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
                {studentsInClass.filter(cs => studentStatusFilter === 'all' || cs.status === studentStatusFilter).map(cs => (
                  <TableRow key={cs.student_id}>
                     <TableCell className="font-mono text-xs">{cs.student_id.split('-')[0]}</TableCell>
                     <TableCell className="font-medium">{cs.students?.name}</TableCell>
                     <TableCell>{formatVND(cs.tuition_fee_per_session)}</TableCell>
                     <TableCell>
                       {cs.status === 'active' ? (
                         <span className="px-2 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs rounded-sm font-semibold border border-emerald-500/20">Đang học</span>
                       ) : (
                         <span className="px-2 py-1 bg-secondary text-muted-foreground text-xs rounded-sm font-semibold border border-border">Đã nghỉ</span>
                       )}
                     </TableCell>
                     <TableCell className="text-right">
                       {cs.status === 'active' && (
                         <div className="flex items-center justify-end gap-2">
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => { setEditingStudent(cs); setNewStudentFee(String(cs.tuition_fee_per_session)); setIsUpdateFeeOpen(true); }}
                             className="text-primary hover:text-primary hover:bg-primary/10"
                           >
                             <Edit className="w-4 h-4 mr-1" /> Sửa phí
                           </Button>
                           <Button variant="ghost" size="sm" onClick={() => handleRemoveStudent(cs.student_id)} className="text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
                             <Trash2 className="w-4 h-4 mr-1" /> Dừng học
                           </Button>
                         </div>
                       )}
                     </TableCell>
                  </TableRow>
                ))}
                {studentsInClass.filter(cs => studentStatusFilter === 'all' || cs.status === studentStatusFilter).length === 0 && (
                   <TableRow>
                     <TableCell colSpan={5} className="text-center py-4">Lớp chưa có học sinh</TableCell>
                   </TableRow>
                )}
             </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lịch Sử Buổi Học</CardTitle>
          <CardDescription>Các buổi học được tạo thủ công hoặc tự động.</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Ngày</TableHead>
                 <TableHead>Thời Gian</TableHead>
                 <TableHead>Battle Pass CSAT/buổi</TableHead>
                 <TableHead>Trạng Thái</TableHead>
                 <TableHead className="text-right">Action</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
                {classSessions.map(s => (
                  <TableRow key={s.session_id}>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.csat_fee_snapshot != null ? formatVND(s.csat_fee_snapshot) : '—'}
                    </TableCell>
                    <TableCell>
                      {s.status === 'scheduled' && <span className="text-blue-500 font-medium">Sắp tới</span>}
                      {s.status === 'completed' && <span className="text-green-500 font-medium">Đã dạy</span>}
                      {s.status === 'cancelled' && <span className="text-destructive font-medium">Đã hủy</span>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                       {s.status === 'scheduled' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => { setEditSessionData({ session_id: s.session_id, date: s.date, start_time: s.start_time.substring(0,5), end_time: s.end_time.substring(0,5) }); setIsEditSessionOpen(true); }}>Sửa</Button>
                            <Button variant="outline" size="sm" onClick={() => openBulkDelete(s)}>Cập nhật loạt</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleCancelSession(s.session_id)}>Hủy lẻ</Button>
                          </>
                       )}
                    </TableCell>
                  </TableRow>
                ))}
                {classSessions.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Chưa có buổi học nào</TableCell>
                   </TableRow>
                )}
             </TableBody>
           </Table>
        </CardContent>
      </Card>

      {changeLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <History className="w-5 h-5" />
              Lịch Sử Thay Đổi Lớp
            </CardTitle>
            <CardDescription>Audit log ghi lại mọi thay đổi gia sư và Battle Pass CSAT.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời Gian</TableHead>
                  <TableHead>Loại Thay Đổi</TableHead>
                  <TableHead>Từ</TableHead>
                  <TableHead>Sang</TableHead>
                  <TableHead>Ngày Hiệu Lực</TableHead>
                  <TableHead>Ghi Chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeLogs.map(log => (
                  <TableRow key={log.log_id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      {log.change_type === 'tutor_change' ? (
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs rounded-sm font-semibold border border-amber-500/20">Đổi Gia Sư</span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs rounded-sm font-semibold border border-emerald-500/20">Đổi Battle Pass</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.old_label}</TableCell>
                    <TableCell className="text-sm font-semibold text-foreground">{log.new_label}</TableCell>
                    <TableCell className="text-sm">{log.effective_date}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{log.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!bulkDeleteSession} onOpenChange={(open) => !open && setBulkDeleteSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập Nhật Lịch Hàng Loạt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 mt-2">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium">Từ ngày</label>
                 <Input type="date" value={bulkDelStart} onChange={(e) => setBulkDelStart(e.target.value)} />
               </div>
               <div>
                 <label className="text-sm font-medium">Đến ngày</label>
                 <Input type="date" value={bulkDelEnd} onChange={(e) => setBulkDelEnd(e.target.value)} />
               </div>
             </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
             <Button variant="outline" onClick={() => setBulkDeleteSession(null)}>Đóng</Button>
             <Button variant="secondary" onClick={() => handleMassUpdate('cancel')}>Báo Nghỉ Lễ (Hủy)</Button>
             <Button variant="destructive" onClick={() => handleMassUpdate('delete')}>Xóa Vĩnh Viễn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditSessionOpen} onOpenChange={setIsEditSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa Lịch Học (Đổi buổi)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSession} className="space-y-4 py-4">
             <div>
               <label className="text-sm font-medium">Ngày Học</label>
               <Input type="date" value={editSessionData.date} onChange={(e) => setEditSessionData({...editSessionData, date: e.target.value})} required />
             </div>
             <div className="flex gap-4">
               <div className="w-full">
                 <label className="text-sm font-medium">Bắt Đầu</label>
                 <Input type="time" value={editSessionData.start_time} onChange={(e) => setEditSessionData({...editSessionData, start_time: e.target.value})} required />
               </div>
               <div className="w-full">
                 <label className="text-sm font-medium">Kết Thúc</label>
                 <Input type="time" value={editSessionData.end_time} onChange={(e) => setEditSessionData({...editSessionData, end_time: e.target.value})} required />
               </div>
             </div>
             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditSessionOpen(false)}>Hủy</Button>
                <Button type="submit">Cập nhật</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thêm Loạt Lịch Cố Định</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleManageSchedule} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium">Từ ngày</label>
                 <Input type="date" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} required />
               </div>
               <div>
                 <label className="text-sm font-medium">Đến ngày</label>
                 <Input type="date" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} required />
               </div>
             </div>
             <div className="space-y-3 pt-4 border-t">
               <div className="flex justify-between items-center">
                 <h4 className="font-semibold text-sm">Cấu hình lịch tuần</h4>
                 <Button type="button" variant="secondary" size="sm" onClick={addScheduleConfig}>+ Thêm Lịch</Button>
               </div>
               {scheduleConfigs.map((c) => (
                 <div key={c.id} className="flex gap-2 items-end bg-secondary/50 p-2 rounded-md">
                   <div className="w-1/3">
                     <label className="text-xs font-medium">Thứ</label>
                     <Combobox
                       options={[
                         { value: '1', label: 'Thứ Hai' }, { value: '2', label: 'Thứ Ba' }, { value: '3', label: 'Thứ Tư' },
                         { value: '4', label: 'Thứ Năm' }, { value: '5', label: 'Thứ Sáu' }, { value: '6', label: 'Thứ Bảy' }, { value: '0', label: 'Chủ Nhật' }
                       ]}
                       value={c.dayOfWeek.toString()}
                       onValueChange={(val) => val && updateScheduleConfig(c.id, 'dayOfWeek', Number(val))}
                       placeholder="Chọn"
                       searchPlaceholder="Tìm..."
                     />
                   </div>
                   <div className="w-1/3">
                     <label className="text-xs font-medium">Bắt Đầu</label>
                     <Input type="time" value={c.start_time} onChange={(e) => updateScheduleConfig(c.id, 'start_time', e.target.value)} required />
                   </div>
                   <div className="w-1/3">
                     <label className="text-xs font-medium">Kết Thúc</label>
                     <Input type="time" value={c.end_time} onChange={(e) => updateScheduleConfig(c.id, 'end_time', e.target.value)} required />
                   </div>
                   <Button type="button" variant="ghost" size="icon" onClick={() => removeScheduleConfig(c.id)}><Trash2 className="h-4 w-4" /></Button>
                 </div>
               ))}
             </div>
             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={scheduleConfigs.length === 0}>Tạo Lịch Hàng Loạt</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isChangeTutorOpen} onOpenChange={setIsChangeTutorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              Đổi Gia Sư Dạy Lớp
            </DialogTitle>
            <DialogDescription>
              Gia sư hiện tại: <strong>{classInfo?.tutors?.name}</strong>. Thay đổi sẽ được ghi vào lịch sử.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangeTutor} className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Gia Sư Mới <span className="text-destructive">*</span></label>
              <Combobox
                options={allTutors.filter(t => t.tutor_id !== classInfo?.tutor_id).map(t => ({ value: t.tutor_id, label: t.name }))}
                value={newTutorId}
                onValueChange={(val) => setNewTutorId(val || '')}
                placeholder="Chọn gia sư..."
                searchPlaceholder="Tìm gia sư..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ngày Hiệu Lực <span className="text-destructive">*</span></label>
              <Input type="date" value={changeTutorDate} onChange={e => setChangeTutorDate(e.target.value)} required />
              <p className="text-xs text-muted-foreground mt-1">Ngày gia sư mới bắt đầu chính thức dạy lớp này.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Ghi Chú (tuỳ chọn)</label>
              <Input
                placeholder="Lý do đổi gia sư..."
                value={changeTutorNotes}
                onChange={e => setChangeTutorNotes(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsChangeTutorOpen(false)}>Hủy</Button>
              <Button
                type="submit"
                disabled={!newTutorId || changeTutorLoading}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {changeTutorLoading ? 'Đang xử lý...' : 'Xác Nhận Đổi Gia Sư'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========== MODAL: ĐIỀU CHỈNH PHÍ CSAT (MỚI) ========== */}
      <Dialog open={isUpdateCsatOpen} onOpenChange={setIsUpdateCsatOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <AlertTriangle className="w-5 h-5" />
              Điều Chỉnh Định Mức Battle Pass CSAT
            </DialogTitle>
            <DialogDescription>
              Định mức hiện tại: <strong>{formatVND(classInfo?.csat_fee_per_session || 0)} / buổi</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCsatFee} className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Định Mức Battle Pass Mới (VND / buổi) <span className="text-destructive">*</span></label>
              <Input
                type="number"
                min="0"
                value={newCsatFee}
                onChange={e => setNewCsatFee(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ngày Hiệu Lực <span className="text-destructive">*</span></label>
              <Input type="date" value={csatEffectiveDate} onChange={e => setCsatEffectiveDate(e.target.value)} required />
              <p className="text-xs text-muted-foreground mt-1">Hệ thống sẽ cập nhật tự động snapshot phí cho các buổi chưa dạy từ ngày này trở đi.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Ghi Chú (tuỳ chọn)</label>
              <Input
                placeholder="Lý do điều chỉnh phí..."
                value={csatNotes}
                onChange={e => setCsatNotes(e.target.value)}
              />
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-xs text-emerald-700 dark:text-emerald-400">
              ⚠️ <strong>Lưu ý:</strong> Chỉ các buổi học <strong>chưa dạy (Sắp tới)</strong> từ ngày hiệu lực trở đi mới bị ảnh hưởng. Các buổi đã dạy sẽ <strong>không thay đổi</strong> và được bảo toàn nguyên vẹn.
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsUpdateCsatOpen(false)}>Hủy</Button>
              <Button
                type="submit"
                disabled={csatLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {csatLoading ? 'Đang xử lý...' : 'Xác Nhận Thay Đổi Battle Pass'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Student Fee Modal */}
      <Dialog open={isUpdateFeeOpen} onOpenChange={setIsUpdateFeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa Học Phí Học Sinh</DialogTitle>
            <DialogDescription>
              Cập nhật lại học phí cho <strong>{editingStudent?.students?.name}</strong>. Mức phí mới sẽ áp dụng cho các buổi học được điểm danh từ lúc này trở đi.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStudentFee} className="space-y-4 py-4">
             <div>
               <label className="text-sm font-medium">Học Phí Mới (VNĐ / Buổi)</label>
               <Input 
                 type="number" 
                 value={newStudentFee} 
                 onChange={(e) => setNewStudentFee(e.target.value)} 
                 min="0" 
                 step="1000" 
                 required 
               />
             </div>
             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsUpdateFeeOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={updateFeeLoading}>{updateFeeLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
