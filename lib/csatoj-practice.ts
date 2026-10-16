import links from './knowledge-map-links.json';

// IDs matched to the supplied roadmap and public tag selectors on 2026-10-16.
// A topic URL lists related problems; it is not an assignment or a progress feed.
export function csatojPracticeUrl(topicCode: string): string | undefined {
  if (!Object.hasOwn(links, topicCode)) return undefined;
  const { practiceTag } = links[topicCode as keyof typeof links];
  if (!Number.isSafeInteger(practiceTag) || practiceTag <= 0) return undefined;
  return `https://csatoj.vn/problems/?tag=${practiceTag}&point_start=&point_end=`;
}
