import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parentTopicArticles } from './parent-topics';

export interface TopicHeading { id: string; title: string; depth: number }
export function headingId(index: number) { return 'section-' + (index + 1); }
export async function readParentTopicDocument(slug: string): Promise<string> {
  if (!parentTopicArticles.some(article => article.slug === slug)) throw new Error('Unknown topic document');
  return readFile(join(process.cwd(), 'content', 'parent-topics', slug + '.md'), 'utf8');
}
