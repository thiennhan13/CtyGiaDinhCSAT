import { z } from 'zod';
import catalog from './review-tag-catalog.json';

export type ReviewGroup = 'knowledge' | 'skill' | 'strength' | 'progress' | 'habit';
export type ReviewLevel = '' | 'consolidate' | 'guided' | 'independent' | 'transfer';
export interface ReviewTagDefinition {
  id: string; group: ReviewGroup; label: string; scope: string;
  evidence: string; source?: string; keywords?: string;
}
export const REVIEW_CATALOG_VERSION = catalog.version;
export const REVIEW_TAGS = catalog.tags as ReviewTagDefinition[];
export const REVIEW_GROUPS = catalog.groups as Array<{ id: ReviewGroup; label: string; description: string; assessed: boolean }>;
export const REVIEW_LEVELS = catalog.levels;
export const REVIEW_GROUP_ORDER: ReviewGroup[] = ['strength', 'progress', 'knowledge', 'skill', 'habit'];
const tagById = new Map(REVIEW_TAGS.map(tag => [tag.id, tag]));
export const getReviewTag = (id: string) => tagById.get(id);

const tagInputSchema = z.object({
  tag_id: z.string().max(64),
  level: z.enum(['', 'consolidate', 'guided', 'independent', 'transfer']),
  evidence: z.string().trim().max(700, 'Minh chứng tối đa 700 ký tự.'),
  comparison: z.string().trim().max(400, 'Thông tin đối chiếu tối đa 400 ký tự.'),
  next_step: z.string().trim().max(300, 'Bước rèn tiếp tối đa 300 ký tự.'),
  propose_focus: z.boolean(),
}).strict();

export type ReviewTagInput = z.infer<typeof tagInputSchema>;
export interface ReviewTagSnapshot extends ReviewTagInput { label: string; group: ReviewGroup; catalog_version: number; }
export interface StudentReview {
  corrections?: {correction_id:string;message:string;created_at:string}[];
  review_id: string; student_id?: string; tutor_id?: string; class_id?: string;
  month_year: string | null; general_assessment: string | null;
  learning_attitude: string | null; logical_thinking: string | null;
  review_context?: string; review_tags?: ReviewTagSnapshot[];
  review_status?: 'draft' | 'published'; created_at?: string; updated_at?: string;
}
export interface ReviewWorkspaceData {
  tutorId?: string;
  student: { student_id: string; name: string };
  class: { class_id: string; name: string; class_type: string };
  reviews: StudentReview[];
}

export function tagReadiness(tag: ReviewTagInput): string[] {
  const definition = getReviewTag(tag.tag_id);
  if (!definition) return ['Thẻ không còn trong danh mục đang dùng.'];
  const errors: string[] = [];
  if (!tag.evidence.trim()) errors.push('Cần ghi biểu hiện hoặc bài làm cụ thể.');
  if (['knowledge', 'skill'].includes(definition.group) && !tag.level) errors.push('Cần chọn mức độ quan sát.');
  if (definition.group === 'progress' && !tag.comparison.trim()) errors.push('Cần ghi lần quan sát trước để đối chiếu.');
  if (tag.propose_focus && !tag.next_step.trim()) errors.push('Đề xuất trọng tâm cần bước rèn luyện cụ thể.');
  return errors;
}

export const saveReviewSchema = z.object({
  review_id: z.string().uuid(), student_id: z.string().uuid(), class_id: z.string().uuid(),
  expected_updated_at: z.string().datetime({ offset: true }).nullable(),
  month_year: z.string().regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/, 'Chọn tháng nhận xét hợp lệ.'),
  review_context: z.string().trim().max(120, 'Phạm vi nhận xét tối đa 120 ký tự.'),
  general_assessment: z.string().trim().max(3000),
  learning_attitude: z.string().trim().max(3000),
  logical_thinking: z.string().trim().max(3000),
  review_status: z.enum(['draft', 'published']),
  tags: z.array(tagInputSchema).max(64),
}).strict().superRefine((review, ctx) => {
  const seen = new Set<string>();
  for (const [index, tag] of review.tags.entries()) {
    const definition = getReviewTag(tag.tag_id);
    const report = (message: string) => ctx.addIssue({ code: 'custom', path: ['tags', index], message });
    if (!definition) { report('Thẻ không thuộc danh mục đang dùng.'); continue; }
    if (seen.has(tag.tag_id)) report('Một thẻ chỉ được chọn một lần trong mỗi nhận xét.');
    seen.add(tag.tag_id);
    if (!['knowledge', 'skill'].includes(definition.group) && (tag.level || tag.propose_focus)) {
      report('Mức độ và đề xuất trọng tâm chỉ dùng cho thẻ kiến thức hoặc kỹ năng.');
    }
    if (definition.group !== 'progress' && tag.comparison) report('Thông tin đối chiếu chỉ dùng cho thẻ tiến bộ.');
    if (review.review_status === 'published') for (const message of tagReadiness(tag)) report(`${definition.label}: ${message}`);
  }
  if (!review.tags.length && !review.general_assessment && !review.learning_attitude && !review.logical_thinking) {
    ctx.addIssue({ code: 'custom', path: ['tags'], message: 'Thêm ít nhất một thẻ hoặc nội dung nhận xét.' });
  }
  if (review.review_status === 'published' && review.tags.length && !review.review_context) {
    ctx.addIssue({ code: 'custom', path: ['review_context'], message: 'Ghi buổi hoặc giai đoạn được nhận xét.' });
  }
});
export type SaveReviewInput = z.infer<typeof saveReviewSchema>;

export function snapshotReviewTags(tags: ReviewTagInput[]): ReviewTagSnapshot[] {
  return tags.map(tag => {
    const definition = getReviewTag(tag.tag_id);
    if (!definition) throw new Error('Unknown review tag');
    return { ...tag, label: definition.label, group: definition.group, catalog_version: REVIEW_CATALOG_VERSION };
  });
}

export function emptyReviewTag(tag_id: string): ReviewTagInput {
  return { tag_id, level: '', evidence: '', comparison: '', next_step: '', propose_focus: false };
}

export function normalizeReviewSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
}

export function initialReviewScope(classType: string): 'basic' | 'advanced' | 'all' {
  const value = normalizeReviewSearch(classType);
  return value.includes('nang cao') ? 'advanced' : value.includes('co ban') ? 'basic' : 'all';
}

/** Suggestions are navigation aids only: never copy an assessment or proficiency level. */
export function suggestMonthlyTags(focusIds: string[], lessonText: string, previous: ReviewTagSnapshot[]) {
 const text = normalizeReviewSearch(lessonText);
 const terms: Record<string,string[]> = {
  'k-io':['nhap','xuat'], 'k-types':['kieu du lieu','bien'], 'k-conditions':['dieu kien'],
  'k-loops':['vong lap','for','while'], 'k-arrays':['day','mang mot chieu'], 'k-frequency':['tan suat','danh dau'],
  'k-sorting':['sap xep'], 'k-functions':['ham'], 'k-divisors':['so hoc','chia het','uoc'],
  'k-primes':['nguyen to','sang','so hoc'], 'k-gcd':['ucln','bcnn','so hoc'],
  'k-factors':['thua so'], 'k-modulo':['modulo','luy thua'], 'k-strings':['xau','string'],
  'k-matrix':['ma tran','hai chieu'], 'k-prefix':['cong don','mang tong'],
  'k-difference':['mang hieu'], 'k-vector':['vector'], 'k-stack':['stack','ngan xep'],
  'k-queue':['queue','deque','hang doi'], 'k-set':['set'], 'k-map':['map'],
  'k-greedy':['tham lam'], 'k-two-pointers':['hai con tro','cua so truot'], 'k-binary':['nhi phan'],
  'k-hashing':['hash','bam'], 'k-dp-state':['quy hoach dong'], 'k-brute':['vet can'], 'k-recursion':['de quy','quay lui']
 };
 const result = new Map<string,string>();
 for (const id of focusIds) if (getReviewTag(id)) result.set(id,'Trọng tâm đã chọn');
 for (const tag of previous) if (tag.propose_focus && getReviewTag(tag.tag_id)) result.set(tag.tag_id,'Bước rèn tiếp từ nhận xét trước');
 for (const [id,words] of Object.entries(terms)) if(words.some(word=>text.includes(word)) && !result.has(id)) result.set(id,'Nội dung buổi học trong tháng');
 return [...result].slice(0,16).map(([id,reason])=>({id,reason}));
}
