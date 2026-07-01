'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { Trash2, AlertTriangle, History, FileSpreadsheet, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

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



  const supabase = createClient();

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
       alert("Lỗi: " + error.message);
    }
  }

  async function handleRemoveStudent(studentId: string) {
    if (!confirm('Bạn có chắc chắn muốn cho học sinh này Dừng học (Đã nghỉ) tại lớp này không?\nHọc sinh sẽ không bị xóa khỏi hệ thống, nhưng sẽ không được điểm danh và không bị tính học phí cho các buổi học sau.')) return;
    const { error } = await supabase.from('class_students').update({ status: 'dropped' }).eq('class_id', classId).eq('student_id', studentId);
    if (!error) {
      alert('Đã cập nhật trạng thái học sinh thành Đã nghỉ');
      fetchData();
    } else {
      alert("Lỗi: " + error.message);
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
       alert('Tạo buổi học thành công');
       setSessionDate('');
       fetchData();
    } else {
       alert("Lỗi: " + error.message);
    }
  }

  async function handleCancelSession(sessionId: string) {
    if (!confirm('Hủy buổi học này?')) return;
    const { error } = await supabase.from('sessions').update({ status: 'cancelled' }).eq('session_id', sessionId);
    if (!error) {
       alert('Đã hủy buổi học');
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
      alert("Không tìm thấy buổi học nào phù hợp.");
      return;
    }
    
    const filteredToUpdate = toUpdate.filter(s => parseLocalDate(s.date).getDay() === dayOfWeek);

    if(filteredToUpdate.length === 0) {
       alert("Không tìm thấy buổi học nào phù hợp.");
       return;
    }

    const actionText = action === 'cancel' ? 'BÁO NGHỈ LỄ (Hủy)' : 'XÓA VĨNH VIỄN';
    if(!confirm(`Tìm thấy ${filteredToUpdate.length} buổi học. Bạn có chắc muốn ${actionText} tất cả?`)) return;

    const sessionIds = filteredToUpdate.map(s => s.session_id);
    
    if (action === 'cancel') {
       await supabase.from('sessions').update({ status: 'cancelled' }).in('session_id', sessionIds);
       alert("Đã cập nhật trạng thái các buổi học thành Đã Hủy (Nghỉ Lễ).");
    } else {
       await supabase.from('sessions').delete().in('session_id', sessionIds);
       alert("Đã xóa vĩnh viễn các buổi học.");
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
      alert(data.message);
      setIsScheduleOpen(false);
      fetchData();
    } catch(err: any) {
      alert("Lỗi: " + err.message);
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
      alert(data.message);
      setIsEditSessionOpen(false);
      fetchData();
    } catch(err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleChangeTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTutorId) return;
    const newTutorName = allTutors.find(t => t.tutor_id === newTutorId)?.name || '';
    if (!confirm(`Xác nhận đổi gia sư sang "${newTutorName}" kể từ ${changeTutorDate}?\n\nLưu ý: Thay đổi này sẽ được ghi lại vào lịch sử.`)) return;
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
      alert(data.message);
      setIsChangeTutorOpen(false);
      setNewTutorId('');
      setChangeTutorNotes('');
      setChangeTutorDate(todayStr());
      fetchData();
    } catch(err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setChangeTutorLoading(false);
    }
  };

  const handleUpdateCsatFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = parseFloat(newCsatFee);
    if (isNaN(fee) || fee < 0) { alert('Phí CSAT không hợp lệ'); return; }
    if (!confirm(`Xác nhận cập nhật phí CSAT sang ${formatVND(fee)} kể từ ${csatEffectiveDate}?\n\nHệ thống sẽ tự động cập nhật snapshot phí cho tất cả các buổi chưa dạy từ ngày này.\nCác buổi đã dạy sẽ KHÔNG bị thay đổi.`)) return;
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
      alert(data.message);
      setIsUpdateCsatOpen(false);
      setCsatNotes('');
      setCsatEffectiveDate(todayStr());
      fetchData();
    } catch(err: any) {
      alert("Lỗi: " + err.message);
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
    if (isNaN(fee) || fee < 0) { alert('Học phí không hợp lệ'); return; }
    if (!confirm(`Xác nhận cập nhật học phí cho học sinh ${editingStudent.students?.name} sang ${formatVND(fee)}?\n\nLưu ý: Chỉ các buổi học điểm danh kể từ bây giờ mới áp dụng mức phí này. Các buổi đã điểm danh trước đó giữ nguyên học phí cũ.`)) return;
    
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
      alert(data.message);
      setIsUpdateFeeOpen(false);
      fetchData();
    } catch(err: any) {
      alert("Lỗi: " + err.message);
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

  if (loading) return <div className="p-4 text-center text-gray-400">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Chi tiết lớp: {classInfo?.name}
          </h2>
          <p className="text-gray-500 mt-1">
            Gia sư phụ trách: <span className="font-semibold text-gray-700">{classInfo?.tutors?.name}</span>
            <span className="mx-2 text-gray-300">|</span>
            Phí CSAT/buổi: <span className="font-semibold text-gray-700">{formatVND(classInfo?.csat_fee_per_session || 0)}</span>
          </p>
        </div>
        <Button variant="outline" onClick={handleExportReport} className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Xuất Báo Cáo
        </Button>
      </div>

      {/* ========== CARD: ĐIỀU CHỈNH LỚP HỌC (MỚI) ========== */}
      <Card className="border-t-4 border-t-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            Điều Chỉnh Lớp Học
          </CardTitle>
          <CardDescription>
            Đổi gia sư hoặc thay đổi phí CSAT. Mọi thay đổi đều được ghi lại vào lịch sử để đảm bảo an toàn dữ liệu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Đổi Gia Sư */}
            <div className="space-y-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800">Đổi Gia Sư Dạy Lớp</h4>
              <p className="text-xs text-amber-700">Gia sư hiện tại: <strong>{classInfo?.tutors?.name}</strong></p>
              <Button
                variant="outline"
                className="w-full border-amber-400 text-amber-700 hover:bg-amber-100"
                onClick={() => { setIsChangeTutorOpen(true); setNewTutorId(''); }}
              >
                Chọn Gia Sư Mới...
              </Button>
            </div>

            {/* Điều chỉnh phí CSAT */}
            <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800">Điều Chỉnh Phí CSAT / Buổi</h4>
              <p className="text-xs text-red-700">Phí hiện tại: <strong>{formatVND(classInfo?.csat_fee_per_session || 0)}</strong></p>
              <Button
                variant="outline"
                className="w-full border-red-400 text-red-700 hover:bg-red-100"
                onClick={() => { setIsUpdateCsatOpen(true); setNewCsatFee(String(classInfo?.csat_fee_per_session || 0)); }}
              >
                Thay Đổi Phí CSAT...
              </Button>
            </div>
          </div>

          {/* Lưu ý Edge Cases cho Admin */}
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700">
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Lưu ý quan trọng khi sửa đổi (Edge Cases)
            </h4>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Sửa ngày của buổi học qua mặt "Ngày hiệu lực":</strong> Nếu bạn đổi Gia sư/Phí có hiệu lực từ ngày 01/06, thì các buổi từ 01/06 trở đi sẽ tự động áp dụng giá trị mới. <strong>Tuy nhiên</strong>, nếu sau đó bạn dùng tính năng sửa ngày của một buổi mới (ví dụ lùi từ 02/06 về 30/05), buổi học đó vẫn mang giá trị mới.
                <br /><span className="text-amber-700">Cách xử lý: Xóa buổi đó và chọn "Thêm buổi lẻ" để hệ thống lấy lại mốc gia sư/phí chính xác của ngày đó.</span>
              </li>
              <li>
                <strong>Chọn sai "Ngày hiệu lực":</strong> Hãy đảm bảo ngày hiệu lực được chọn chuẩn xác. Các thay đổi sẽ không ảnh hưởng đến những buổi học (bao gồm cả đã dạy và chưa dạy) nằm trước ngày hiệu lực này, giúp bảo toàn lịch sử lương và doanh thu.
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
              <Select value={selectedStudentId} onValueChange={(val) => setSelectedStudentId(val || '')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn Học Sinh..." />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.filter(s => !studentsInClass.find(cs => cs.student_id === s.student_id && cs.status === 'active')).map(s => (
                    <SelectItem key={s.student_id} value={s.student_id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
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
          <Select value={studentStatusFilter} onValueChange={(val) => setStudentStatusFilter(val || 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Đang học</SelectItem>
              <SelectItem value="dropped">Đã nghỉ</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>
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
                         <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-sm font-semibold">Đang học</span>
                       ) : (
                         <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-sm font-semibold">Đã nghỉ</span>
                       )}
                     </TableCell>
                     <TableCell className="text-right">
                       {cs.status === 'active' && (
                         <div className="flex items-center justify-end gap-2">
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => { setEditingStudent(cs); setNewStudentFee(String(cs.tuition_fee_per_session)); setIsUpdateFeeOpen(true); }}
                             className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                           >
                             <Edit className="w-4 h-4 mr-1" /> Sửa phí
                           </Button>
                           <Button variant="ghost" size="sm" onClick={() => handleRemoveStudent(cs.student_id)} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
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
                 <TableHead>Phí CSAT/buổi</TableHead>
                 <TableHead>Trạng Thái</TableHead>
                 <TableHead className="text-right">Action</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
                {classSessions.map(s => (
                  <TableRow key={s.session_id}>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {s.csat_fee_snapshot != null ? formatVND(s.csat_fee_snapshot) : '—'}
                    </TableCell>
                    <TableCell>
                      {s.status === 'scheduled' && <span className="text-blue-500 font-medium">Sắp tới</span>}
                      {s.status === 'completed' && <span className="text-green-500 font-medium">Đã dạy</span>}
                      {s.status === 'cancelled' && <span className="text-red-500 font-medium">Đã hủy</span>}
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
                     <TableCell colSpan={5} className="text-center py-4">Chưa có buổi học nào</TableCell>
                   </TableRow>
                )}
             </TableBody>
           </Table>
        </CardContent>
      </Card>

      {/* ========== CARD: LỊCH SỬ THAY ĐỔI LỚP (MỚI) ========== */}
      {changeLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <History className="w-5 h-5" />
              Lịch Sử Thay Đổi Lớp
            </CardTitle>
            <CardDescription>Audit log ghi lại mọi thay đổi gia sư và phí CSAT để đảm bảo tính minh bạch.</CardDescription>
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
                    <TableCell className="text-xs text-gray-500">
                      {new Date(log.created_at).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      {log.change_type === 'tutor_change' ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-sm font-semibold">Đổi Gia Sư</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-sm font-semibold">Đổi Phí CSAT</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{log.old_label}</TableCell>
                    <TableCell className="text-sm font-semibold text-gray-800">{log.new_label}</TableCell>
                    <TableCell className="text-sm">{log.effective_date}</TableCell>
                    <TableCell className="text-xs text-gray-500">{log.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Mass Update Modal */}
      <Dialog open={!!bulkDeleteSession} onOpenChange={(open) => !open && setBulkDeleteSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập Nhật Lịch Hàng Loạt</DialogTitle>
            <DialogDescription>
              Tác động đến tất cả các buổi học <strong>{bulkDeleteSession?.start_time.substring(0,5)} - {bulkDeleteSession?.end_time.substring(0,5)}</strong> cùng <strong>Thứ {bulkDeleteSession && new Date(parseInt(bulkDeleteSession.date.split('-')[0]), parseInt(bulkDeleteSession.date.split('-')[1]) - 1, parseInt(bulkDeleteSession.date.split('-')[2])).getDay() === 0 ? 'Chủ Nhật' : bulkDeleteSession && (new Date(parseInt(bulkDeleteSession.date.split('-')[0]), parseInt(bulkDeleteSession.date.split('-')[1]) - 1, parseInt(bulkDeleteSession.date.split('-')[2])).getDay() + 1)}</strong> trong khoảng thời gian diễn ra từ:
            </DialogDescription>
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
      
      {/* Edit Session Modal */}
      <Dialog open={isEditSessionOpen} onOpenChange={setIsEditSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa Lịch Học (Đổi buổi)</DialogTitle>
            <DialogDescription>
              Cập nhật lại ngày hoặc giờ của buổi học này.
            </DialogDescription>
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

      {/* Schedule Manage Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thêm Loạt Lịch Cố Định Theo Tuần</DialogTitle>
            <DialogDescription>
              Bạn có thể cấu hình nhiều ngày trong tuần, hệ thống sẽ tự động sinh lịch từ Ngày Bắt Đầu đến Ngày Kết Thúc.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleManageSchedule} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium">Từ ngày (Bắt đầu)</label>
                 <Input type="date" value={scheduleStart} onChange={(e) => setScheduleStart(e.target.value)} required />
               </div>
               <div>
                 <label className="text-sm font-medium">Đến ngày (Kết thúc)</label>
                 <Input type="date" value={scheduleEnd} onChange={(e) => setScheduleEnd(e.target.value)} required />
               </div>
             </div>
             
             <div className="space-y-3 pt-4 border-t">
               <div className="flex justify-between items-center">
                 <h4 className="font-semibold text-sm">Cấu hình lịch tuần</h4>
                 <Button type="button" variant="secondary" size="sm" onClick={addScheduleConfig}>+ Thêm Lịch Trong Tuần</Button>
               </div>
               {scheduleConfigs.map((c) => (
                 <div key={c.id} className="flex gap-2 items-end bg-slate-50 p-2 rounded-md">
                   <div className="w-1/3">
                     <label className="text-xs font-medium">Thứ</label>
                     <Select value={c.dayOfWeek.toString()} onValueChange={(val) => updateScheduleConfig(c.id, 'dayOfWeek', Number(val))}>
                       <SelectTrigger>
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="1">Thứ Hai</SelectItem>
                         <SelectItem value="2">Thứ Ba</SelectItem>
                         <SelectItem value="3">Thứ Tư</SelectItem>
                         <SelectItem value="4">Thứ Năm</SelectItem>
                         <SelectItem value="5">Thứ Sáu</SelectItem>
                         <SelectItem value="6">Thứ Bảy</SelectItem>
                         <SelectItem value="0">Chủ Nhật</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="w-1/3">
                     <label className="text-xs font-medium">Bắt Đầu</label>
                     <Input type="time" value={c.start_time} onChange={(e) => updateScheduleConfig(c.id, 'start_time', e.target.value)} required />
                   </div>
                   <div className="w-1/3">
                     <label className="text-xs font-medium">Kết Thúc</label>
                     <Input type="time" value={c.end_time} onChange={(e) => updateScheduleConfig(c.id, 'end_time', e.target.value)} required />
                   </div>
                   <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={() => removeScheduleConfig(c.id)}>
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
               ))}
               {scheduleConfigs.length === 0 && (
                 <p className="text-sm text-red-500 text-center">Vui lòng thêm ít nhất 1 khung giờ.</p>
               )}
             </div>
             
             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={scheduleConfigs.length === 0}>Tạo Lịch Hàng Loạt</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========== MODAL: ĐỔI GIA SƯ (MỚI) ========== */}
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
              <label className="text-sm font-medium">Gia Sư Mới <span className="text-red-500">*</span></label>
              <Select value={newTutorId} onValueChange={(val) => setNewTutorId(val || '')} required>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn gia sư..." />
                </SelectTrigger>
                <SelectContent>
                  {allTutors
                    .filter(t => t.tutor_id !== classInfo?.tutor_id)
                    .map(t => (
                      <SelectItem key={t.tutor_id} value={t.tutor_id}>{t.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Ngày Hiệu Lực <span className="text-red-500">*</span></label>
              <Input type="date" value={changeTutorDate} onChange={e => setChangeTutorDate(e.target.value)} required />
              <p className="text-xs text-gray-400 mt-1">Ngày gia sư mới bắt đầu chính thức dạy lớp này.</p>
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
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Điều Chỉnh Phí CSAT / Buổi
            </DialogTitle>
            <DialogDescription>
              Phí CSAT hiện tại: <strong>{formatVND(classInfo?.csat_fee_per_session || 0)}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateCsatFee} className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Phí CSAT Mới (VND / buổi) <span className="text-red-500">*</span></label>
              <Input
                type="number"
                min="0"
                value={newCsatFee}
                onChange={e => setNewCsatFee(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Ngày Hiệu Lực <span className="text-red-500">*</span></label>
              <Input type="date" value={csatEffectiveDate} onChange={e => setCsatEffectiveDate(e.target.value)} required />
              <p className="text-xs text-gray-400 mt-1">Hệ thống sẽ cập nhật tự động snapshot phí cho các buổi chưa dạy từ ngày này trở đi.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Ghi Chú (tuỳ chọn)</label>
              <Input
                placeholder="Lý do điều chỉnh phí..."
                value={csatNotes}
                onChange={e => setCsatNotes(e.target.value)}
              />
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
              ⚠️ <strong>Lưu ý:</strong> Chỉ các buổi học <strong>chưa dạy (Sắp tới)</strong> từ ngày hiệu lực trở đi mới bị ảnh hưởng. Các buổi đã dạy sẽ <strong>không thay đổi</strong> và được bảo toàn nguyên vẹn.
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsUpdateCsatOpen(false)}>Hủy</Button>
              <Button
                type="submit"
                disabled={csatLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {csatLoading ? 'Đang xử lý...' : 'Xác Nhận Thay Đổi Phí'}
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
