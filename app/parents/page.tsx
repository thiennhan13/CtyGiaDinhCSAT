import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/service';
import { readLookupHash } from '@/lib/parent-lookup';
import { z } from 'zod';
import type { ParentPortalData } from '@/lib/parents';
import { CsatNavbar } from '@/components/layout/CsatNavbar';
import { CsatBackground } from '@/components/CsatBackground';
import { Phone, MapPin, User, Calendar, ExternalLink, MessageSquare, AlertCircle, Star, Brain, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { ParentLogoutButton } from './logout-button';

export const dynamic = 'force-dynamic';

export default async function ParentPortal({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const hash = await readLookupHash();
  if (!hash) redirect('/login');
  const supabase = createAdminClient();
  const { student: requestedStudent } = await searchParams;
  if (requestedStudent && !z.string().uuid().safeParse(requestedStudent).success) redirect('/parents');
  const { data, error } = await supabase.rpc('get_parent_lookup', { p_token_hash: hash, p_student_id: requestedStudent || null });
  if (error) {
    if (error.code !== '42501') throw new Error('Không tải được cổng phụ huynh.');
    return <ParentAccessMessage message="Phiên tra cứu đã hết hạn, hồ sơ bị khóa hoặc học sinh không còn được liên kết. Hãy đóng tra cứu rồi nhập lại số điện thoại; liên hệ CSAT nếu cần hỗ trợ." />;
  }
  const portal = data as ParentPortalData;
  if (!portal?.student) return <ParentAccessMessage message="Số điện thoại chưa được liên kết với học sinh đang được quản lý. Vui lòng liên hệ CSAT để kiểm tra." />;
  const { student, students, reviews, enrolledClasses, attendanceCount } = portal;
  const phone = portal.parent.phone;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <CsatBackground />
      <CsatNavbar variant="guest" />

      <main className="relative z-10 max-w-5xl mx-auto px-4 pt-24 pb-12">
        {/* HERO SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 mt-4">
          <div>
            <h1 className="font-heading font-black text-3xl md:text-4xl text-foreground tracking-tight mb-2">
              Xin chào Phụ huynh <span className="text-primary">{student.parent_name || phone}</span>
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Đây là trang theo dõi tình hình học tập của học sinh tại trung tâm CSAT.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <a
              href="https://csatoj.vn/users/"
              target="_blank"
              rel="noopener noreferrer"
              className="csat-btn csat-btn--primary no-underline text-sm shadow-neo"
            >
              Bảng xếp hạng CSATOJ
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </a>
            <ParentLogoutButton />
          </div>
        </div>

        {students.length > 1 && (
          <nav aria-label="Chọn học sinh" className="flex flex-wrap gap-3 mb-6">
            {students.map(child => <Link key={child.student_id} href={'/parents?student=' + child.student_id}
              aria-current={child.student_id === student.student_id ? 'page' : undefined}
              className={'csat-btn text-sm ' + (child.student_id === student.student_id ? 'csat-btn--primary' : '')}>{child.name}</Link>)}
          </nav>
        )}

        {/* STUDENT INFO & REVIEWS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Cột trái: Thông tin học sinh */}
          <div className="md:col-span-1 space-y-6">
            <div className="csat-card bg-card p-6 border-2 border-foreground rounded-2xl shadow-neo relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
              <h2 className="font-heading font-bold text-xl mb-5 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Thông tin Học sinh
              </h2>
              
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wider">Họ và tên</div>
                  <div className="font-bold text-base text-foreground">{student.name}</div>
                </div>
                
                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-muted-foreground text-xs font-semibold">SĐT Phụ huynh</div>
                    <div className="font-medium">{student.parent_number || 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-muted-foreground text-xs font-semibold">Ngày sinh</div>
                    <div className="font-medium">{student.date_of_birth || 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-muted-foreground text-xs font-semibold">Tỉnh thành phố</div>
                    <div className="font-medium">{student.province || 'N/A'}</div>
                  </div>
                </div>
                
                <div className="pt-4 mt-2 border-t border-border">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-600 border border-green-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Trạng thái: {student.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Thông tin Lớp học */}
            {enrolledClasses && enrolledClasses.length > 0 && (
              <div className="csat-card bg-card p-6 border-2 border-foreground rounded-2xl shadow-neo relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                <h2 className="font-heading font-bold text-xl mb-5 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  Thông tin Lớp học
                </h2>
                
                <div className="space-y-5">
                  {enrolledClasses.map((clsItem) => {
                    const cls = clsItem.classes;
                    if (!cls) return null;
                    
                    const tutorName = cls.tutors?.name;

                    return (
                      <div key={clsItem.class_id} className="pb-4 border-b border-border last:border-0 last:pb-0">
                        <div className="font-bold text-base text-foreground mb-1">{cls.name}</div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                            {cls.class_type || 'Lớp học'}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent text-foreground border border-border">
                            Trạng thái: {cls.status || 'N/A'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2.5">
                            <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div>
                              <div className="text-muted-foreground text-xs font-semibold">Gia sư phụ trách</div>
                              <div className="font-medium">{tutorName || 'N/A'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-4 mt-2 border-t border-border flex items-start gap-2.5">
                    <Calendar className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-muted-foreground text-xs font-semibold">Tổng số buổi đã học</div>
                      <div className="font-bold text-emerald-600">{attendanceCount || 0} buổi</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="csat-card bg-card p-5 border border-border rounded-xl">
              <h3 className="font-bold text-sm mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Hỗ trợ
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                Nếu thông tin chưa chính xác hoặc cần trao đổi thêm, vui lòng liên hệ trung tâm.
              </p>
              <Link href="https://facebook.com/csat.tutor" target="_blank" className="text-xs font-bold text-primary hover:underline">
                Liên hệ Zalo / Facebook &rarr;
              </Link>
            </div>
          </div>

          {/* Cột phải: Nhận xét từ Gia sư (student_reviews) */}
          <div className="md:col-span-2 space-y-6">
            <div className="csat-card bg-card p-6 border-2 border-foreground rounded-2xl shadow-neo">
              <h2 className="font-heading font-bold text-xl mb-1 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Nhận xét từ Gia sư
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Đánh giá hàng tháng của gia sư về tình hình học tập của học sinh.
              </p>

              {reviews && reviews.length > 0 ? (
                <div className="space-y-5">
                  {reviews.map((review) => {
                    const tutorName = review.tutors?.name;
                    const className = review.classes?.name;

                    return (
                      <div key={review.review_id} className="p-5 rounded-xl border border-border bg-accent/30 relative">
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="font-bold text-sm text-foreground">{className || 'Lớp học'}</span>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Gia sư: <span className="font-semibold text-foreground">{tutorName || 'N/A'}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                            {review.month_year}
                          </span>
                        </div>

                        {/* 3 tiêu chí đánh giá */}
                        <div className="space-y-3">
                          {review.general_assessment && (
                            <div className="flex items-start gap-2.5 bg-background p-3 rounded-lg border border-border">
                              <Star className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Đánh giá chung</div>
                                <div className="text-sm text-foreground leading-relaxed">{review.general_assessment}</div>
                              </div>
                            </div>
                          )}
                          {review.learning_attitude && (
                            <div className="flex items-start gap-2.5 bg-background p-3 rounded-lg border border-border">
                              <BookOpen className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Thái độ học tập</div>
                                <div className="text-sm text-foreground leading-relaxed">{review.learning_attitude}</div>
                              </div>
                            </div>
                          )}
                          {review.logical_thinking && (
                            <div className="flex items-start gap-2.5 bg-background p-3 rounded-lg border border-border">
                              <Brain className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                              <div>
                                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Tư duy logic</div>
                                <div className="text-sm text-foreground leading-relaxed">{review.logical_thinking}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center bg-accent/20 rounded-xl border border-dashed border-border">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">Chưa có nhận xét nào từ gia sư.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function ParentAccessMessage({ message }: { message: string }) {
  return <div className="min-h-screen bg-background"><CsatNavbar variant="guest" />
    <main className="max-w-xl mx-auto px-4 pt-28 space-y-5">
      <h1 className="font-heading text-2xl font-bold">Quyền truy cập phụ huynh</h1>
      <p role="status">{message}</p>
      <div className="flex flex-wrap gap-3"><Link href="/parents" className="csat-btn">Về trang học sinh</Link><ParentLogoutButton /></div>
    </main></div>;
}
