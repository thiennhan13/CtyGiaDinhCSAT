import 'server-only';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import cpp from 'shiki/langs/cpp.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';

// Keep the existing grammar/engine and colors, without tracing every language/theme.
// One instance per server worker; no code, parent session or response is cached here.
const highlighter = createHighlighterCore({
  langs: [cpp],
  themes: [githubDark],
  engine: createOnigurumaEngine(import('shiki/wasm')),
});

export async function highlightParentCpp(code: string) {
  return (await highlighter).codeToTokens(code, { lang: 'cpp', theme: 'github-dark' });
}
