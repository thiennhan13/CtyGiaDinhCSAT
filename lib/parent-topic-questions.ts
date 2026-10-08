import type { Root, Element, Text } from 'hast';

function textOf(node: Element | Text): string {
  return node.type === 'text' ? node.value : node.children.map(child => child.type === 'element' || child.type === 'text' ? textOf(child) : '').join('');
}

// A strict Markdown convention produces native disclosures without allowing authored HTML.
export function prepareParentQuestions(tree: Root): void {
  function visit(node: Root | Element) {
    for (const child of node.children) {
      if (child.type !== 'element') continue;
      if (child.tagName !== 'blockquote') { visit(child); continue; }
      const paragraphs = child.children.filter(item => item.type === 'element') as Element[];
      const [question, answer] = paragraphs;
      const label = question?.children[0];
      const answerLabel = answer?.children[0];
      if (question?.tagName !== 'p' || answer?.tagName !== 'p'
        || label?.type !== 'element' || label.tagName !== 'strong'
        || !/^Câu hỏi [12]:$/.test(textOf(label).trim())
        || answerLabel?.type !== 'element' || answerLabel.tagName !== 'strong'
        || textOf(answerLabel).trim() !== 'Trả lời:'
        || !question.children.slice(1).some(item => item.type === 'element' || (item.type === 'text' && item.value.trim()))) continue;
      answer.children.shift();
      const first = answer.children[0];
      if (first?.type === 'text') first.value = first.value.trimStart();
      child.tagName = 'details';
      child.properties = { className: ['parent-topic-question'] };
      child.children = [
        { type: 'element', tagName: 'summary', properties: {}, children: question.children },
        { type: 'element', tagName: 'div', properties: { className: ['parent-topic-answer'] }, children: paragraphs.slice(1) },
      ];
      visit(child);
    }
  }
  visit(tree);
}
