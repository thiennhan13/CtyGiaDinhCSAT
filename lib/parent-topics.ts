import frameworks from './learning-curriculum-20260922.json';
import { effectiveStages } from './curriculum';
import type { LearningBody, LearningTemplate } from './learning';
import type { ParentLearningData } from './parent-learning';
import introductoryArticles from './parent-topic-catalog/ab.json';
import coreArticles from './parent-topic-catalog/bc.json';
import advancedArticles from './parent-topic-catalog/cd.json';

export interface ParentTopicArticle {
  slug: string;
  topicCode: string;
  order: number;
  title: string;
  excerpt: string;
}

// Approved structure: 43 canonical topic identities, split into 54 reading articles.
export const parentTopicArticles: readonly ParentTopicArticle[] = [
  ...introductoryArticles,
  ...coreArticles,
  ...advancedArticles,
];

function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, v]) => JSON.stringify(key) + ':' + stable(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}

// Match the actual framework, not a similarly named or partially copied custom template.
export function isParentTopicFramework(template: LearningTemplate | null | undefined, body: LearningBody): boolean {
  if (!template || body.program !== template.program || body.template_id !== template.template_id) return false;
  return frameworks.some(standard => standard.program === template.program && standard.source === template.source && stable(standard.stages) === stable(template.stages));
}

export function articlesForTopic(code: string): readonly ParentTopicArticle[] {
  return parentTopicArticles.filter(article => article.topicCode === code).sort((a, b) => a.order - b.order);
}

export interface ParentTopicContext { student: string; classId: string; month: string; page: number }
export function parentTopicHref(slug: string, context: ParentTopicContext): string {
  return '/parents/chuyen-de/' + slug + '?' + new URLSearchParams({ student: context.student, class: context.classId, month: context.month, page: String(context.page) });
}
export function parentTopicReturnHref(context: ParentTopicContext): string {
  return '/parents?' + new URLSearchParams({ student: context.student, month: context.month, page: String(context.page) }) + '#roadmap';
}

export function accessibleParentTopic(portal: ParentLearningData, classId: string, slug: string) {
  const article = parentTopicArticles.find(item => item.slug === slug);
  if (!portal.student || !article) return null;
  const plan = portal.plans.find(item => item.kind === 'class' && item.class_id === classId && !!item.published_at);
  if (!plan || !isParentTopicFramework(plan.template, plan.body)) return null;
  if (!effectiveStages(plan.template, plan.body).some(stage => stage.lessons.some(lesson => lesson.code === article.topicCode))) return null;
  return { article, plan, series: articlesForTopic(article.topicCode) };
}
