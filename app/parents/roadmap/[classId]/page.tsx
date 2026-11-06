import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { parentSession } from '@/lib/parent-auth';
import { monthSchema } from '@/lib/learning';
import type { ParentLearningData } from '@/lib/parent-learning';
import { accessibleParentRoadmap, parentRoadmapLinks } from '@/lib/parent-roadmap';
import { parentTopicReturnHref } from '@/lib/parent-topics';
import { resolveParentCurriculumProgress } from '@/lib/parent-curriculum-progress';
import { ParentShell } from '@/components/learning/ParentShell';
import { ParentKnowledgeMap } from '@/components/learning/ParentKnowledgeMap';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bản đồ kiến thức của lớp | CSAT', robots: { index: false, follow: false, nocache: true } };
const contextSchema = z.object({ student: z.string().uuid(), month: monthSchema.optional(), page: z.coerce.number().int().min(0).max(10000).default(0) });

export default async function ParentRoadmapPage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await parentSession();
  if (!session) redirect('/login');
  if (session.access.state !== 'active') redirect('/parents');
  const context = contextSchema.safeParse(await searchParams), classId = z.string().uuid().safeParse((await params).classId);
  if (!context.success || !classId.success) notFound();
  const { data, error } = await session.supabase.rpc('parent_portal', { p_student_id: context.data.student, p_month: context.data.month ?? null, p_review_page: context.data.page });
  if (error) return <ParentShell navigationEnabled={false}><section className="parent-card"><h1 className="text-2xl font-bold">Bản đồ kiến thức</h1><p className="my-4" role="status">{error.code === '42501' ? 'Quyền xem lớp đã thay đổi. Vui lòng trở về cổng phụ huynh.' : 'Chưa tải được lộ trình. Vui lòng thử lại sau.'}</p><Link className="csat-btn" href="/parents">Về cổng phụ huynh</Link></section></ParentShell>;
  const portal = data as ParentLearningData;
  if (portal?.student?.student_id !== context.data.student) notFound();
  const plan = accessibleParentRoadmap(portal, classId.data);
  if (!plan) notFound();
  const navigation = { student: context.data.student, classId: classId.data, month: portal.month, page: portal.reviewPage };
  const progress = resolveParentCurriculumProgress(plan.template, plan.body, portal.class_progress?.find(item => item.class_id === classId.data));
  return <ParentShell navigationEnabled={false}><section className="parent-card parent-map-page"><Link className="parent-map-back" href={parentTopicReturnHref(navigation)}>← Về lộ trình học tập</Link><h1>Bản đồ kiến thức</h1><p className="mb-5">{plan.class_name}</p><ParentKnowledgeMap body={plan.body} template={plan.template} progress={progress} {...parentRoadmapLinks(plan,navigation)}/></section></ParentShell>;
}
