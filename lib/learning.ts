import { z } from 'zod';

export const PROGRAMS = { basic: 'Cơ bản', advanced: 'Nâng cao', voi: 'Ôn thi VOI' } as const;
export const programSchema = z.enum(['basic', 'advanced', 'voi']);
export const monthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const text = (max = 2000) => z.string().trim().max(max);
export const lessonSchema = z.object({ range: text(30), title: text(200).min(1), description: text(), source: text(300) }).strict();
export const stageSchema = z.object({ title: text(200).min(1), range: text(30), description: text(), outcomes: z.array(text(500)).max(12), lessons: z.array(lessonSchema).max(60) }).strict();
export const templateSchema = z.object({ program: programSchema, title: text(200).min(1), source: text(1000).min(1), stages: z.array(stageSchema).min(1).max(30) }).strict();
export type LearningTemplate = z.infer<typeof templateSchema> & { template_id: string; version: number };
export const learningBodySchema = z.object({
  goal: text(), focus_tags: z.array(z.string().max(64)).max(16),
  next_step: text(), stage_index: z.number().int().min(0).max(29).nullable(),
  title: text(200), content: text(5000), continuation: text(),
  program: programSchema.nullable(), format: z.enum(['group', 'individual']).nullable(),
  template_id: z.string().uuid().nullable(),
}).strict();
export type LearningBody = z.infer<typeof learningBodySchema>;
export const emptyLearningBody = (): LearningBody => ({ goal: '', focus_tags: [], next_step: '', stage_index: null, title: '', content: '', continuation: '', program: null, format: null, template_id: null });
export const saveLearningSchema = z.object({
  class_id: z.string().uuid(), kind: z.enum(['class', 'student', 'session']),
  student_id: z.string().uuid().nullable(), session_id: z.string().uuid().nullable(),
  expected_revision: z.number().int().min(0), publish: z.boolean(), body: learningBodySchema,
}).strict().superRefine((v, ctx) => {
  if ((v.kind === 'student') !== !!v.student_id || (v.kind === 'session') !== !!v.session_id)
    ctx.addIssue({ code: 'custom', message: 'Phạm vi lộ trình không hợp lệ.' });
  if (v.publish && v.kind === 'class' && (!v.body.program || !v.body.format))
    ctx.addIssue({ code: 'custom', message: 'Chọn chương trình và hình thức học trước khi công bố.' });
  if (v.publish && v.kind === 'session' && !v.body.title.trim())
    ctx.addIssue({ code: 'custom', message: 'Ghi tên nội dung buổi học trước khi công bố.' });
});
export interface LearningRecord {
  record_id: string; kind: 'class' | 'student' | 'session'; class_id: string;
  student_id: string | null; session_id: string | null;
  draft: LearningBody; published: LearningBody | null; revision: number; published_at: string | null;
}
export interface MonthlyRow { class_id: string; class_name: string; tutor_id: string; tutor_name: string; student_id: string; student_name: string; review_id: string | null; status: 'missing' | 'draft' | 'published'; actionable: boolean }
export interface LearningWorkspace {
  class: { class_id: string; name: string; class_type: string };
  templates: LearningTemplate[]; defaults: { program: string; template_id: string }[];
  records: LearningRecord[]; students: { student_id: string; name: string }[];
  sessions: { session_id: string; date: string; status: string }[]; queue: MonthlyRow[];
}
export function defaultProgram(classType: string): 'basic' | 'advanced' | null {
  const normalized = classType.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('co ban') ? 'basic' : normalized.includes('nang cao') ? 'advanced' : null;
}
