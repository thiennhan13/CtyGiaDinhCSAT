'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
export type ActionResult<T = null> = { success: true; data: T } | { success: false; error: string };
async function run(classId: string, action: string, data: Record<string, unknown>): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('manage_class', { p_action: action, p_class_id: classId, p_data: data, p_request_id: crypto.randomUUID() });
    if (error) throw error;
    revalidatePath('/admin/classes'); revalidatePath('/admin/classes/' + classId);
    return { success: true, data: null };
  } catch (error) { return { success: false, error: (error as Error).message }; }
}
export async function updateClassStatus(classId: string, status: 'active' | 'inactive' | 'archived') {
  return run(classId, 'set_status', { status });
}
export async function removeStudentFromClass(studentId: string, classId: string) {
  return run(classId, 'drop_student', { student_id: studentId });
}
export async function updateSessionStatus(sessionId: string, status: 'scheduled' | 'completed' | 'cancelled', classId: string): Promise<ActionResult> {
  if (status !== 'cancelled') return { success: false, error: 'Hoàn thành buổi học qua điểm danh; tạo lịch mới khi cần xếp lại.' };
  return run(classId, 'cancel_sessions', { session_ids: [sessionId] });
}
