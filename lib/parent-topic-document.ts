import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parentTopicArticles } from './parent-topics';

export interface TopicHeading { id: string; title: string; depth: number }
export function headingId(text: string, index: number) {
  return 'muc-' + (index + 1) + '-' + text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export async function readParentTopicDocument(slug: string): Promise<string> {
  if (!parentTopicArticles.some(article => article.slug === slug)) throw new Error('Unknown topic document');
  return readFile(join(process.cwd(), 'content', 'parent-topics', slug + '.md'), 'utf8');
}
