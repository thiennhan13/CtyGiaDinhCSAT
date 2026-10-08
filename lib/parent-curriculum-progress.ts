import { effectiveStages, isStructuredCurriculum } from './curriculum';
import type { LearningBody, LearningTemplate } from './learning';
import type { ParentClassProgress } from './parent-learning';

type EffectiveStage = ReturnType<typeof effectiveStages>[number];

export interface ParentCurriculumProgress {
 stage: EffectiveStage | null;
 source: 'sessions' | 'published' | 'none';
 preparing: boolean;
 completedSessions: number | null;
 topicCode: string | null;
 asOf: string | null;
}

/** A class pacing indicator only: never writes progress or claims student mastery. */
export function resolveParentCurriculumProgress(
 template: LearningTemplate | null | undefined,
 body: LearningBody,
 progress?: ParentClassProgress | null,
): ParentCurriculumProgress {
 const stages = effectiveStages(template, body);
 const empty: ParentCurriculumProgress = {
  stage: null, source: 'none', preparing: false,
  completedSessions: null, topicCode: null, asOf: null,
 };
 // Missing/invalid values are not evidence that a class has completed zero sessions.
 if (isStructuredCurriculum(template) && progress &&
     Number.isSafeInteger(progress.completed_sessions) && progress.completed_sessions >= 0) {
  const topics = stages.flatMap(stage => stage.lessons.map(lesson => ({stage, lesson})));
  if (!topics.length) return empty;
  const topic = topics[Math.min(Math.max(progress.completed_sessions - 1, 0), topics.length - 1)];
  return {
   stage: topic.stage, source: 'sessions', preparing: progress.completed_sessions === 0,
   completedSessions: progress.completed_sessions, topicCode: topic.lesson.code ?? null,
   asOf: progress.as_of,
  };
 }
 const stage = body.curriculum?.current_stage_id
  ? stages.find(candidate => candidate.id === body.curriculum?.current_stage_id)
  : body.stage_index !== null
   ? stages.find(candidate => candidate.originalIndex === body.stage_index)
   : undefined;
 return stage ? {...empty, stage, source: 'published'} : empty;
}
