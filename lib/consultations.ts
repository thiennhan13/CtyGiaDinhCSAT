import { z } from 'zod';
import { parentPhoneSchema } from './parents';
export const consultationSchema = z.object({
 request_id: z.uuid(), role: z.enum(['parent','student','university']),
 name: z.string().trim().min(2, 'Vui lòng nhập tên liên hệ.').max(100), phone: parentPhoneSchema,
 email: z.union([z.literal(''), z.email().max(254)]),
 level: z.enum(['thcs','thpt','university','undecided']), goal: z.enum(['thcs','specialist','province','national','undecided']),
 program: z.enum(['co-ban','nang-cao','hsgqg','consultation']),
 school_year: z.string().trim().max(50), message: z.string().trim().max(2000),
 consent: z.literal(true), website: z.string().max(0),
}).strict();
export type ConsultationInput = z.infer<typeof consultationSchema>;
export const consultationRoles = {parent:'Phụ huynh',student:'Học sinh',university:'Sinh viên'} as const;
export const consultationStatuses = {new:'Mới',contacted:'Đã liên hệ',completed:'Đã hoàn tất'} as const;
export const mailStatuses = {queued:'Chờ gửi',sending:'Đang xử lý',accepted:'Nhà cung cấp đã tiếp nhận',failed:'Gửi lỗi',manual_review:'Cần kiểm tra thủ công'} as const;
