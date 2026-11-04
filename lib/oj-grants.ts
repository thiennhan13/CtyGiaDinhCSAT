import { z } from 'zod';
const count = z.number().int().nonnegative();
const number = z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)]).transform(Number);
export const ojAccount = z.object({ profile_id: count, username: z.string(), url: z.string() });
export const ojGrantReceipt = z.object({ account: ojAccount, grant: z.object({ id: count, revision: z.number().int().positive(), status: z.literal('active') }) });
const stats = z.object({ submission_count: count.nullable(), attempted_count: count.nullable(), solved_count: count.nullable(), last_submission_at: z.string().nullable(), status: z.string().optional() });
// Additive extension to accounts/<id>/; an absent field means no daily data supplied.
export const ojActivity = z.object({ metric: z.literal('submission_count'), timezone: z.literal('Asia/Ho_Chi_Minh'),
  start_date: z.iso.date(), end_date: z.iso.date(), status: z.enum(['available', 'limited', 'unavailable']),
  available_years: z.array(z.number().int().min(2000).max(2100)).max(101),
  days: z.array(z.object({ date: z.iso.date(), submission_count: count.nullable() })).max(366),
  total_submissions: count.nullable(), active_days: count.nullable(),
}).superRefine((activity, ctx) => {
  const start = Date.parse(activity.start_date), end = Date.parse(activity.end_date), length = (end - start) / 86400000 + 1;
  const invalid = () => ctx.addIssue({ code: 'custom', message: 'Invalid daily submission activity' });
  if (!Number.isFinite(start) || !Number.isFinite(end) || length < 1 || length > 366 || new Set(activity.available_years).size !== activity.available_years.length) { invalid(); return; }
  if (activity.status === 'unavailable') {
    if (activity.days.length || activity.total_submissions !== null || activity.active_days !== null) invalid();
    return;
  }
  if (activity.days.length !== length || activity.days.some((day, index) => day.date !== new Date(start + index * 86400000).toISOString().slice(0, 10))) { invalid(); return; }
  if (activity.days.some(day => day.submission_count === null)) {
    if (activity.status === 'available' || activity.total_submissions !== null || activity.active_days !== null) invalid();
  } else if (activity.total_submissions !== activity.days.reduce((sum, day) => sum + day.submission_count!, 0)
    || activity.active_days !== activity.days.filter(day => day.submission_count! > 0).length) invalid();
});
export const ojSummary = z.object({ account: ojAccount, learning: z.object({ scope: z.string(), public_practice: stats, practice: stats, learning_total: stats }),
  site: z.object({ points: number.nullable(), performance_points: number.nullable(), problem_count: count.nullable(), rating: number.nullable(), performance_rank: count.nullable(), rating_rank: count.nullable(), rank_status: z.string() }),
  counts: z.object({ organizations: count, live_contests: count, virtual_participations: count, registered_contests: count }), activity: ojActivity.nullable().optional() });
export const ojParticipation = z.object({ contest: z.object({ contest_id: count, key: z.string(), name: z.string(), url: z.string(), start_time: z.string(), end_time: z.string() }),
  status: z.string(), participation: z.object({ participation_id: count, mode: z.string(), state: z.string() }).nullable(),
  metrics: z.object({ score: number, contest_rank: count.nullable(), contest_participants: count.nullable(), class_rank: count.nullable(), class_participants: count.nullable(),
    rank_scope: z.string(), submission_count: count.nullable(), attempted_count: count.nullable(), solved_count: count.nullable(), assigned_count: count.nullable() }).nullable(),
  rating: z.object({ value: number, rated_at: z.string() }).nullable() });
export const ojContests = z.object({ account: ojAccount, items: z.array(ojParticipation), next_cursor: z.string().nullable() });
export const ojOrganizations = z.object({ account: ojAccount, items: z.array(z.object({ organization_id: count, slug: z.string(), name: z.string(), url: z.string() })), next_cursor: z.string().nullable() });
export const ojClassResults = z.object({ account: ojAccount, roster_complete: z.boolean(), class_rank_basis: z.string(), contests: z.array(ojParticipation), totals: stats.extend({ assigned_count: count.nullable() }) });
export type OJSummary = z.infer<typeof ojSummary>;
export type OJParticipation = z.infer<typeof ojParticipation>;
export type OJClassResults = z.infer<typeof ojClassResults>;
export type OJActivity = z.infer<typeof ojActivity>;
export const ojContext = z.object({ mapping: z.object({ student_id: z.uuid(), instance_id: z.uuid(), profile_id: count, grant_id: count, grant_revision: count, revision: count, username: z.string(), state: z.literal('active') }).nullable(),
  access: z.unknown(), contest_ids: z.array(count).max(20), contest_revision: count.nullable(), roster: z.array(z.object({ profile_id: count, revision: count, mapping_revision: count })).max(200), roster_complete: z.boolean() });
