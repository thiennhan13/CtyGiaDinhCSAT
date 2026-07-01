'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, User, Phone, MapPin, ExternalLink, Calendar, BookOpen, CreditCard, Clock, Activity, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { formatNumber, formatVND } from '@/lib/format';

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  
  const [student, setStudent] = useState<any>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudentDetails() {
      setLoading(true);
      
      // Fetch basic info
      const { data: stData } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .single();
        
      if (!stData) {
          alert("Không tìm thấy học sinh.");
          router.push('/admin/students');
          return;
      }
      setStudent(stData);

      // Fetch classes
      const { data: classData } = await supabase
        .from('class_students')
        .select('status, tuition_fee_per_session, classes(class_id, name, status, start_date, end_date, csat_fee_per_session, tutors(name))')
        .eq('student_id', studentId);
        
      if (classData) setEnrolledClasses(classData);

      // Fetch payments
      const { data: pData } = await supabase
        .from('payments')
        .select('*, classes(name)')
        .eq('student_id', studentId)
        .order('billing_period', { ascending: false });
        
      if (pData) setPayments(pData);

      // Fetch attendance
      const { data: attData } = await supabase
        .from('session_attendance')
        .select('status, notes, tuition_fee_snapshot, sessions(date, start_time, end_time, status, classes(name))')
        .eq('student_id', studentId)
        .order('sessions(date)', { ascending: false });
        
      if (attData) {
          // Sort descending by date
          const sortedAtt = attData.sort((a: any, b: any) => {
              const dateA = new Date((Array.isArray(a.sessions) ? a.sessions[0]?.date : a.sessions?.date) || 0).getTime();
              const dateB = new Date((Array.isArray(b.sessions) ? b.sessions[0]?.date : b.sessions?.date) || 0).getTime();
              return dateB - dateA;
          });
          setAttendance(sortedAtt);
      }

      // Fetch reviews
      const { data: revData } = await supabase
        .from('student_reviews')
        .select('*, tutors(name), classes(name)')
        .eq('student_id', studentId)
        .order('month_year', { ascending: false });
        
      if (revData) setReviews(revData);

      setLoading(false);
    }
    fetchStudentDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  async function handleMarkAsPaid(paymentId: string) {
    if (!confirm('Xác nhận đánh dấu Đã thu học phí cho hóa đơn này?')) return;
    try {
      const { error } = await supabase.from('payments').update({ status: 'paid' }).eq('payment_id', paymentId);
      if (error) throw error;
      alert('Đã cập nhật trạng thái thành công!');
      setPayments(prev => prev.map(p => p.payment_id === paymentId ? { ...p, status: 'paid' } : p));
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  const statusColor = (status: string) => {
    if (status === 'Đang học') return 'bg-green-100 text-green-700 hover:bg-green-100';
    if (status === 'Đã nghỉ') return 'bg-red-100 text-red-700 hover:bg-red-100';
    if (status === 'Tạm dừng') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
  }

  if (loading) {
      return <div className="p-8 text-center text-slate-500">Đang tải hồ sơ học sinh...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/admin/students')}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Hồ Sơ Học Sinh: {student?.name}</h2>
          <p className="text-sm text-slate-500 mt-1">ID: {student?.student_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cột trái: Thông tin cơ bản */}
          <div className="col-span-1 space-y-6">
             <Card>
                 <CardHeader>
                     <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-blue-500"/>Thông tin cá nhân</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                     <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                         <span className="text-slate-500">Trạng thái</span>
                         <Badge variant="secondary" className={statusColor(student?.status)}>{student?.status}</Badge>
                     </div>
                     <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                         <span className="text-slate-500">Tuổi</span>
                         <span className="font-medium text-slate-900">{student?.age || '---'}</span>
                     </div>
                     <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                         <span className="text-slate-500">Tỉnh/Thành</span>
                         <span className="font-medium text-slate-900 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400"/> {student?.province || '---'}</span>
                     </div>
                     <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
                         <span className="text-slate-500">SĐT Liên lạc</span>
                         <span className="font-medium text-slate-900 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400"/> {student?.contact_phone || '---'}</span>
                     </div>
                     <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
                         <span className="text-slate-500">Link liên lạc</span>
                         {student?.contact_link ? (
                             <a href={student?.contact_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                                 <ExternalLink className="h-3 w-3" /> Truy cập liên kết
                             </a>
                         ) : (
                             <span className="text-slate-900">---</span>
                         )}
                     </div>
                     <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
                         <span className="text-slate-500">Học phí mặc định</span>
                         <span className="font-bold text-emerald-600 text-lg">{formatNumber(student?.default_tuition_fee || 0)}đ/Buổi</span>
                     </div>
                     <div className="flex flex-col gap-1">
                         <span className="text-slate-500">Ghi chú</span>
                         <span className="text-slate-900 whitespace-pre-wrap text-sm">{student?.notes || '---'}</span>
                     </div>
                 </CardContent>
             </Card>
          </div>

          {/* Cột phải: Các Tabs (Lớp học, Lịch sử điểm danh, Lịch sử thanh toán) */}
          <div className="col-span-1 md:col-span-2">
             <Card className="h-full">
                 <CardContent className="p-0">
                    <Tabs defaultValue="attendance" className="w-full">
                        <TabsList className="w-full grid justify-start grid-cols-4 rounded-none border-b bg-transparent h-14 p-0">
                            <TabsTrigger value="attendance" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-14 data-[state=active]:shadow-none"><Activity className="w-4 h-4 mr-2"/>Điểm danh</TabsTrigger>
                            <TabsTrigger value="classes" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-14 data-[state=active]:shadow-none"><BookOpen className="w-4 h-4 mr-2"/>Lớp học</TabsTrigger>
                            <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-14 data-[state=active]:shadow-none"><CreditCard className="w-4 h-4 mr-2"/>Học phí</TabsTrigger>
                            <TabsTrigger value="reviews" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-14 data-[state=active]:shadow-none"><MessageSquare className="w-4 h-4 mr-2"/>Nhận xét</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="attendance" className="p-6 m-0 border-none outline-none">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold">Lịch sử điểm danh gần đây</h3>
                                {attendance.length === 0 ? (
                                    <p className="text-sm text-slate-500">Chưa có dữ liệu điểm danh.</p>
                                ) : (
                                    <div className="border rounded-lg overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead>Ngày học</TableHead>
                                                    <TableHead>Lớp</TableHead>
                                                    <TableHead>Trạng thái</TableHead>
                                                    <TableHead>Ghi chú</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {attendance.map((att, idx) => {
                                                    const sess = Array.isArray(att.sessions) ? att.sessions[0] : att.sessions;
                                                    const className = Array.isArray(sess?.classes) ? sess?.classes[0]?.name : sess?.classes?.name;
                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>
                                                                <div className="font-medium">{sess?.date ? format(new Date(sess.date), 'dd/MM/yyyy') : '---'}</div>
                                                                <div className="text-xs text-slate-500">{sess?.start_time?.substring(0,5)} - {sess?.end_time?.substring(0,5)}</div>
                                                            </TableCell>
                                                            <TableCell className="font-medium text-slate-700">{className}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={att.status === 'attended' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                                                                    {att.status === 'attended' ? 'Có mặt' : 'Vắng mặt'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-slate-600 text-sm max-w-[200px] truncate" title={att.notes}>{att.notes || '-'}</TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="classes" className="p-6 m-0 border-none outline-none">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold">Lớp đang theo học</h3>
                                {enrolledClasses.length === 0 ? (
                                    <p className="text-sm text-slate-500">Chưa tham gia lớp nào.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {enrolledClasses.map((c, idx) => {
                                            const classData = Array.isArray(c.classes) ? c.classes[0] : c.classes;
                                            const tutorName = Array.isArray(classData?.tutors) ? classData?.tutors[0]?.name : classData?.tutors?.name;
                                            return (
                                            <div key={idx} className="flex justify-between items-start p-4 border rounded-lg hover:border-blue-200 transition-colors bg-white">
                                                <div>
                                                    <h4 className="font-bold text-slate-900">{classData?.name}</h4>
                                                    <div className="text-sm text-slate-600 mt-1">Gia sư: <span className="font-medium">{tutorName || '---'}</span></div>
                                                    <div className="text-sm text-slate-500 flex items-center gap-2 mt-2">
                                                        <Badge variant="secondary" className={c.status === 'active' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'}>
                                                            {c.status === 'active' ? 'Đang học' : 'Đã ra khỏi lớp'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Học phí tại lớp</div>
                                                    <div className="font-bold text-emerald-600 mt-1">{formatNumber(c.tuition_fee_per_session)}đ/b</div>
                                                </div>
                                            </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="payments" className="p-6 m-0 border-none outline-none">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold">Lịch sử thanh toán</h3>
                                {payments.length === 0 ? (
                                    <p className="text-sm text-slate-500">Chưa có dữ liệu thanh toán.</p>
                                ) : (
                                    <div className="border rounded-lg overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead>Kỳ HĐ (Tháng)</TableHead>
                                                    <TableHead>Lớp</TableHead>
                                                    <TableHead>Trạng thái</TableHead>
                                                    <TableHead className="text-right">Số tiền</TableHead>
                                                    <TableHead className="text-right">Thao tác</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments.map((p, idx) => {
                                                    const className = Array.isArray(p.classes) ? p.classes[0]?.name : p.classes?.name;
                                                    return (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-medium text-slate-800">{p.billing_period}</TableCell>
                                                        <TableCell>{className || '---'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={p.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                                                                {p.status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-slate-900">
                                                            {formatVND(p.amount)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {p.status === 'unpaid' && (
                                                                <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => handleMarkAsPaid(p.payment_id)}>Đánh dấu Đã thu</Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="reviews" className="p-6 m-0 border-none outline-none">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold">Lịch sử Đánh giá Định kỳ</h3>
                                {reviews.length === 0 ? (
                                    <p className="text-sm text-slate-500">Chưa có nhận xét nào từ Gia sư.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {reviews.map((r, idx) => {
                                            const tutorName = Array.isArray(r.tutors) ? r.tutors[0]?.name : r.tutors?.name;
                                            const className = Array.isArray(r.classes) ? r.classes[0]?.name : r.classes?.name;
                                            return (
                                            <div key={idx} className="p-4 border rounded-lg bg-white space-y-3 shadow-sm">
                                                <div className="flex justify-between items-center pb-2 border-b">
                                                    <div>
                                                        <h4 className="font-bold text-indigo-700 text-lg">Kỳ đánh giá: {r.month_year}</h4>
                                                        <p className="text-sm text-slate-500">Gia sư: <span className="font-medium">{tutorName || '---'}</span> | Lớp: {className || '---'}</p>
                                                    </div>
                                                    <div className="text-sm text-slate-400">
                                                        {format(new Date(r.created_at), 'dd/MM/yyyy')}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="text-xs uppercase font-bold text-slate-500 mb-1">Đánh giá chung</h5>
                                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{r.general_assessment || '---'}</p>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs uppercase font-bold text-slate-500 mb-1">Thái độ học tập</h5>
                                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{r.learning_attitude || '---'}</p>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <h5 className="text-xs uppercase font-bold text-slate-500 mb-1">Tư duy logic / Giải quyết vấn đề</h5>
                                                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{r.logical_thinking || '---'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                 </CardContent>
             </Card>
          </div>
      </div>
    </div>
  );
}
