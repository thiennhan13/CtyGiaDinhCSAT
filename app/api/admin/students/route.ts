import { NextResponse } from 'next/server';
import { z } from 'zod';
import { businessSession, businessError } from '@/lib/business-api';
import { readLoginBody } from '@/lib/login-security';

const fields = z.object({
  name: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự').max(200),
  date_of_birth: z.string().date().nullable().optional(),
  student_contact: z.string().max(2000).nullable().optional(),
  parent_number: z.string().max(30).nullable().optional(),
  parent_link: z.string().max(2000).nullable().optional(),
  province: z.string().max(200).nullable().optional(),
  parent_name: z.string().max(150).nullable().optional(),
  status: z.string().max(100).optional(),
  notes: z.string().max(2000).nullable().optional(),
});
const schema = z.discriminatedUnion('action', [
  fields.extend({ action: z.literal('create') }).strict(),
  fields.partial().extend({ action: z.literal('update'), student_id: z.uuid(), revision: z.number().int().positive() }).strict(),
  z.object({ action: z.literal('delete'), student_id: z.uuid(), revision: z.number().int().positive() }).strict(),
]);
export async function POST(request: Request) {
  const session = await businessSession(true, request); if (session.response) return session.response;
  const parsed = schema.safeParse(await readLoginBody(request));
  if (!parsed.success) return NextResponse.json({ error: 'Kiểm tra hồ sơ và revision hiện tại.' }, { status: 422 });
  const input = parsed.data;
  let studentId: string | null = null, revision: number | null = null, data: object;
  if (input.action === 'create') {
    const { action: _action, ...values } = input; data = values;
  } else {
    const { action, student_id, revision: currentRevision, ...values } = input;
    studentId = student_id; revision = currentRevision;
    data = action === 'delete' ? { is_deleted: true } : values;
  }
  // The same transaction as the admin form: synchronize contacts, check revision,
  // preserve history and revoke outdated parent access. No service-role table writes.
  const result = await session.supabase.rpc('admin_save_student', { p_student_id: studentId, p_data: data, p_revision: revision });
  return result.error ? businessError(result.error) : NextResponse.json({
    message: input.action === 'delete' ? 'Đã ẩn hồ sơ học sinh và khóa quyền phụ huynh.' : 'Đã lưu hồ sơ học sinh.', data: result.data,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
