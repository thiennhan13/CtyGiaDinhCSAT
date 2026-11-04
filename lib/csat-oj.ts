import { z } from 'zod';

export const ojKind = z.enum(['student', 'class', 'session']);
const count = z.number().int().nonnegative();
const numeric = z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)]).transform(Number);
export const ojLink = z.object({ kind: ojKind, portal_id: z.uuid(), instance_id: z.uuid(), revision: count,
  state: z.enum(['active', 'pending', 'revoked']), payload: z.record(z.string(), z.unknown()) });
export const ojWorkspace = z.object({ admin: z.boolean(),
  classes: z.array(z.object({ class_id: z.uuid(), name: z.string() })),
  students: z.array(z.object({ student_id: z.uuid(), name: z.string() })),
  sessions: z.array(z.object({ session_id: z.uuid(), date: z.string(), start_time: z.string(), status: z.string() })),
  links: z.array(ojLink) });
export type OJWorkspace = z.infer<typeof ojWorkspace>;
export const ojContestList = z.object({ items: z.array(z.object({ id: count, key: z.string(), name: z.string(),
  start_time: z.string(), end_time: z.string() })), next_after: count.nullable() });
export const ojContest = z.object({ contest_id: count, key: z.string(), name: z.string(), start_time: z.string(), end_time: z.string(),
  status: z.enum(['available', 'frozen', 'withheld', 'disqualified', 'not_participated']),
  metrics: z.object({ score: numeric, class_rank: count.nullable(), class_participants: count.nullable(),
    contest_rank: count, contest_participants: count, submissions: count.nullable(), attempted: count.nullable(),
    solved: count.nullable(), total: count, problem_sets: z.object({ assigned: z.array(count), attempted: z.array(count), solved: z.array(count) }).nullable(),
  }).nullable() });
export const ojPractice = z.object({ revision: count, scope: z.literal('public_practice_non_contest'),
  metrics: z.object({ submissions: count, attempted: count, solved: count, total: count, points: numeric }),
  site_rating: numeric.nullable(), account: z.object({ profile_id: count, username: z.string() }) });
export const ojSession = z.object({ session_id: z.uuid(), student_id: z.uuid(), class_id: z.uuid(), revision: count,
  roster_complete: z.boolean(), contests: z.array(ojContest) });
export const ojBatch = z.object({ practice: ojPractice,
  sessions: z.array(z.union([ojSession, z.object({ session_id: z.uuid(), error: z.string() })])) });
export const parentOJContext = z.object({ student: z.object({ revision: count, instance_id: z.uuid() }).nullable(),
  sessions: z.array(z.object({ session_id: z.uuid(), class_id: z.uuid(), class_name: z.string(), date: z.string(),
    revision: count, instance_id: z.uuid() })) });
export type ParentOJContext = z.infer<typeof parentOJContext>;
export type OJSession = z.infer<typeof ojSession>;
export type OJContest = z.infer<typeof ojContest>;
export type ProblemTotals = { attempted: number; solved: number; total: number; complete: boolean };

// Count a problem once even when multiple contests in the same session/class reuse it.
export function problemTotals(contests: OJContest[]): ProblemTotals {
  const assigned = new Set<number>(), attempted = new Set<number>(), solved = new Set<number>();
  let complete = true;
  for (const contest of contests) {
    const sets = contest.metrics?.problem_sets;
    if (!sets) { complete = false; continue; }
    sets.assigned.forEach(id => assigned.add(id)); sets.attempted.forEach(id => attempted.add(id)); sets.solved.forEach(id => solved.add(id));
  }
  return { attempted: attempted.size, solved: solved.size, total: assigned.size, complete };
}
export type ParentOJData = { as_of: string; connected: boolean; practice: z.infer<typeof ojPractice> | null;
  sessions: { session_id: string; class_id: string; class_name: string; date: string; available: boolean;
    totals: ProblemTotals; contests: OJContest[] }[];
  classes: { class_id: string; name: string; totals: ProblemTotals }[] };
