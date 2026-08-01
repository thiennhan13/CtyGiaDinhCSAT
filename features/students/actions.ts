'use server';

/**
 * features/students/actions.ts
 * Server Actions cho module Học sinh.
 * Đây là tầng duy nhất được phép ghi dữ liệu vào Supabase.
 * Mọi form/button CRUD phải gọi các hàm này — không gọi Supabase trực tiếp từ client.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CreateStudentInput, UpdateStudentInput } from '@/types/database';

/** Kết quả trả về chuẩn từ Server Action */
export type ActionResult<T = null> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Không có quyền thực hiện thao tác này.');
  }
  return { supabase, user };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/**
 * Thêm học sinh mới
 */
export async function createStudent(
  input: CreateStudentInput
): Promise<ActionResult<{ student_id: string }>> {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from('students')
      .insert(input)
      .select('student_id')
      .single();

    if (error) throw error;
    revalidatePath('/admin/students');
    return { success: true, data: { student_id: data.student_id } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return { success: false, error: message };
  }
}

/**
 * Cập nhật thông tin học sinh
 */
export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('students')
      .update(input)
      .eq('student_id', studentId);

    if (error) throw error;
    revalidatePath('/admin/students');
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return { success: false, error: message };
  }
}

/**
 * Xóa học sinh
 */
export async function deleteStudent(studentId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('student_id', studentId);

    if (error) throw error;
    revalidatePath('/admin/students');
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return { success: false, error: message };
  }
}

/**
 * Đánh dấu thanh toán là Đã thu
 */
export async function markPaymentAsPaid(paymentId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('payments')
      .update({ status: 'paid' })
      .eq('payment_id', paymentId);

    if (error) throw error;
    revalidatePath('/admin/students');
    revalidatePath('/admin/billing');
    return { success: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Lỗi không xác định';
    return { success: false, error: message };
  }
}
