import curriculum from './learning-curriculum-20260922.json';
import links from './knowledge-map-links.json';
import { roadmapLessonContent } from './public-roadmap-content';
import { csatojPracticeUrl } from './csatoj-practice';

export type KnowledgeLevel = 'A' | 'B' | 'C';
export type KnowledgeTopic = {
  code: string;
  title: string;
  description: string;
  purpose: string;
  approach: string;
  skill: string;
  prerequisites: string[];
  next: string[];
  practiceUrl: string;
};
export type KnowledgeStage = {
  id: string;
  level: KnowledgeLevel;
  title: string;
  description: string;
  topics: KnowledgeTopic[];
};

// Only public curriculum/editorial content. Never import the private article catalog here.
const relations: Record<string, { prerequisites: string[]; practiceTag: number }> = links;
export const knowledgeStages: KnowledgeStage[] = curriculum.flatMap(program => program.stages.map(stage => ({
  id: stage.id,
  level: (stage.part === 'CD' ? 'C' : stage.part) as KnowledgeLevel,
  title: stage.title,
  description: stage.description,
  topics: stage.lessons.map(lesson => ({
    code: lesson.code,
    title: lesson.title,
    description: lesson.description,
    ...roadmapLessonContent[lesson.code],
    prerequisites: relations[lesson.code].prerequisites,
    next: Object.keys(relations).filter(code => relations[code].prerequisites.includes(lesson.code)).sort(),
    practiceUrl: csatojPracticeUrl(lesson.code)!,
  })),
})));
