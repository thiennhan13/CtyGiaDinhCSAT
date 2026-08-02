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
    // Join qua payments để lọc học sinh chưa thanh toán
    query = (supabase
      .from('students')
      .select('*, payments!inner(status)', { count: 'exact' })
      .eq('payments.status', 'unpaid')
      .order('created_at', { ascending: false }) as typeof query);
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
    supabase.from('attendance')
      .select('*, sessions(date, start_time, end_time, classes(name))')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase.from('class_students')
      .select('*, classes(name, tutors(name))')
      .eq('student_id', studentId),
    supabase.from('payments')
      .select('*, classes(name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    supabase.from('student_reviews')
      .select('*, tutors(name), classes(name)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
  ]);

  if (studentRes.error) throw studentRes.error;

  return {
    student: studentRes.data,
    attendance: attendanceRes.data ?? [],
    enrolledClasses: classesRes.data ?? [],
    payments: paymentsRes.data ?? [],
    reviews: reviewsRes.data ?? [],
  };
}
