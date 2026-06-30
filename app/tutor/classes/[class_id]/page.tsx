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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { MessageSquare } from 'lucide-react';

// L1 FIX: Tránh lỗi timezone khi parse chuỗi 'YYYY-MM-DD'
// new Date('2026-06-17') trả về UTC midnight → bị lệch múi giờ → sai thứ trong tuần
// parseLocalDate tạo Date theo giờ địa phương, không bị ảnh hưởng bởi GMT offset
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const formatLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TutorClassDetailPage() {
  const params = useParams();
  const classId = params.class_id as string;
  const router = useRouter();
  const supabase = createClient();
  
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tutorId, setTutorId] = useState<string>('');

  // Review modal state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewStudent, setReviewStudent] = useState<any>(null);
  const [reviewMonthYear, setReviewMonthYear] = useState(format(new Date(), 'yyyy-MM'));
  const [reviewGeneral, setReviewGeneral] = useState('');
  const [reviewAttitude, setReviewAttitude] = useState('');
  const [reviewLogical, setReviewLogical] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionStart, setNewSessionStart] = useState('18:00');
  const [newSessionEnd, setNewSessionEnd] = useState('19:30');

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
    setTutorId(tutorData.tutor_id);

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
         .eq('class_id', classId)
         .eq('status', 'active'), // Lỗi A FIX: Chỉ hiển thị học sinh đang học, ẩn học sinh đã nghỉ (dropped)
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

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewStudent || !reviewMonthYear) return;
    setSubmittingReview(true);
    
    try {
      const { error } = await supabase.from('student_reviews').insert([{
        student_id: reviewStudent.student_id,
        tutor_id: tutorId,
        class_id: classId,
        month_year: reviewMonthYear,
        general_assessment: reviewGeneral,
        learning_attitude: reviewAttitude,
        logical_thinking: reviewLogical
      }]);
      
      if (error) throw error;
      alert("Lưu nhận xét thành công!");
      setIsReviewModalOpen(false);
    } catch (err: any) {
      alert("Lỗi khi lưu nhận xét: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionDate || !newSessionStart || !newSessionEnd) return;
    
    const { error } = await supabase.from('sessions').insert([{
        class_id: classId,
        date: newSessionDate,
        start_time: newSessionStart,
        end_time: newSessionEnd,
        status: 'scheduled',
        csat_fee_snapshot: classData.csat_fee_per_session,
        tutor_id_snapshot: classData.tutor_id || tutorId
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

  const openBulkDelete = (s: any) => {
    setBulkDeleteSession(s);
    setBulkDelStart(s.date);
    setBulkDelEnd(s.date);
  };

  const handleBulkDelete = async () => {
    if(!bulkDelStart || !bulkDelEnd || !bulkDeleteSession) return;
    
    const parseLocalDate = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    };

    const dDate = parseLocalDate(bulkDeleteSession.date);
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
    
    const filteredToDelete = toDelete.filter(s => parseLocalDate(s.date).getDay() === dayOfWeek);

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
    fetchClassDetails();
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!bulkAddStart || !bulkAddEnd || !bulkAddStartTime || !bulkAddEndTime) return;
    
    const generatedSessions = [];
    // L1 FIX: Dùng parseLocalDate thay vì new Date(string) để tránh lệch timezone
    let curr = parseLocalDate(bulkAddStart);
    const end = parseLocalDate(bulkAddEnd);

    while(curr <= end) {
       if(curr.getDay().toString() === bulkAddDay) {
          generatedSessions.push({
             class_id: classId,
             date: formatLocalDate(curr), // dùng formatLocalDate thay vì format() của date-fns
             start_time: bulkAddStartTime,
             end_time: bulkAddEndTime,
             csat_fee_snapshot: classData?.csat_fee_per_session || 0,
             tutor_id_snapshot: classData?.tutor_id || tutorId,
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
       // Nếu ngày kết thúc bulk vượt quá ngày kết thúc lớp, tự động gia hạn
       if(parseLocalDate(bulkAddEnd) > parseLocalDate(classData.end_date)) {
           try {
             const { data: { user } } = await supabase.auth.getUser();
             if (user) {
                const { data: tutorData } = await supabase.from('tutors').select('tutor_id').eq('auth_uid', user.id).single();
                if (tutorData) {
                    await fetch('/api/tutor/classes/renew', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            class_id: classId,
                            tutor_id: tutorData.tutor_id,
                            new_end_date: bulkAddEnd
                        })
                    });
                }
             }
           } catch (e) {
               console.error('Failed to renew automatically', e);
           }
       }
       alert(`Đã tạo thành công ${generatedSessions.length} buổi học.`);
       setIsBulkAddOpen(false);
       fetchClassDetails();
    }
  };

  if (loading) return <div className="p-8">Đang tải dữ liệu...</div>;

  const isEndingOrEnded = classData && new Date(classData.end_date) <= new Date();

  return (
    <div className="space-y-6">
      {isEndingOrEnded && (
        <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded-lg flex flex-col sm:flex-row justify-between items-center shadow-sm">
           <div>
             <strong className="font-bold">Nhắc nhở: </strong>
             <span className="block sm:inline"> Lớp học này đã kết thúc thời gian dự kiến <strong>({format(new Date(classData.end_date), 'dd/MM/yyyy')})</strong>. Bạn có muốn gia hạn thêm?</span>
             <br/>
             <span className="text-sm opacity-80 mt-1 block">Bấm "Gia hạn" để tạo thêm lịch học các tuần tiếp theo. Hệ thống sẽ tự động cập nhật ngày kết thúc của lớp.</span>
           </div>
           <Button variant="outline" className="mt-3 sm:mt-0 border-amber-500 text-amber-700 bg-white hover:bg-amber-50 shrink-0" onClick={() => setIsBulkAddOpen(true)}>Gia hạn lớp học</Button>
        </div>
      )}
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
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="mt-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                  onClick={() => {
                                      setReviewStudent(st);
                                      setReviewGeneral('');
                                      setReviewAttitude('');
                                      setReviewLogical('');
                                      setReviewMonthYear(format(new Date(), 'yyyy-MM'));
                                      setIsReviewModalOpen(true);
                                  }}
                                >
                                  <MessageSquare className="w-3 h-3 mr-1" /> Nhận xét
                                </Button>
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
             <div className="flex gap-2">
               <Button size="sm" onClick={() => setIsAddSessionModalOpen(true)}><Plus className="w-4 h-4 mr-1"/> Buổi lẻ</Button>
               <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-600" onClick={() => setIsBulkAddOpen(true)}><CalendarIcon className="w-4 h-4 mr-1" /> Thêm loạt</Button>
             </div>
           </CardHeader>
           <CardContent>
               <div className="h-[400px] overflow-y-auto pr-2 space-y-3">
                   {sessions.map((sess) => (
                       <div key={sess.session_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                           <div>
                               <p className="font-semibold text-slate-800">{format(new Date(sess.date), 'dd/MM/yyyy')} <span className="text-xs font-normal text-slate-500">(Thứ {new Date(sess.date).getDay() === 0 ? 'CN' : new Date(sess.date).getDay() + 1})</span></p>
                               <p className="text-sm text-slate-500">{sess.start_time.substring(0,5)} - {sess.end_time.substring(0,5)}</p>
                           </div>
                           <div className="flex flex-wrap items-center gap-2">
                               <span className={`px-2 py-0.5 text-xs font-semibold rounded-sm ${sess.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                   {sess.status === 'completed' ? 'Đã dạy' : 'Chưa dạy'}
                               </span>
                               {sess.status === 'scheduled' && (
                                   <>
                                      <Button variant="outline" size="sm" className="h-8" onClick={() => openBulkDelete(sess)}>Xóa định kỳ</Button>
                                      <Button variant="destructive" size="sm" className="h-8 w-8 p-0" title="Hủy 1 buổi" onClick={() => handleDeleteSession(sess.session_id)}>
                                          <Trash2 className="w-4 h-4" />
                                      </Button>
                                   </>
                               )}
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
            {/* B5: Cảnh báo xung đột lịch */}
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ Lưu ý: Hãy kiểm tra không trùng lịch với các lớp khác bạn đang dạy.
            </div>
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

      {/* Bulk Delete Modal */}
      <Dialog open={!!bulkDeleteSession} onOpenChange={(open) => !open && setBulkDeleteSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa Loạt Buổi Học Định Kỳ</DialogTitle>
            <DialogDescription>
              Xóa tất cả các buổi học <strong>{bulkDeleteSession?.start_time.substring(0,5)} - {bulkDeleteSession?.end_time.substring(0,5)}</strong> cùng <strong>Thứ {bulkDeleteSession && new Date(parseInt(bulkDeleteSession.date.split('-')[0]), parseInt(bulkDeleteSession.date.split('-')[1]) - 1, parseInt(bulkDeleteSession.date.split('-')[2])).getDay() === 0 ? 'Chủ Nhật' : bulkDeleteSession && (new Date(parseInt(bulkDeleteSession.date.split('-')[0]), parseInt(bulkDeleteSession.date.split('-')[1]) - 1, parseInt(bulkDeleteSession.date.split('-')[2])).getDay() + 1)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 mt-2">
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="text-sm font-medium">Bắt đầu từ ngày</label>
                 <Input type="date" value={bulkDelStart} onChange={(e) => setBulkDelStart(e.target.value)} />
               </div>
               <div>
                 <label className="text-sm font-medium">Đến ngày</label>
                 <Input type="date" value={bulkDelEnd} onChange={(e) => setBulkDelEnd(e.target.value)} />
               </div>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setBulkDeleteSession(null)}>Hủy</Button>
             <Button variant="destructive" onClick={handleBulkDelete}>Xóa {bulkDeleteSession && new Date(parseInt(bulkDeleteSession.date.split('-')[0]), parseInt(bulkDeleteSession.date.split('-')[1]) - 1, parseInt(bulkDeleteSession.date.split('-')[2])).getDay() === 0 ? 'Chủ Nhật' : bulkDeleteSession && ('Thứ ' + (new Date(parseInt(bulkDeleteSession.date.split('-')[0]), parseInt(bulkDeleteSession.date.split('-')[1]) - 1, parseInt(bulkDeleteSession.date.split('-')[2])).getDay() + 1))} định kỳ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Bulk Add Modal */}
      <Dialog open={isBulkAddOpen} onOpenChange={setIsBulkAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm Loạt Buổi Học Định Kỳ</DialogTitle>
            <DialogDescription>
              Tạo hàng loạt buổi học theo lịch cố định hàng tuần.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkAdd} className="space-y-4 py-4">
            {/* B5: Cảnh báo xung đột lịch */}
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
              ⚠️ Lưu ý: Hãy kiểm tra không trùng lịch với các lớp khác bạn đang dạy trong khoảng thời gian này.
            </div>
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
                <Button type="submit">Tạo Lịch Định Kỳ</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nhận xét định kỳ: {reviewStudent?.name}</DialogTitle>
            <DialogDescription>
              Ghi nhận đánh giá của gia sư về tình hình học tập trong tháng.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitReview} className="space-y-4 py-4">
             <div>
               <label className="text-sm font-medium">Kỳ đánh giá (Tháng/Năm) <span className="text-red-500">*</span></label>
               <Input type="month" value={reviewMonthYear} onChange={(e) => setReviewMonthYear(e.target.value)} required />
             </div>
             <div>
               <label className="text-sm font-medium">Đánh giá chung</label>
               <textarea 
                 className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm min-h-[80px]"
                 value={reviewGeneral}
                 onChange={(e) => setReviewGeneral(e.target.value)}
                 placeholder="Tiến bộ tổng quan, mức độ hoàn thành bài tập..."
               />
             </div>
             <div>
               <label className="text-sm font-medium">Thái độ học tập</label>
               <textarea 
                 className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm min-h-[80px]"
                 value={reviewAttitude}
                 onChange={(e) => setReviewAttitude(e.target.value)}
                 placeholder="Chăm chỉ, tập trung, hay hỏi..."
               />
             </div>
             <div>
               <label className="text-sm font-medium">Tư duy logic / Giải quyết vấn đề</label>
               <textarea 
                 className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm min-h-[80px]"
                 value={reviewLogical}
                 onChange={(e) => setReviewLogical(e.target.value)}
                 placeholder="Khả năng phân tích bài toán, tư duy thuật toán..."
               />
             </div>
             <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsReviewModalOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={submittingReview}>
                   {submittingReview ? 'Đang lưu...' : 'Lưu Nhận Xét'}
                </Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
