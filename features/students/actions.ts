'use server';
import { recordOutstandingPayment } from '@/lib/payment-actions';

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
    const { data, error } = await supabase.rpc('admin_save_student', { p_student_id: null, p_data: input, p_revision: null });

    if (error) throw error;
    revalidatePath('/admin/students');
    return { success: true, data: { student_id: data.student_id } };
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Lỗi không xác định';
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
    const { revision, ...fields } = input;
    const { error } = await supabase.rpc('admin_save_student', { p_student_id: studentId, p_data: fields, p_revision: revision });

    if (error) throw error;
    revalidatePath('/admin/students');
    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, data: null };
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Lỗi không xác định';
    return { success: false, error: message };
  }
}

/**
 * Xóa học sinh
 */
export async function deleteStudent(studentId: string, revision: number): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.rpc('admin_save_student', { p_student_id: studentId, p_data: { is_deleted: true }, p_revision: revision });

    if (error) throw error;
    revalidatePath('/admin/students');
    return { success: true, data: null };
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Lỗi không xác định';
    return { success: false, error: message };
  }
}

/**
 * Đánh dấu thanh toán là Đã thu
 */
export async function markPaymentAsPaid(paymentId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await recordOutstandingPayment(paymentId);
    revalidatePath('/admin/students');
    revalidatePath('/admin/billing');
    return { success: true, data: null };
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Lỗi không xác định';
    return { success: false, error: message };
  }
}
