import { z } from 'zod';
const count = z.number().int().nonnegative();
const number = z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)]).transform(Number);
export const ojAccount = z.object({ profile_id: count, username: z.string(), url: z.string() });
export const ojGrantReceipt = z.object({ account: ojAccount, grant: z.object({ id: count, revision: z.number().int().positive(), status: z.literal('active') }) });
const stats = z.object({ submission_count: count.nullable(), attempted_count: count.nullable(), solved_count: count.nullable(), last_submission_at: z.string().nullable(), status: z.string().optional() });
export const ojSummary = z.object({ account: ojAccount, learning: z.object({ scope: z.string(), public_practice: stats, practice: stats, learning_total: stats }),
  site: z.object({ points: number.nullable(), performance_points: number.nullable(), problem_count: count.nullable(), rating: number.nullable(), performance_rank: count.nullable(), rating_rank: count.nullable(), rank_status: z.string() }),
  counts: z.object({ organizations: count, live_contests: count, virtual_participations: count, registered_contests: count }) });
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
export const ojContext = z.object({ mapping: z.object({ student_id: z.uuid(), instance_id: z.uuid(), profile_id: count, grant_id: count, grant_revision: count, revision: count, username: z.string(), state: z.literal('active') }).nullable(),
  access: z.unknown(), contest_ids: z.array(count).max(20), contest_revision: count.nullable(), roster: z.array(z.object({ profile_id: count, revision: count, mapping_revision: count })).max(200), roster_complete: z.boolean() });
