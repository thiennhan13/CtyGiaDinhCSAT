import { z } from 'zod';

/** Canonical Vietnamese mobile number. Never infer identity from a suffix. */
export function normalizeParentPhone(value: string): string | null {
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  let phone = value.replace(/[\s().-]/g, '');
  if (phone.startsWith('0084')) phone = `+84${phone.slice(4)}`;
  if (/^0[35789]\d{8}$/.test(phone)) phone = `+84${phone.slice(1)}`;
  return /^\+84[35789]\d{8}$/.test(phone) ? phone : null;
}

export const parentPasswordSchema = z.string().min(12, 'Mật khẩu mới cần ít nhất 12 ký tự.').max(128);
export const parentPhoneSchema = z.string().max(30).transform(normalizeParentPhone)
  .refine((phone): phone is string => phone !== null, 'Số điện thoại di động Việt Nam không hợp lệ.');

export interface ParentStudent { student_id: string; name: string; }
export interface ParentPortalData {
  parent: { name: string; phone: string };
  students: ParentStudent[];
  student: (ParentStudent & { date_of_birth: string | null; province: string | null; status: string | null; parent_name: string; parent_number: string }) | null;
  reviews: Array<{ review_id: string; month_year: string | null; general_assessment: string | null; learning_attitude: string | null; logical_thinking: string | null; tutors: { name: string | null }; classes: { name: string | null } }>;
  enrolledClasses: Array<{ class_id: string; classes: { name: string; class_type: string; status: string; tutors: { name: string | null } } }>;
  attendanceCount: number;
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  // Next.js can expose an internal hostname in request.url behind a proxy.
  // Compare against the request authority and forwarded scheme instead.
  const url = new URL(request.url);
  const host = request.headers.get('host') || url.host;
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || url.protocol.slice(0, -1);
  try {
    return ['http', 'https'].includes(protocol) && new URL(origin).origin === `${protocol}://${host.toLowerCase()}`;
  } catch { return false; }
}
