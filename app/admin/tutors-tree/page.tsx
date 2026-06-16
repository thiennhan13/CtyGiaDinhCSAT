import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ChevronRight, GraduationCap, BookOpen, Users, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TutorsTreePage() {
  const supabase = await createClient();

  // Lấy tất cả gia sư đang hoạt động kèm theo lớp đang dạy
  // Quan hệ: classes → class_students (bảng trung gian) → students
  const { data: tutors, error } = await supabase
    .from('tutors')
    .select(`
      tutor_id,
      name,
      email,
      status,
      classes (
        class_id,
        name,
        status,
        end_date,
        class_students (
          student_id,
          status,
          students ( name )
        )
      )
    `)
    .eq('status', 'active')
    .neq('is_deleted', true)
    .order('name');


  if (error) {
    console.error('Error fetching tutors tree:', error);
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sơ đồ Gia sư — Lớp học</h2>
        <p className="text-sm text-slate-500 mt-1">Tổng quan toàn bộ gia sư đang hoạt động và các lớp họ đang phụ trách</p>
      </div>

      <div className="grid gap-4">
        {!tutors || tutors.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">Chưa có gia sư nào đang hoạt động</p>
          </div>
        ) : (
          tutors.map((tutor) => {
            const activeClasses = (tutor.classes as any[])?.filter(c => c.status === 'active') ?? [];
            const inactiveClasses = (tutor.classes as any[])?.filter(c => c.status !== 'active') ?? [];
            const expiringClasses = activeClasses.filter(c => {
              if (!c.end_date) return false;
              const daysLeft = Math.ceil((new Date(c.end_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
              return daysLeft <= 14 && daysLeft >= 0;
            });

            return (
              <div key={tutor.tutor_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                {/* Tutor Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0 select-none">
                      {tutor.name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <Link href={`/admin/tutors/${tutor.tutor_id}`} className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-base">
                        {tutor.name}
                      </Link>
                      <p className="text-xs text-slate-500">{tutor.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {expiringClasses.length > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> {expiringClasses.length} sắp hết hạn
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                      {activeClasses.length} lớp đang dạy
                    </span>
                    <Link
                      href={`/admin/tutors/${tutor.tutor_id}`}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Chi tiết <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Classes Tree */}
                {activeClasses.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-slate-400 italic">Chưa có lớp nào đang hoạt động</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {activeClasses.map((cls: any) => {
                      const isExpiring = expiringClasses.some(e => e.class_id === cls.class_id);
                      // Lấy tên học sinh qua bảng trung gian class_students (chỉ lấy đang active)
                      const studentNames = (cls.class_students as any[])
                        ?.filter((cs: any) => cs.status === 'active')
                        .map((cs: any) => cs.students?.name)
                        .filter(Boolean) ?? [];

                      return (
                        <Link
                          key={cls.class_id}
                          href={`/admin/classes/${cls.class_id}`}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                        >
                          {/* Tree connector */}
                          <div className="flex items-center gap-2 text-slate-300 shrink-0 ml-3">
                            <div className="w-px h-4 bg-slate-200" />
                            <div className="w-3 h-px bg-slate-200" />
                          </div>

                          <div className={`w-2 h-2 rounded-full shrink-0 ${isExpiring ? 'bg-amber-400' : 'bg-emerald-400'}`} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                {cls.name}
                              </span>
                              {isExpiring && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                                  Sắp hết hạn
                                </span>
                              )}
                            </div>
                            {studentNames.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5 ml-5">
                                <Users className="w-3 h-3 text-slate-300" />
                                <span className="text-xs text-slate-400 truncate">{studentNames.join(', ')}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {cls.end_date && (
                              <span className={`text-xs ${isExpiring ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>
                                HH: {cls.end_date}
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* Inactive classes summary */}
                {inactiveClasses.length > 0 && (
                  <div className="px-5 py-2.5 border-t border-dashed border-slate-100 bg-slate-50/50">
                    <span className="text-xs text-slate-400">+ {inactiveClasses.length} lớp đã kết thúc (ẩn)</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
