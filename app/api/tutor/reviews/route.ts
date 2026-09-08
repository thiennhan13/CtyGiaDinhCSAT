import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSameOrigin } from '@/lib/parents';
import { saveReviewSchema, snapshotReviewTags } from '@/lib/student-reviews';

const querySchema = z.object({ class_id: z.string().uuid(), student_id: z.string().uuid() });
const reviewColumns = 'review_id,student_id,tutor_id,class_id,month_year,general_assessment,learning_attitude,logical_thinking,review_context,review_tags,review_status,created_at,updated_at';
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });

function databaseError(error: { code?: string }) {
  if (['PGRST202', 'PGRST204', '42703', '42883'].includes(error.code || '')) {
    return json({ error: 'Chức năng nhận xét đang chờ cập nhật hệ thống. Nội dung đang nhập được giữ lại; vui lòng thử lại sau.', code: 'REVIEW_SCHEMA_NOT_READY' }, 503);
  }
  if (error.code === '40001') return json({ error: 'Bản nháp đã được cập nhật ở một phiên khác. Nội dung đang nhập được giữ lại; mở lại bản nháp để đối chiếu trước khi lưu.' }, 409);
  if (error.code === '23505') return json({ error: 'Nhận xét này đã được gửi. Vui lòng tải lại lịch sử để kiểm tra trước khi tạo nhận xét mới.' }, 409);
  if (error.code === '42501') return json({ error: 'Bạn không còn quyền nhận xét học sinh trong lớp này.' }, 403);
  if (['23514', '22023'].includes(error.code || '')) return json({ error: 'Nội dung nhận xét chưa hợp lệ. Kiểm tra mức độ, minh chứng và phạm vi review.' }, 400);
  return json({ error: 'Chưa lưu được nhận xét. Vui lòng thử lại; nội dung đang nhập được giữ nguyên.' }, 500);
}

async function authorize(classId: string, studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }, 401) };
  const { data: tutor, error: tutorError } = await supabase.from('tutors').select('tutor_id')
    .eq('auth_uid', user.id).eq('status', 'active').not('is_deleted', 'is', true).maybeSingle();
  if (tutorError) return { response: databaseError(tutorError) };
  if (!tutor) return { response: json({ error: 'Tài khoản chưa có quyền gia sư đang hoạt động.' }, 403) };
  const { data: classInfo, error: classError } = await supabase.from('classes').select('class_id,name,class_type')
    .eq('class_id', classId).eq('tutor_id', tutor.tutor_id).maybeSingle();
  if (classError) return { response: databaseError(classError) };
  if (!classInfo) return { response: json({ error: 'Lớp học không thuộc quyền phụ trách của bạn.' }, 403) };
  const { data: enrollment, error: enrollmentError } = await supabase.from('class_students').select('student_id')
    .eq('class_id', classId).eq('student_id', studentId).eq('status', 'active').maybeSingle();
  if (enrollmentError) return { response: databaseError(enrollmentError) };
  if (!enrollment) return { response: json({ error: 'Học sinh không còn trong danh sách đang học của lớp.' }, 403) };
  const { data: student, error: studentError } = await supabase.from('students').select('student_id,name')
    .eq('student_id', studentId).not('is_deleted', 'is', true).maybeSingle();
  if (studentError) return { response: databaseError(studentError) };
  if (!student) return { response: json({ error: 'Không tìm thấy học sinh đang được quản lý.' }, 403) };
  return { supabase, tutor, classInfo, student };
}

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return json({ error: 'Lớp hoặc học sinh không hợp lệ.' }, 400);
  try {
    const access = await authorize(parsed.data.class_id, parsed.data.student_id);
    if (access.response) return access.response;
    const { data: reviews, error } = await access.supabase.from('student_reviews').select(reviewColumns)
      .eq('tutor_id', access.tutor.tutor_id).eq('class_id', parsed.data.class_id).eq('student_id', parsed.data.student_id)
      .order('updated_at', { ascending: false }).limit(30);
    if (error) return databaseError(error);
    return json({ student: access.student, class: access.classInfo, reviews: reviews || [] });
  } catch { return json({ error: 'Không tải được thông tin nhận xét. Vui lòng thử lại.' }, 500); }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: 'Dữ liệu gửi lên không hợp lệ.' }, 400); }
  const parsed = saveReviewSchema.safeParse(body);
  if (!parsed.success) return json({ error: parsed.error.issues[0].message, issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message })) }, 400);
  try {
    const review = parsed.data;
    const access = await authorize(review.class_id, review.student_id);
    if (access.response) return access.response;
    // User-scoped client: the database repeats ownership and enrollment checks in this transaction.
    const { data, error } = await access.supabase.rpc('save_student_review', {
      p_review_id: review.review_id, p_student_id: review.student_id, p_class_id: review.class_id,
      p_expected_updated_at: review.expected_updated_at, p_month_year: review.month_year,
      p_context: review.review_context, p_general: review.general_assessment,
      p_attitude: review.learning_attitude, p_logical: review.logical_thinking,
      p_status: review.review_status, p_tags: snapshotReviewTags(review.tags),
    });
    if (error) return databaseError(error);
    return json({ review: data });
  } catch { return json({ error: 'Chưa lưu được nhận xét. Nội dung đang nhập được giữ nguyên.' }, 500); }
}
