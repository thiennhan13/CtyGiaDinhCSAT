'use server';

/**
 * features/classes/actions.ts
 * Server Actions cho module Lớp học.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type ActionResult<T = null> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Không có quyền thực hiện thao tác này.');
  }
  return { supabase, user };
}

export async function updateClassStatus(
  classId: string,
  status: 'active' | 'inactive' | 'archived'
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('classes')
      .update({ status })
      .eq('class_id', classId);
    if (error) throw error;
    revalidatePath('/admin/classes');
    revalidatePath(`/admin/classes/${classId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}

export async function removeStudentFromClass(
  classStudentId: string,
  classId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('class_students')
      .update({ status: 'inactive' })
      .eq('class_student_id', classStudentId);
    if (error) throw error;
    revalidatePath(`/admin/classes/${classId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}

export async function updateSessionStatus(
  sessionId: string,
  status: 'scheduled' | 'completed' | 'cancelled',
  classId: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('sessions')
      .update({ status })
      .eq('session_id', sessionId);
    if (error) throw error;
    revalidatePath(`/admin/classes/${classId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}
