'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

export default function ClassDetailPage() {
  const params = useParams() as { id: string };
  const classId = params.id;

  const [classInfo, setClassInfo] = useState<any>(null);
  const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // assign student form
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [tuitionFee, setTuitionFee] = useState('100000'); // 100k
  
  // session form
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('20:00');

  const supabase = createClient();

  async function fetchData() {
    setLoading(true);
    const { data: cls } = await supabase.from('classes').select('*, tutors(name)').eq('class_id', classId).single();
    if (cls) setClassInfo(cls);

    const { data: classStds } = await supabase.from('class_students').select('*, students(name)').eq('class_id', classId);
    if (classStds) setStudentsInClass(classStds);

    const { data: stds } = await supabase.from('students').select('*').eq('is_deleted', false);
    if (stds) setAllStudents(stds);

    const { data: sessions } = await supabase.from('sessions').select('*').eq('class_id', classId).order('date', { ascending: false });
    if (sessions) setClassSessions(sessions);

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
    const { error } = await supabase.from('class_students').insert([
       { class_id: classId, student_id: selectedStudentId, tuition_fee_per_session: fee }
    ]);
    if (!error) {
       setSelectedStudentId('');
       setTuitionFee('100000');
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
         csat_fee_snapshot: classInfo?.csat_fee_per_session || 0
       }
    ]);
    
    if (!error) {
       alert('Tạo buổi học thành công');
       setSessionDate('');
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

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900">
        Chi tiết lớp: {classInfo?.name}
      </h2>
      <p className="text-gray-500">Gia sư phụ trách: {classInfo?.tutors?.name}</p>
      
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
                  {allStudents.filter(s => !studentsInClass.find(cs => cs.student_id === s.student_id)).map(s => (
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
             <CardTitle>Tạo Buổi Học Đột Xuất / Dạy Bù</CardTitle>
             <CardDescription>Buổi học này sẽ ngay lập tức được thêm vào lịch của Gia sư.</CardDescription>
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
               <Button type="submit" variant="secondary" className="w-full">Tạo Buổi Học</Button>
             </form>
           </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Học Sinh Trong Lớp ({studentsInClass.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
             <TableHeader>
               <TableRow>
                 <TableHead>Mã HS</TableHead>
                 <TableHead>Tên Học Sinh</TableHead>
                 <TableHead>Học Phí / Buổi</TableHead>
                 <TableHead>Trạng Thái</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
                {studentsInClass.map(cs => (
                  <TableRow key={cs.student_id}>
                     <TableCell className="font-mono text-xs">{cs.student_id.split('-')[0]}</TableCell>
                     <TableCell className="font-medium">{cs.students?.name}</TableCell>
                     <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cs.tuition_fee_per_session)}</TableCell>
                     <TableCell>{cs.status}</TableCell>
                  </TableRow>
                ))}
                {studentsInClass.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center py-4">Lớp chưa có học sinh</TableCell>
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
                 <TableHead>Trạng Thái</TableHead>
                 <TableHead className="text-right">Action</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
                {classSessions.map(s => (
                  <TableRow key={s.session_id}>
                    <TableCell>{s.date}</TableCell>
                    <TableCell>{s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</TableCell>
                    <TableCell>
                      {s.status === 'scheduled' && <span className="text-blue-500 font-medium">Sắp tới</span>}
                      {s.status === 'completed' && <span className="text-green-500 font-medium">Đã dạy</span>}
                      {s.status === 'cancelled' && <span className="text-red-500 font-medium">Đã hủy</span>}
                    </TableCell>
                    <TableCell className="text-right">
                       {s.status === 'scheduled' && (
                          <Button variant="destructive" size="sm" onClick={() => handleCancelSession(s.session_id)}>Hủy</Button>
                       )}
                    </TableCell>
                  </TableRow>
                ))}
                {classSessions.length === 0 && (
                   <TableRow>
                     <TableCell colSpan={4} className="text-center py-4">Chưa có buổi học nào</TableCell>
                   </TableRow>
                )}
             </TableBody>
           </Table>
        </CardContent>
      </Card>
    </div>
  );
}
