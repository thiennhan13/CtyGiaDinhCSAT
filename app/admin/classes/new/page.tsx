'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { format, startOfMonth, startOfWeek, addDays, getMonth, setHours, setMinutes, isBefore, isAfter, endOfMonth } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2 } from 'lucide-react';

export default function NewClassPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data needed for forms
  const [tutors, setTutors] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);

  // Step 1: Class Info & Students
  const [className, setClassName] = useState('');
  const [tutorId, setTutorId] = useState('');
  const [csatFee, setCsatFee] = useState<number>(0);
  const [selectedStudents, setSelectedStudents] = useState<{ id: string, name: string, fee: number }[]>([]);

  // Step 2: Fixed Schedule
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [schedules, setSchedules] = useState<{ dayOfWeek: string, startTime: string, endTime: string }[]>([]);
  
  const daysOfWeek = [
    { value: '1', label: 'Thứ Hai' },
    { value: '2', label: 'Thứ Ba' },
    { value: '3', label: 'Thứ Tư' },
    { value: '4', label: 'Thứ Năm' },
    { value: '5', label: 'Thứ Sáu' },
    { value: '6', label: 'Thứ Bảy' },
    { value: '0', label: 'Chủ Nhật' }
  ];

  useEffect(() => {
    async function fetchData() {
      const [{ data: tuts }, { data: stds }] = await Promise.all([
        supabase.from('tutors').select('*'),
        supabase.from('students').select('*')
      ]);
      if (tuts) setTutors(tuts);
      if (stds) setAllStudents(stds);
      setLoading(false);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStudentToggle = (student: any) => {
    const isSelected = selectedStudents.find(s => s.id === student.student_id);
    if (isSelected) {
      setSelectedStudents(prev => prev.filter(s => s.id !== student.student_id));
    } else {
      setSelectedStudents(prev => [...prev, { id: student.student_id, name: student.name, fee: student.default_tuition_fee || 100000 }]);
    }
  };

  const handleFeeChange = (id: string, newFee: number) => {
    setSelectedStudents(prev => prev.map(s => s.id === id ? { ...s, fee: newFee } : s));
  };

  const addScheduleRow = () => {
    if (schedules.length >= 3) {
      alert("Bạn chỉ có thể tạo tối đa 3 lịch cố định 1 tuần.");
      return;
    }
    setSchedules([...schedules, { dayOfWeek: '1', startTime: '18:00', endTime: '19:30' }]);
  };

  const updateSchedule = (index: number, field: string, value: string) => {
    const newSch = [...schedules];
    (newSch[index] as any)[field] = value;
    if (field === 'startTime' && newSch[index].endTime === '19:30') {
      // auto set end time (+1.5 hours) ONLY IF it hasn't been manually changed much
      const [h, m] = value.split(':').map(Number);
      const startD = new Date();
      startD.setHours(h, m, 0);
      startD.setMinutes(startD.getMinutes() + 90); // 1h30m
      newSch[index].endTime = `${startD.getHours().toString().padStart(2, '0')}:${startD.getMinutes().toString().padStart(2, '0')}`;
    }
    setSchedules(newSch);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const checkConflictAndSubmit = async () => {
    if (!className || !tutorId) {
      alert('Vui lòng điền tên lớp và chọn gia sư.');
      return;
    }
    if (schedules.length === 0) {
      alert('Vui lòng thêm ít nhất 1 buổi học cố định.');
      return;
    }

    setSubmitting(true);
    
    // 1. Generate dates for current month based on selected days of week
    const generatedSessions: { date: string, start_time: string, end_time: string }[] = [];
    let currentDate = new Date(startDate);
    const endGenerationDate = new Date(endDate);
    
    while (currentDate <= endGenerationDate) {
      const dayIndex = currentDate.getDay().toString(); // 0-6
      
      const foundSchedules = schedules.filter(s => s.dayOfWeek === dayIndex);
      for (const sch of foundSchedules) {
        generatedSessions.push({
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: sch.startTime,
          end_time: sch.endTime
        });
      }
      currentDate = addDays(currentDate, 1);
    }

    // 2. Fetch existing sessions of the tutor to check conflict
    const { data: existingSessions, error: fetchErr } = await supabase
      .from('sessions')
      .select('date, start_time, end_time, classes!inner(name, tutor_id)')
      .eq('classes.tutor_id', tutorId)
      .in('date', generatedSessions.map(s => s.date));

    if (fetchErr) {
      alert("Lỗi khi kiểm tra lịch gia sư: " + fetchErr.message);
      setSubmitting(false);
      return;
    }

    // 3. Conflict comparison
    let conflictFound = false;
    for (const newSession of generatedSessions) {
      const existingOnSameDate = existingSessions?.filter(s => s.date === newSession.date);
      if (existingOnSameDate && existingOnSameDate.length > 0) {
        for (const existing of existingOnSameDate) {
          // Compare time strings directly since they are HH:MM
          if (newSession.start_time < existing.end_time && newSession.end_time > existing.start_time) {
            conflictFound = true;
            alert(`Phát hiện trùng lịch khóa học của gia sư này:\n\nTrùng vào ngày: ${newSession.date}\nGiờ mới: ${newSession.start_time} - ${newSession.end_time}\nGiờ cũ đang có (${(existing.classes as any).name}): ${existing.start_time} - ${existing.end_time}`);
            break;
          }
        }
      }
      if (conflictFound) break;
    }

    if (conflictFound) {
      setSubmitting(false);
      return;
    }

    // 4. No conflict -> Save class, students, and sessions
    try {
      // 4.1 Create Class
      const { data: classData, error: classErr } = await supabase
        .from('classes')
        .insert([{
           name: className,
           tutor_id: tutorId,
           csat_fee_per_session: csatFee,
           start_date: startDate,
           end_date: endDate
        }])
        .select()
        .single();
      
      if (classErr) throw classErr;
      const newClassId = classData.class_id;

      // 4.2 Add Students
      if (selectedStudents.length > 0) {
        const classStudentsPayload = selectedStudents.map(s => ({
          class_id: newClassId,
          student_id: s.id,
          tuition_fee_per_session: s.fee
        }));
        const { error: studentErr } = await supabase.from('class_students').insert(classStudentsPayload);
        if (studentErr) throw studentErr;
      }

      // 4.3 Add Sessions
      if (generatedSessions.length > 0) {
        const sessionsPayload = generatedSessions.map(s => ({
          class_id: newClassId,
          date: s.date,
          start_time: s.start_time,
          end_time: s.end_time,
          status: 'scheduled' as any,
          csat_fee_snapshot: csatFee
        }));
        const { error: sessionErr } = await supabase.from('sessions').insert(sessionsPayload);
        if (sessionErr) throw sessionErr;
      }

      // Success
      alert("Tạo lớp học, học sinh, và lên lịch thành công!");
      router.push(`/admin/classes/${newClassId}`);

    } catch (error: any) {
      alert("Có lỗi xảy ra: " + error.message);
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Đang tải...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/classes')}>Tắt</Button>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Tạo Lớp Học Mới</h2>
      </div>

      {step === 1 && (
        <Card className="animate-in fade-in slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle>Bước 1: Thông tin Lớp & Học Sinh</CardTitle>
            <CardDescription>Chọn gia sư phụ trách và các học viên tham gia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tên lớp học <span className="text-red-500">*</span></label>
                <Input 
                  placeholder="Ví dụ: TOAN_01" 
                  value={className} 
                  onChange={(e) => setClassName(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Gia sư <span className="text-red-500">*</span></label>
                <Select value={tutorId} onValueChange={(val) => val && setTutorId(val)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn Gia Sư" />
                  </SelectTrigger>
                  <SelectContent>
                    {tutors.map(t => (
                      <SelectItem key={t.tutor_id} value={t.tutor_id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">CSAT (Phí trung tâm trừ mỗi buổi - VND) <span className="text-red-500">*</span></label>
                <Input 
                  type="number"
                  placeholder="Ví dụ: 30000" 
                  value={csatFee} 
                  onChange={(e) => setCsatFee(Number(e.target.value))} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <label className="text-sm font-bold text-slate-800">Chọn Học Sinh Trong Lớp (Tùy chọn)</label>
              <div className="border rounded-md overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0">
                    <TableRow>
                      <TableHead className="w-12 text-center">Chọn</TableHead>
                      <TableHead>Tên Học Sinh</TableHead>
                      <TableHead>Tuổi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allStudents.map(s => {
                      const isSelected = !!selectedStudents.find(sel => sel.id === s.student_id);
                      return (
                        <TableRow key={s.student_id} className={isSelected ? 'bg-indigo-50/50' : ''}>
                          <TableCell className="text-center">
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => handleStudentToggle(s)} 
                            />
                          </TableCell>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.age || '---'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {selectedStudents.length > 0 && (
              <div className="space-y-3 pt-2">
                <label className="text-sm font-bold text-slate-800">Cấu hình Học Phí (VND/Buổi)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedStudents.map(student => (
                    <div key={student.id} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border">
                      <span className="flex-1 text-sm font-medium truncate">{student.name}</span>
                      <Input 
                        type="number" 
                        value={student.fee} 
                        onChange={(e) => handleFeeChange(student.id, Number(e.target.value))} 
                        className="w-32 h-8"
                        min="0"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4">
               <Button onClick={() => {
                 if (!className) return alert('Vui lòng nhập tên lớp');
                 if (!tutorId) return alert('Vui lòng chọn gia sư');
                 setStep(2);
               }}>Tiếp tục Lên Lịch Dạy</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="animate-in fade-in slide-in-from-right-4">
          <CardHeader>
             <CardTitle>Bước 2: Lịch Dạy Cố Định</CardTitle>
             <CardDescription>Thiết lập lịch dạy cố định hàng tuần. Hệ thống sẽ tự kiểm tra trùng lịch của Gia sư.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bắt đầu học từ ngày</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Kết thúc ngày</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-4">
              {schedules.map((schedule, index) => (
                <div key={index} className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Ngày Trong Tuần</label>
                    <Select value={schedule.dayOfWeek} onValueChange={(val) => val && updateSchedule(index, 'dayOfWeek', val)}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 w-32">
                    <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Bắt Đầu</label>
                    <Input type="time" value={schedule.startTime} onChange={(e) => updateSchedule(index, 'startTime', e.target.value)} className="bg-white" />
                  </div>
                  <div className="space-y-1.5 w-32">
                    <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Kết Thúc</label>
                    <Input type="time" value={schedule.endTime} onChange={(e) => updateSchedule(index, 'endTime', e.target.value)} className="bg-white" />
                  </div>
                  <div className="pt-6">
                    <Button variant="ghost" size="icon" onClick={() => removeSchedule(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {schedules.length < 3 && (
                <Button variant="outline" type="button" onClick={addScheduleRow} className="w-full border-dashed border-2 py-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                  + Thêm Lịch Cố Định (Tối đa 3 buổi / tuần)
                </Button>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
               <Button variant="outline" onClick={() => setStep(1)} disabled={submitting}>Quay lại</Button>
               <Button onClick={checkConflictAndSubmit} disabled={submitting} className="min-w-[150px]">
                 {submitting ? 'Đang xử lý...' : 'Hoàn tất & Tạo Lớp'}
               </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
