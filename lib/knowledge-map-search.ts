import type { KnowledgeTopic } from './knowledge-map';

export function normalizeKnowledgeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
}

export function matchesKnowledgeTopic(topic: KnowledgeTopic, query: string) {
  const text = normalizeKnowledgeSearch([topic.code, topic.title, topic.description, topic.purpose, topic.approach].join(' '));
  return normalizeKnowledgeSearch(query).split(/\s+/).every(word => text.includes(word));
}
