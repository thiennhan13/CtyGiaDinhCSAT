'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function TutorClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchClasses() {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data: tutorData } = await supabase
        .from('tutors')
        .select('tutor_id')
        .eq('auth_uid', userData.user.id)
        .single();
      
      if (!tutorData) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('classes')
        .select('class_id, name, status, start_date, end_date')
        .eq('tutor_id', tutorData.tutor_id);

      if (!error && data) {
        // Lỗi 1 FIX: class_students(count) không hỗ trợ filter status
        // → Fetch riêng số học sinh ACTIVE per class rồi merge vào
        const classIds = data.map(c => c.class_id);
        const { data: activeCounts } = await supabase
          .from('class_students')
          .select('class_id')
          .in('class_id', classIds)
          .eq('status', 'active');

        const countMap: Record<string, number> = {};
        (activeCounts || []).forEach(cs => {
          countMap[cs.class_id] = (countMap[cs.class_id] || 0) + 1;
        });

        setClasses(data.map(c => ({ ...c, activeStudentCount: countMap[c.class_id] || 0 })));
      }
      setLoading(false);
    }
    fetchClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Danh Sách Lớp Giảng Dạy</h2>
        <p className="text-slate-500 text-sm mt-1">Các lớp hiện tại bạn đang phụ trách.</p>
      </div>

      <Card>
        <CardHeader>
           <CardTitle>Danh Sách Lớp</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="space-y-2">
               <Skeleton className="h-10 w-full" />
               <Skeleton className="h-10 w-full" />
             </div>
          ) : classes.length === 0 ? (
             <div className="text-center py-6 text-slate-500">Bạn chưa được phân công lớp nào.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>Tên Lớp</TableHead>
                     <TableHead>Trạng Thái</TableHead>
                     <TableHead>Số Học Viên</TableHead>
                     <TableHead>Hành Động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map(c => (
                    <TableRow key={c.class_id}>
                       <TableCell className="font-semibold text-slate-900">{c.name}</TableCell>
                       <TableCell>
                         <span className={`px-2 py-1 rounded-sm text-xs font-semibold ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                           {c.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng / Đã kết thúc'}
                         </span>
                       </TableCell>
                       <TableCell>{c.activeStudentCount} học viên đang học</TableCell>
                       <TableCell>
                         <Link href={`/tutor/classes/${c.class_id}`} className="text-indigo-600 font-medium hover:underline">
                           Quản lý Học viên & Lịch dạy &rarr;
                         </Link>
                       </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
