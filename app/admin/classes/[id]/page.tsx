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
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

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

  // bulk delete state
  const [bulkDeleteSession, setBulkDeleteSession] = useState<any>(null);
  const [bulkDelStart, setBulkDelStart] = useState('');
  const [bulkDelEnd, setBulkDelEnd] = useState('');

  // bulk add state
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [bulkAddStart, setBulkAddStart] = useState('');
  const [bulkAddEnd, setBulkAddEnd] = useState('');
  const [bulkAddDay, setBulkAddDay] = useState('1'); 
  const [bulkAddStartTime, setBulkAddStartTime] = useState('18:00');
  const [bulkAddEndTime, setBulkAddEndTime] = useState('20:00');

  const supabase = createClient();

  async function fetchData() {
    setLoading(true);
    const { data: cls } = await supabase.from('classes').select('*, tutors(name)').eq('class_id', classId).single();
    if (cls) setClassInfo(cls);

    const { data: classStds } = await supabase.from('class_students').select('*, students(name)').eq('class_id', classId).eq('status', 'active');
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
    if (!confirm('Xóa học sinh này khỏi lớp?')) return;
    const { error } = await supabase.from('class_students').update({ status: 'inactive' }).eq('class_id', classId).eq('student_id', studentId);
    if (!error) {
      alert('Đã xóa học sinh khỏi lớp');
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

  const openBulkDelete = (s: any) => {
    setBulkDeleteSession(s);
    setBulkDelStart(s.date);
    setBulkDelEnd(s.date);
  };

  const handleBulkDelete = async () => {
    if(!bulkDelStart || !bulkDelEnd || !bulkDeleteSession) return;
    
    const dDate = new Date(bulkDeleteSession.date);
    const dayOfWeek = dDate.getDay();

    const { data: toDelete } = await supabase.from('sessions')
      .select('session_id, date')
      .eq('class_id', classId)
      .eq('start_time', bulkDeleteSession.start_time)
      .eq('end_time', bulkDeleteSession.end_time)
      .gte('date', bulkDelStart)
      .lte('date', bulkDelEnd)
      .eq('status', 'scheduled');

    if(!toDelete || toDelete.length === 0) {
      alert("Không tìm thấy buổi học nào phù hợp để xóa.");
      return;
    }
    
    const filteredToDelete = toDelete.filter(s => new Date(s.date).getDay() === dayOfWeek);

    if(filteredToDelete.length === 0) {
       alert("Không tìm thấy buổi học nào phù hợp để xóa.");
       return;
    }

    if(!confirm(`Tìm thấy ${filteredToDelete.length} buổi học. Bạn có chắc muốn xóa tất cả?`)) return;

    for(const s of filteredToDelete) {
       await supabase.from('sessions').delete().eq('session_id', s.session_id);
    }
    alert("Đã xóa loạt buổi học.");
    setBulkDeleteSession(null);
    fetchData();
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!bulkAddStart || !bulkAddEnd || !bulkAddStartTime || !bulkAddEndTime) return;
    
    const generatedSessions = [];
    let curr = new Date(bulkAddStart);
    const end = new Date(bulkAddEnd);

    while(curr <= end) {
       if(curr.getDay().toString() === bulkAddDay) {
          generatedSessions.push({
             class_id: classId,
             date: format(curr, 'yyyy-MM-dd'),
             start_time: bulkAddStartTime,
             end_time: bulkAddEndTime,
             csat_fee_snapshot: classInfo?.csat_fee_per_session || 0,
             status: 'scheduled'
          });
       }
       curr.setDate(curr.getDate() + 1);
    }
    
    if(generatedSessions.length === 0) {
       alert("Không có buổi học nào được tạo trong khoảng thời gian này.");
       return;
    }

    const { error } = await supabase.from('sessions').insert(generatedSessions);
    if(error) {
       alert("Lỗi: " + error.message);
    } else {
       alert(`Đã tạo thành công ${generatedSessions.length} buổi học.`);
       setIsBulkAddOpen(false);
       fetchData();
    }
  };

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
               <div className="flex gap-2">
                 <Button type="submit" variant="secondary" className="w-full">Tạo Buổi Lẻ</Button>
                 <Button type="button" variant="outline" className="w-full" onClick={() => setIsBulkAddOpen(true)}>Thêm Loạt Buổi</Button>
               </div>
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
                 <TableHead className="text-right">Action</TableHead>
               </TableRow>
             </TableHeader>
             <TableBody>
                {studentsInClass.map(cs => (
                  <TableRow key={cs.student_id}>
                     <TableCell className="font-mono text-xs">{cs.student_id.split('-')[0]}</TableCell>
                     <TableCell className="font-medium">{cs.students?.name}</TableCell>
                     <TableCell>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cs.tuition_fee_per_session)}</TableCell>
                     <TableCell>{cs.status}</TableCell>
                     <TableCell className="text-right">
                       <Button variant="ghost" size="sm" onClick={() => handleRemoveStudent(cs.student_id)} className="text-red-500 hover:text-red-700">
                         <Trash2 className="w-4 h-4 mr-1" /> Xóa
                       </Button>
                     </TableCell>
                  </TableRow>
                ))}
                {studentsInClass.length === 0 && (
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
                    <TableCell className="text-right space-x-2">
                       {s.status === 'scheduled' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => openBulkDelete(s)}>Xóa loạt</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleCancelSession(s.session_id)}>Hủy lẻ</Button>
                          </>
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

      {/* Bulk Delete Modal */}
      <Dialog open={!!bulkDeleteSession} onOpenChange={(open) => !open && setBulkDeleteSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa Loạt Buổi Học</DialogTitle>
            <DialogDescription>
              Xóa tất cả các buổi học <strong>{bulkDeleteSession?.start_time.substring(0,5)} - {bulkDeleteSession?.end_time.substring(0,5)}</strong> cùng <strong>Thứ {bulkDeleteSession && new Date(bulkDeleteSession.date).getDay() === 0 ? 'Chủ Nhật' : bulkDeleteSession && (new Date(bulkDeleteSession.date).getDay() + 1)}</strong> trong khoảng thời gian diễn ra từ:
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
          <DialogFooter>
             <Button variant="outline" onClick={() => setBulkDeleteSession(null)}>Đóng</Button>
             <Button variant="destructive" onClick={handleBulkDelete}>Xóa loạt ngay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Add Modal */}
      <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Loạt Buổi Học Cố Định</DialogTitle>
            <DialogDescription>
              Tạo hàng loạt buổi học theo lịch cố định hàng tuần.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkAdd} className="space-y-4 py-4">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium">Từ ngày (Bắt đầu)</label>
                 <Input type="date" value={bulkAddStart} onChange={(e) => setBulkAddStart(e.target.value)} required />
               </div>
               <div>
                 <label className="text-sm font-medium">Đến ngày (Kết thúc)</label>
                 <Input type="date" value={bulkAddEnd} onChange={(e) => setBulkAddEnd(e.target.value)} required />
               </div>
             </div>
             
             <div>
               <label className="text-sm font-medium">Ngày Trong Tuần</label>
               <Select value={bulkAddDay} onValueChange={(val) => setBulkAddDay(val || '1')}>
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

             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium">Khung Giờ Bắt Đầu</label>
                 <Input type="time" value={bulkAddStartTime} onChange={(e) => setBulkAddStartTime(e.target.value)} required />
               </div>
               <div>
                 <label className="text-sm font-medium">Khung Giờ Kết Thúc</label>
                 <Input type="time" value={bulkAddEndTime} onChange={(e) => setBulkAddEndTime(e.target.value)} required />
               </div>
             </div>
             
             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsBulkAddOpen(false)}>Hủy</Button>
                <Button type="submit">Tạo Lịch</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
