'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
export type ActionResult<T = null> = { success: true; data: T } | { success: false; error: string };
export interface AttendanceEntry { student_id: string; status: 'attended' | 'absent'; notes?: string | null; }
export async function saveAttendance(sessionId: string, classId: string, entries: AttendanceEntry[]): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('take_attendance_safe', { p_session_id: sessionId, p_attendance_data: entries });
    if (error) throw error;
    revalidatePath('/tutor/classes/' + classId); return { success: true, data: null };
  } catch (error) { return { success: false, error: (error as Error).message }; }
}
export async function updateSessionStatusByTutor(sessionId: string, classId: string, status: 'completed' | 'cancelled'): Promise<ActionResult> {
  if (status !== 'cancelled') return { success: false, error: 'Hoàn thành buổi học qua điểm danh.' };
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('manage_class', { p_action: 'cancel_sessions', p_class_id: classId,
      p_data: { session_ids: [sessionId] }, p_request_id: crypto.randomUUID() });
    if (error) throw error;
    revalidatePath('/tutor/classes/' + classId); return { success: true, data: null };
  } catch (error) { return { success: false, error: (error as Error).message }; }
}
