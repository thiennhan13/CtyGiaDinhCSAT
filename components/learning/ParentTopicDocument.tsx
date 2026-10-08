import 'server-only';
import { MarkdownAsync } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ReactElement } from 'react';
import { highlightParentCpp } from '@/lib/parent-topic-highlighter';
import type { Root, Element, Text } from 'hast';
import type { Plugin } from 'unified';
import { headingId, type TopicHeading } from '@/lib/parent-topic-document';
import { ParentCodeCopy } from './ParentCodeCopy';
import { prepareParentQuestions } from '@/lib/parent-topic-questions';

function textOf(node: Root | Element | Text): string {
  if (node.type === 'text') return node.value;
  return 'children' in node ? node.children.map(child => textOf(child as Element | Text)).join('') : '';
}

// Only context-free article bodies are shared, never headers, URLs or parent data.
// The route checks the current session and published curriculum before calling this.
const documents = new Map<string, Promise<{ document: ReactElement; headings: TopicHeading[] }>>();
const maxDocuments = 54;

async function renderDocument(markdown: string) {
  const headings: TopicHeading[] = [];
  const prepareDocument: Plugin<[], Root> = () => async tree => {
    prepareParentQuestions(tree);
    async function visit(node: Root | Element) {
      for (const child of node.children) {
        if (child.type !== 'element') continue;
        if (child.tagName === 'h2' || child.tagName === 'h3') {
          const title = textOf(child), id = headingId(title, headings.length);
          child.properties.id = id;
          headings.push({ id, title, depth: Number(child.tagName[1]) });
        }
        if (child.tagName === 'pre') {
          const code = child.children.find(item => item.type === 'element' && item.tagName === 'code') as Element | undefined;
          if (!code) continue;
          const raw = textOf(code).replace(/\n$/, '');
          const classes = (code.properties.className ?? []) as string[];
          const cpp = classes.includes('language-cpp') || classes.includes('language-c++');
          child.properties['data-raw-code'] = raw;
          child.properties['data-code-label'] = cpp ? 'C++' : classes.includes('language-diagram') ? 'Sơ đồ' : 'Mã giả';
          if (cpp) {
            // Produce text/span nodes; never evaluate or inject authored HTML.
            const { tokens } = await highlightParentCpp(raw);
            code.children = tokens.flatMap((line, index) => [
              ...line.map(token => ({ type: 'element' as const, tagName: 'span', properties: { style: 'color:' + token.color }, children: [{ type: 'text' as const, value: token.content }] })),
              ...(index < tokens.length - 1 ? [{ type: 'text' as const, value: '\n' }] : []),
            ]);
          }
        } else await visit(child);
      }
    }
    await visit(tree);
  };
  const document = await MarkdownAsync({
    children: markdown, skipHtml: true, remarkPlugins: [remarkGfm], rehypePlugins: [prepareDocument],
    components: {
      pre: ({ node, children }) => <div className="parent-codeblock"><div className="parent-code-toolbar"><span>{String(node?.properties['data-code-label'] ?? 'Mã giả')}</span><ParentCodeCopy code={String(node?.properties['data-raw-code'] ?? '')}/></div><pre tabIndex={0} aria-label={node?.properties['data-code-label'] === 'Sơ đồ' ? 'Sơ đồ minh họa' : 'Mã minh họa'}>{children}</pre></div>,
      table: ({ children }) => <div className="parent-topic-table" tabIndex={0} role="region" aria-label="Bảng minh họa"><table>{children}</table></div>,
      a: ({ href, children }) => <a href={href} {...(href?.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>,
    },
  });
  return { document, headings };
}

export async function ParentTopicDocument({ markdown }: { markdown: string }) {
  let pending = documents.get(markdown);
  if (!pending) {
    pending = renderDocument(markdown);
    documents.set(markdown, pending);
    if (documents.size > maxDocuments) documents.delete(documents.keys().next().value!);
    // A failed render must not poison subsequent requests.
    void pending.catch(() => { if (documents.get(markdown) === pending) documents.delete(markdown); });
  }
  const { document, headings } = await pending;
  const contents = <nav aria-label="Mục lục bài viết">{headings.map(heading => <a key={heading.id} href={'#' + heading.id} className={heading.depth === 3 ? 'is-subheading' : undefined}>{heading.title}</a>)}</nav>;
  return <div className="parent-topic-layout"><aside className="parent-topic-toc print:hidden"><div className="parent-topic-toc-desktop"><p>Trong bài viết này</p>{contents}</div><details className="parent-topic-toc-mobile"><summary>Trong bài viết này</summary>{contents}</details></aside><div className="parent-topic-content">{document}</div></div>;
}
