'use server';

/**
 * features/tutors/actions.ts
 * Server Actions cho module Gia sư.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CreateTutorInput, UpdateTutorInput } from '@/types/database';

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

export async function createTutor(
  input: CreateTutorInput
): Promise<ActionResult<{ tutor_id: string }>> {
  try {
    const { supabase } = await requireAdmin();
    const { data, error } = await supabase
      .from('tutors')
      .insert(input)
      .select('tutor_id')
      .single();
    if (error) throw error;
    revalidatePath('/admin/tutors');
    return { success: true, data: { tutor_id: data.tutor_id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}

export async function updateTutor(
  tutorId: string,
  input: UpdateTutorInput
): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('tutors')
      .update(input)
      .eq('tutor_id', tutorId);
    if (error) throw error;
    revalidatePath('/admin/tutors');
    revalidatePath(`/admin/tutors/${tutorId}`);
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}

export async function deleteTutor(tutorId: string): Promise<ActionResult> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from('tutors')
      .delete()
      .eq('tutor_id', tutorId);
    if (error) throw error;
    revalidatePath('/admin/tutors');
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi không xác định' };
  }
}
