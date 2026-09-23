import { z } from 'zod';

export const DEFAULT_TUTOR_BACKGROUND = 'Cựu học sinh chuyên Tin trường THPT Chuyên Phan Bội Châu';
export const AVATAR_BUCKET = 'tutor-avatars';
export const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
export const profileSchema = z.object({
  revision: z.number().int().min(0),
  background: z.string().trim().max(300).optional(),
  major: z.string().trim().max(200),
  university: z.string().trim().max(200),
  achievements: z.string().trim().max(2000),
  introduction: z.string().trim().max(2000),
  avatar_action: z.enum(['keep', 'replace', 'remove']),
}).strict();
export type TutorProfileInput = z.infer<typeof profileSchema>;
export interface TutorProfile {
  tutor_id: string; name: string; background: string; major: string; university: string;
  achievements: string; introduction: string; avatar_path: string | null;
  revision: number; updated_at?: string; avatar_url?: string | null;
}
export function avatarUrl(path: string | null | undefined): string | null {
  const origin = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!origin || !path || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(path)) return null;
  return `${origin.replace(/\/$/, '')}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
