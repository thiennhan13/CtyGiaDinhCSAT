import { z } from 'zod';
import { parentPhoneSchema } from './parents';

export const intakeChoices = {
  role: { parent: 'Phụ huynh', student: 'Học sinh' },
  level: { primary: 'Tiểu học', thcs: 'THCS', thpt: 'THPT' },
  course: { undecided: 'Cần tư vấn thêm', A: 'A — Nhập môn', B: 'B — Thi đấu cơ bản', C: 'C — Thi đấu nâng cao', E: 'E — Chủ lực', K: 'K — Học riêng / tùy chọn' },
  goal: { undecided: 'Khám phá, cần tư vấn', beginner: 'Bắt đầu học lập trình', thcs: 'HSG THCS', specialist: 'Chuyên Tin', province: 'HSG tỉnh THPT' },
  background: { undecided: 'Chưa rõ, muốn trao đổi', none: 'Chưa học lập trình', syntax: 'Đang làm quen cú pháp', independent: 'Đã tự giải một số bài' },
} as const;
export const intakeSchema = z.object({
  request_id: z.uuid(), schema_version: z.literal(2),
  role: z.enum(['parent', 'student']), name: z.string().trim().min(2).max(100), phone: parentPhoneSchema,
  email: z.union([z.literal(''), z.email().max(254)]), level: z.enum(['primary', 'thcs', 'thpt']),
  course: z.enum(['undecided', 'A', 'B', 'C', 'E', 'K']),
  goal: z.enum(['undecided', 'beginner', 'thcs', 'specialist', 'province']),
  background: z.enum(['undecided', 'none', 'syntax', 'independent']),
  school_year: z.string().trim().max(50), message: z.string().trim().max(2000),
  source_path: z.string().regex(/^\/(?:dang-ky-hoc|lo-trinh(?:\/[abcek])?)?$/),
  consent: z.literal(true), website: z.string().max(0),
}).strict();
export type IntakeInput = z.infer<typeof intakeSchema>;
