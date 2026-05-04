'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, ArrowLeft, Calendar as CalendarIcon, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function TutorClassDetailPage() {
  const params = useParams();
  const classId = params.class_id as string;
  const router = useRouter();
  const supabase = createClient();
  
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('18:00');
  const [newSessionEnd, setNewSessionEnd] = useState('19:30');

  async function fetchClassDetails() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;

    // Verify ownership
    const { data: tutorData } = await supabase
      .from('tutors')
      .select('tutor_id')
      .eq('auth_uid', userData.user.id)
      .single();

    if (!tutorData) {
        setLoading(false);
        return;
    }

    const { data: cData } = await supabase
      .from('classes')
      .select('*')
      .eq('class_id', classId)
      .eq('tutor_id', tutorData.tutor_id)
      .single();
    
    if (!cData) {
        alert("Không tìm thấy lớp học hoặc không có quyền truy cập.");
        router.push('/tutor/classes');
        return;
    }
    setClassData(cData);

    const [{ data: sData }, { data: sessData }] = await Promise.all([
       supabase
         .from('class_students')
         .select('tuition_fee_per_session, students(student_id, name, contact_phone, contact_link)')
         .eq('class_id', classId),
       supabase
         .from('sessions')
         .select('*')
         .eq('class_id', classId)
         .order('date', { ascending: false })
    ]);

    if (sData) setStudents(sData);
    if (sessData) setSessions(sessData);

    setLoading(false);
  }

  useEffect(() => {
    fetchClassDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionDate || !newSessionStart || !newSessionEnd) return;
    
    const { error } = await supabase.from('sessions').insert([{
        class_id: classId,
        date: newSessionDate,
        start_time: newSessionStart,
        end_time: newSessionEnd,
        status: 'scheduled',
        csat_fee_snapshot: classData.csat_fee_per_session
    }]);

    if (error) {
        alert("Lỗi tạo buổi học: " + error.message);
    } else {
        setIsAddSessionModalOpen(false);
        fetchClassDetails();
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Hành động này sẽ XÓA VĨNH VIỄN buổi học này. Bạn có chắc chắn không?')) return;
    
    const { error } = await supabase.from('sessions').delete().eq('session_id', sessionId);
    if (error) {
        alert("Lỗi xóa buổi học: " + error.message);
    } else {
        fetchClassDetails();
    }
  };

  if (loading) return <div className="p-8">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/tutor/classes')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
             <h2 className="text-2xl font-bold tracking-tight text-slate-900">{classData?.name}</h2>
             <p className="text-slate-500 text-sm mt-1">Phí cố định của trung tâm: {new Intl.NumberFormat('vi-VN').format(classData?.csat_fee_per_session || 0)} VND/Buổi</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Thông tin học viên */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-indigo-500"/>Danh Sách Học Sinh</CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
                {students.map((assoc, idx) => {
                    const st = assoc.students;
                    return (
                        <div key={st.student_id} className="flex justify-between items-center p-3 border rounded-lg bg-slate-50">
                            <div>
                                <p className="font-semibold">{st.name}</p>
                                <p className="text-xs text-slate-500">SĐT: {st.contact_phone || '---'}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-emerald-600">Học phí: {new Intl.NumberFormat('vi-VN').format(assoc.tuition_fee_per_session)}đ/b</p>
                            </div>
                        </div>
                    )
                })}
                {students.length === 0 && <p className="text-slate-500 text-sm">Chưa có học sinh nào.</p>}
             </div>
           </CardContent>
         </Card>

         {/* Thông tin buổi học */}
         <Card>
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-indigo-500"/>Lịch Dạy & Buổi Học</CardTitle>
             <Button size="sm" onClick={() => setIsAddSessionModalOpen(true)}><Plus className="w-4 h-4 mr-1"/> Thêm Buổi Tăng Cường</Button>
           </CardHeader>
           <CardContent>
               <div className="h-[400px] overflow-y-auto pr-2 space-y-3">
                   {sessions.map((sess) => (
                       <div key={sess.session_id} className="flex items-center justify-between p-3 border rounded-lg">
                           <div>
                               <p className="font-semibold text-slate-800">{format(new Date(sess.date), 'dd/MM/yyyy')}</p>
                               <p className="text-sm text-slate-500">{sess.start_time.substring(0,5)} - {sess.end_time.substring(0,5)}</p>
                           </div>
                           <div className="flex items-center gap-3">
                               <span className={`px-2 py-0.5 text-xs font-semibold rounded-sm ${sess.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                   {sess.status === 'completed' ? 'Đã dạy' : 'Chưa dạy'}
                               </span>
                               <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 h-8 w-8" onClick={() => handleDeleteSession(sess.session_id)} disabled={sess.status === 'completed'}>
                                   <Trash2 className="w-4 h-4" />
                               </Button>
                           </div>
                       </div>
                   ))}
                   {sessions.length === 0 && <p className="text-slate-500 text-sm mt-4">Chưa có lịch dạy nào.</p>}
               </div>
           </CardContent>
         </Card>
      </div>

       <Dialog open={isAddSessionModalOpen} onOpenChange={setIsAddSessionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Buổi Học (Tăng cường / Bù / Tự tạo)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSession} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ngày dạy <span className="text-red-500">*</span></label>
              <Input type="date" value={newSessionDate} onChange={(e) => setNewSessionDate(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Từ giờ <span className="text-red-500">*</span></label>
                  <Input type="time" value={newSessionStart} onChange={(e) => setNewSessionStart(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Đến giờ <span className="text-red-500">*</span></label>
                  <Input type="time" value={newSessionEnd} onChange={(e) => setNewSessionEnd(e.target.value)} required />
                </div>
            </div>
            <DialogFooter className="pt-4">
               <Button type="button" variant="outline" onClick={() => setIsAddSessionModalOpen(false)}>Hủy</Button>
               <Button type="submit">Lưu buổi học</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
