import type { ParentLearningData } from './parent-learning';
import { effectiveStages } from './curriculum';
import { articlesForTopic, isParentTopicFramework, parentTopicHref, type ParentTopicContext } from './parent-topics';
import { csatojPracticeUrl } from './csatoj-practice';

type ClassPlan = ParentLearningData['plans'][number];
/** Input must already come from the authenticated parent_portal RPC, never a client-supplied plan. */
export function accessibleParentRoadmap(portal: ParentLearningData, classId: string): ClassPlan | null {
  if (!portal.student) return null;
  return portal.plans.find(plan => plan.class_id === classId && plan.kind === 'class' && !!plan.published_at) ?? null;
}
export function parentRoadmapHref(context: ParentTopicContext): string {
  return '/parents/lo-trinh/' + context.classId + '?' + new URLSearchParams({ student: context.student, month: context.month, page: String(context.page) });
}
export function parentRoadmapLinks(plan: ClassPlan, context: ParentTopicContext) {
  const articleLinks: Record<string, string> = {}, practiceLinks: Record<string, string> = {};
  const canonical = isParentTopicFramework(plan.template, plan.body);
  if (plan.published_at && canonical) for (const stage of effectiveStages(plan.template, plan.body)) for (const lesson of stage.lessons) {
    const first = lesson.code ? articlesForTopic(lesson.code)[0] : undefined;
    if (first && lesson.code) articleLinks[lesson.code] = parentTopicHref(first.slug, context);
    const practice = lesson.code ? csatojPracticeUrl(lesson.code) : undefined;
    if (lesson.code && practice) practiceLinks[lesson.code] = practice;
  }
  return { canonical, articleLinks, practiceLinks };
}
