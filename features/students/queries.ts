/**
 * features/students/queries.ts
 * Tất cả các thao tác READ (lấy dữ liệu) liên quan đến học sinh.
 * Chỉ chạy trên Server (không import vào Client Component).
 */
import { createClient } from '@/lib/supabase/server';
import type { Student } from '@/types/database';

export interface StudentsQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  feeFilter?: string;
}

export interface StudentsQueryResult {
  students: Student[];
  totalStudents: number;
  totalPages: number;
}

export async function getStudents({
  page = 1,
  pageSize = 20,
  search = '',
  status = '',
  feeFilter = '',
}: StudentsQueryParams = {}): Promise<StudentsQueryResult> {
  const supabase = await createClient();

  let query = supabase
    .from('students')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,student_contact.ilike.%${search.trim()}%,parent_number.ilike.%${search.trim()}%`);
  }
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (feeFilter === 'unpaid') {
    const { data, error } = await supabase.rpc('payment_accounts');
    if (error) throw error;
    const ids = [...new Set((data as Array<{ student_id: string | null; balance: number }>).filter(p => p.balance > 0 && p.student_id).map(p => p.student_id!))];
    if (!ids.length) return { students: [], totalStudents: 0, totalPages: 0 };
    query = query.in('student_id', ids);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    students: (data ?? []) as Student[],
    totalStudents: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

export async function getStudentById(studentId: string) {
  const supabase = await createClient();

  const [studentRes, attendanceRes, classesRes, paymentsRes, reviewsRes] = await Promise.all([
    supabase.from('students').select('*').eq('student_id', studentId).single(),
    supabase.from('attendance_current')
      .select('*, sessions!inner(date, start_time, end_time, classes(name))')
      .eq('student_id', studentId)
      .order('sessions(date)', { ascending: false })
      .limit(30),
    supabase.from('class_students_current')
      .select('*, classes(name, tutors(name))')
      .eq('student_id', studentId),
    supabase.rpc('payment_accounts', { p_student_id: studentId }),
    supabase.from('student_reviews')
      .select('*, tutors(name), classes(name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
  ]);

  for (const result of [studentRes, attendanceRes, classesRes, paymentsRes, reviewsRes]) if (result.error) throw result.error;

  return {
    student: studentRes.data,
    attendance: attendanceRes.data ?? [],
    enrolledClasses: classesRes.data ?? [],
    payments: paymentsRes.data ?? [],
    reviews: reviewsRes.data ?? [],
  };
}
