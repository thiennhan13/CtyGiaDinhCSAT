import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
import { monthSchema, saveLearningSchema } from '@/lib/learning';
import { getReviewTag } from '@/lib/student-reviews';
const query = z.object({ class_id: z.string().uuid().optional(), month: monthSchema });
const json = (data: unknown) => NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request: Request) {
  const session = await businessSession(false); if (session.response) return session.response;
  const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Chọn lớp và tháng hợp lệ.' }, { status: 422 });
  const { class_id, month } = parsed.data;
  const { data, error } = class_id
    ? await session.supabase.rpc('learning_workspace', { p_class_id: class_id, p_month: month })
    : await session.supabase.rpc('learning_month_queue', { p_month: month });
  return error ? businessError(error) : json(data);
}
export async function POST(request: Request) {
  const session = await businessSession(false, request); if (session.response) return session.response;
  const parsed = saveLearningSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  const v = parsed.data;
  if (new Set(v.body.focus_tags).size !== v.body.focus_tags.length || v.body.focus_tags.some(id => !['knowledge','skill'].includes(getReviewTag(id)?.group || '')))
    return NextResponse.json({ error: 'Chọn thẻ kiến thức hoặc kỹ năng trong danh mục.' }, { status: 422 });
  const { data, error } = await session.supabase.rpc('save_learning_record', {
    p_class_id: v.class_id, p_kind: v.kind, p_student_id: v.student_id, p_session_id: v.session_id,
    p_expected_revision: v.expected_revision, p_body: v.body, p_publish: v.publish,
  });
  return error ? businessError(error) : json(data);
}
