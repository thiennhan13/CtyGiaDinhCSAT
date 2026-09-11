import { z } from 'zod';
import type { StudentReview } from './student-reviews';

/** Store Vietnamese mobile numbers as 0xxxxxxxxx; accept full international input. */
export function normalizeParentPhone(value: string): string | null {
  if (!/^[+\d\s().-]+$/.test(value)) return null;
  let phone = value.replace(/[\s().-]/g, '');
  if (/^0084[35789]\d{8}$/.test(phone)) phone = '0' + phone.slice(4);
  else if (/^\+84[35789]\d{8}$/.test(phone)) phone = '0' + phone.slice(3);
  return /^0[35789]\d{8}$/.test(phone) ? phone : null;
}

export const parentPhoneSchema = z.string().max(30).transform(normalizeParentPhone)
  .refine((phone): phone is string => phone !== null, 'Số điện thoại di động Việt Nam không hợp lệ.');

export interface ParentStudent { student_id: string; name: string; }
export interface ParentPortalData {
  parent: { name: string; phone: string };
  students: ParentStudent[];
  student: (ParentStudent & { date_of_birth: string | null; province: string | null; status: string | null; parent_name: string; parent_number: string }) | null;
  reviews: Array<StudentReview & { tutors: { name: string | null }; classes: { name: string | null } }>;
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
