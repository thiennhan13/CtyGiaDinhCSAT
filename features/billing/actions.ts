'use server';

/**
 * features/billing/actions.ts
 * Server Actions cho module Kế toán.
 * Lưu ý: Logic tính toán phức tạp (generate billing, rollback) vẫn nằm ở API routes
 * do độ phức tạp cao — các hàm đơn giản ở đây để sử dụng dần khi refactor sâu hơn.
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

/**
 * Đánh dấu 1 khoản thanh toán học phí là Đã thu
 */
export async function markPaymentPaid(paymentId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('payment_id', paymentId);
    if (error) throw error;
    revalidatePath('/admin/billing');
    revalidatePath('/admin/students');
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}

/**
 * Đánh dấu 1 khoản lương gia sư là Đã trả
 */
export async function markSalaryPaid(
  tutorId: string,
  billingPeriod: string
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('tutor_salaries')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('tutor_id', tutorId)
      .eq('billing_period', billingPeriod);
    if (error) throw error;
    revalidatePath('/admin/billing');
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}

/**
 * Lấy danh sách các kỳ kế toán đã chốt (để populate dropdown)
 */
export async function getBillingPeriods(): Promise<ActionResult<string[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_unique_billing_periods');
    if (error) throw error;
    const periods = (data as Array<{ billing_period: string }> ?? []).map(d => d.billing_period);
    return { success: true, data: periods };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}
