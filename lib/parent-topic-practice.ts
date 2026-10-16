import type { Root, Element, Text } from 'hast';

function textOf(node: Element | Text): string {
  return node.type === 'text' ? node.value : node.children.map(child => child.type === 'element' || child.type === 'text' ? textOf(child) : '').join('');
}

// Wrap authored practice content without enabling raw HTML or copying URLs into articles.
export function prepareParentPractice(tree: Root, url: string | undefined): void {
  const start = tree.children.findIndex(node => node.type === 'element' && node.tagName === 'h2' && textOf(node) === 'Luyện tập');
  if (start < 0) return;
  const next = tree.children.findIndex((node, index) => index > start && node.type === 'element' && node.tagName === 'h2');
  const end = next < 0 ? tree.children.length : next;
  const children = tree.children.slice(start, end) as Element['children'];
  if (url) children.push({
    type: 'element', tagName: 'p', properties: { className: ['parent-practice-action'] }, children: [
      { type: 'element', tagName: 'a', properties: { href: url, ariaLabel: 'Bài tập cùng chủ đề trên CSATOJ (mở tab mới)' }, children: [{ type: 'text', value: 'Bài tập cùng chủ đề trên CSATOJ ↗' }] },
    ],
  });
  tree.children.splice(start, end - start, { type: 'element', tagName: 'section', properties: { className: ['parent-topic-practice'], ariaLabel: 'Luyện tập' }, children });
}
