'use server';

/**
 * features/attendance/actions.ts
 * Server Actions cho module Điểm danh.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = null> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

async function requireTutor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Chưa đăng nhập.');
  return { supabase, user };
}

export interface AttendanceEntry {
  student_id: string;
  status: 'attended' | 'absent';
  notes?: string | null;
}

/**
 * Lưu điểm danh cho một buổi học (tạo mới hoặc upsert)
 */
export async function saveAttendance(
  sessionId: string,
  classId: string,
  entries: AttendanceEntry[]
): Promise<ActionResult> {
  try {
    const { supabase } = await requireTutor();

    const rows = entries.map(e => ({
      session_id:  sessionId,
      student_id:  e.student_id,
      status:      e.status,
      notes:       e.notes ?? null,
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'session_id,student_id' });

    if (error) throw error;
    revalidatePath(`/tutor/classes/${classId}`);
    revalidatePath(`/tutor/classes/${classId}/session/${sessionId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}

/**
 * Cập nhật trạng thái buổi học (completed / cancelled)
 */
export async function updateSessionStatusByTutor(
  sessionId: string,
  classId: string,
  status: 'completed' | 'cancelled'
): Promise<ActionResult> {
  try {
    const { supabase } = await requireTutor();
    const { error } = await supabase
      .from('sessions')
      .update({ status })
      .eq('session_id', sessionId);
    if (error) throw error;
    revalidatePath(`/tutor/classes/${classId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}
