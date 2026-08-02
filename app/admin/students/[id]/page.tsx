'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, User, Phone, MapPin, ExternalLink, Calendar, BookOpen, CreditCard, Clock, Activity, MessageSquare, Users } from 'lucide-react';
import { format } from 'date-fns';
import { formatNumber, formatVND } from '@/lib/format';
import { useAlert, useConfirm } from '@/components/ui/use-dialog';

/** Tính tuổi từ date_of_birth */
function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  const age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  return (m < 0 || (m === 0 && today.getDate() < birth.getDate())) ? age - 1 : age;
}

/** Hiển thị liên lạc: link → <a>, số điện thoại/text → text */
function ContactDetail({ value, fallbackText }: { value: string | null; fallbackText?: string }) {
  if (!value) return <span className="text-muted-foreground/70">{fallbackText || '---'}</span>;
  const isLink = value.startsWith('http://') || value.startsWith('https://');
  if (isLink) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center gap-1 font-medium">
        <ExternalLink className="h-3 w-3" /> Truy cập liên kết
      </a>
    );
  }
  return (
    <span className="font-medium text-foreground flex items-center gap-1">
      <Phone className="w-3 h-3 text-muted-foreground/70" /> {value}
    </span>
  );
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  const { alert: showAlert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();
  
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
          await showAlert({ title: 'Không tìm thấy', description: 'Không tìm thấy học sinh.', variant: 'error' });
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
    const ok = await confirm({
      title: 'Xác nhận đã thu học phí?',
      description: 'Đánh dấu hóa đơn này là Đã thu.',
      confirmText: 'Xác nhận',
    });
    if (!ok) return;
    try {
      const { error } = await supabase.from('payments').update({ status: 'paid' }).eq('payment_id', paymentId);
      if (error) throw error;
      await showAlert({ title: 'Cập nhật thành công', description: 'Trạng thái đã được cập nhật.', variant: 'success' });
      setPayments(prev => prev.map(p => p.payment_id === paymentId ? { ...p, status: 'paid' } : p));
    } catch (err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    }
  }

  const statusColor = (status: string) => {
    if (status === 'Đang học') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
    if (status === 'Đã nghỉ') return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20';
    if (status === 'Tạm dừng') return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
    return 'bg-secondary text-foreground';
  }

  if (loading) {
      return <div className="p-8 text-center text-muted-foreground">Đang tải hồ sơ học sinh...</div>;
  }

  return (
    <div className="space-y-6">
      <AlertDialog />
      <ConfirmDialog />
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.push('/admin/students')}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Hồ Sơ Học Sinh: {student?.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">ID: {student?.student_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cột trái: Thông tin cơ bản */}
          <div className="col-span-1 space-y-6">
                 <Card>
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2"><User className="w-5 h-5 text-primary"/>Thông tin cá nhân</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                         {/* Trạng thái */}
                         <div className="flex justify-between items-center pb-3 border-b border-border/60">
                             <span className="text-muted-foreground">Trạng thái</span>
                             <Badge variant="secondary" className={statusColor(student?.status)}>{student?.status}</Badge>
                         </div>

                         {/* Ngày sinh / Tuổi */}
                         <div className="flex justify-between items-center pb-3 border-b border-border/60">
                             <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Ngày sinh</span>
                             <span className="font-medium text-foreground text-right">
                               {student?.date_of_birth
                                 ? (() => {
                                     const [y, m, d] = student.date_of_birth.split('-');
                                     const age = calcAge(student.date_of_birth);
                                     return <>{d}/{m}/{y}{age != null ? <span className="text-muted-foreground/70 text-xs ml-1">({age} tuổi)</span> : null}</>;
                                   })()
                                 : (student?.old_age ? `${student.old_age} tuổi` : '---')
                               }
                             </span>
                         </div>

                         {/* Tỉnh/Thành */}
                         <div className="flex justify-between items-center pb-3 border-b border-border/60">
                             <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Tỉnh/Thành</span>
                             <span className="font-medium text-foreground">{student?.province || '---'}</span>
                         </div>

                         {/* Liên lạc học sinh */}
                         <div className="flex flex-col gap-1 pb-3 border-b border-border/60">
                             <span className="text-muted-foreground">Liên lạc học sinh</span>
                             <ContactDetail value={student?.student_contact} />
                         </div>

                         {/* Liên lạc phụ huynh */}
                         <div className="flex flex-col gap-1 pb-3 border-b border-border/60">
                             <span className="text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Liên lạc phụ huynh</span>
                             <span className="font-medium text-foreground">{student?.parent_name || '---'}</span>
                             {student?.parent_number && <ContactDetail value={student?.parent_number} />}
                             {student?.parent_link && <ContactDetail value={student?.parent_link} />}
                             {!student?.parent_number && !student?.parent_link && <span className="text-sm font-medium">---</span>}
                         </div>

                         {/* Ghi chú */}
                         <div className="flex flex-col gap-1">
                             <span className="text-muted-foreground">Ghi chú</span>
                             <span className="text-foreground whitespace-pre-wrap text-sm">{student?.notes || '---'}</span>
                         </div>
                     </CardContent>
                 </Card>
          </div>

          {/* Cột phải: Các Tabs */}
          <div className="col-span-1 md:col-span-2">
             <Card className="h-full">
                 <CardContent className="p-0">
                    <Tabs defaultValue="attendance" className="w-full">
                        <TabsList className="w-full grid justify-start grid-cols-4 rounded-none border-b bg-transparent h-14 p-0">
                            <TabsTrigger value="attendance" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-14 data-[state=active]:shadow-none"><Activity className="w-4 h-4 mr-2"/>Điểm danh</TabsTrigger>
                            <TabsTrigger value="classes" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-14 data-[state=active]:shadow-none"><BookOpen className="w-4 h-4 mr-2"/>Lớp học</TabsTrigger>
                            <TabsTrigger value="payments" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-14 data-[state=active]:shadow-none"><CreditCard className="w-4 h-4 mr-2"/>Học phí</TabsTrigger>
                            <TabsTrigger value="reviews" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-14 data-[state=active]:shadow-none"><MessageSquare className="w-4 h-4 mr-2"/>Nhận xét</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="attendance" className="p-6 m-0 border-none outline-none">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold">Lịch sử điểm danh gần đây</h3>
                                {attendance.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu điểm danh.</p>
                                ) : (
                                    <div className="border border-border rounded-lg overflow-x-auto pb-2">
                                        <Table>
                                            <TableHeader className="bg-secondary/50">
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
                                                                <div className="text-xs text-muted-foreground">{sess?.start_time?.substring(0,5)} - {sess?.end_time?.substring(0,5)}</div>
                                                            </TableCell>
                                                            <TableCell className="font-medium text-foreground">{className}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={att.status === 'attended' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}>
                                                                    {att.status === 'attended' ? 'Có mặt' : 'Vắng mặt'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate" title={att.notes}>{att.notes || '-'}</TableCell>
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
                                    <p className="text-sm text-muted-foreground">Chưa tham gia lớp nào.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {enrolledClasses.map((c, idx) => {
                                            const classData = Array.isArray(c.classes) ? c.classes[0] : c.classes;
                                            const tutorName = Array.isArray(classData?.tutors) ? classData?.tutors[0]?.name : classData?.tutors?.name;
                                            return (
                                            <div key={idx} className="flex justify-between items-start p-4 border border-border rounded-lg hover:border-primary/30 transition-colors bg-card">
                                                <div>
                                                    <h4 className="font-bold text-foreground">{classData?.name}</h4>
                                                    <div className="text-sm text-muted-foreground mt-1">Gia sư: <span className="font-medium">{tutorName || '---'}</span></div>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                                                        <Badge variant="secondary" className={c.status === 'active' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-foreground'}>
                                                            {c.status === 'active' ? 'Đang học' : 'Đã ra khỏi lớp'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Học phí tại lớp</div>
                                                    <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatNumber(c.tuition_fee_per_session)}đ/b</div>
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
                                    <p className="text-sm text-muted-foreground">Chưa có dữ liệu thanh toán.</p>
                                ) : (
                                    <div className="border border-border rounded-lg overflow-x-auto pb-2">
                                        <Table>
                                            <TableHeader className="bg-secondary/50">
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
                                                        <TableCell className="font-medium text-foreground">{p.billing_period}</TableCell>
                                                        <TableCell>{className || '---'}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'}>
                                                                {p.status === 'paid' ? 'Đã thu' : 'Chưa thu'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold text-foreground">
                                                            {formatVND(p.amount)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {p.status === 'unpaid' && (
                                                                <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleMarkAsPaid(p.payment_id)}>Đánh dấu Đã thu</Button>
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
                                    <p className="text-sm text-muted-foreground">Chưa có nhận xét nào từ Gia sư.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {reviews.map((r, idx) => {
                                            const tutorName = Array.isArray(r.tutors) ? r.tutors[0]?.name : r.tutors?.name;
                                            const className = Array.isArray(r.classes) ? r.classes[0]?.name : r.classes?.name;
                                            return (
                                            <div key={idx} className="p-4 border border-border rounded-lg bg-card space-y-3 shadow-sm">
                                                <div className="flex justify-between items-center pb-2 border-b">
                                                    <div>
                                                        <h4 className="font-bold text-primary text-lg">Kỳ đánh giá: {r.month_year}</h4>
                                                        <p className="text-sm text-muted-foreground">Gia sư: <span className="font-medium">{tutorName || '---'}</span> | Lớp: {className || '---'}</p>
                                                    </div>
                                                    <div className="text-sm text-muted-foreground/70">
                                                        {format(new Date(r.created_at), 'dd/MM/yyyy')}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="text-xs uppercase font-bold text-muted-foreground mb-1">Đánh giá chung</h5>
                                                        <p className="text-sm text-foreground whitespace-pre-wrap">{r.general_assessment || '---'}</p>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs uppercase font-bold text-muted-foreground mb-1">Thái độ học tập</h5>
                                                        <p className="text-sm text-foreground whitespace-pre-wrap">{r.learning_attitude || '---'}</p>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <h5 className="text-xs uppercase font-bold text-muted-foreground mb-1">Tư duy logic / Giải quyết vấn đề</h5>
                                                        <p className="text-sm text-foreground whitespace-pre-wrap">{r.logical_thinking || '---'}</p>
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
