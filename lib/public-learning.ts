import templates from './learning-curriculum-20260922.json';
import { programs, type ProgramSlug } from './learning-guidance';
export * from './learning-guidance';

// Keep approved sequence and lesson titles shared with the operational templates.
// Internal, explicitly proposed lesson expansions are intentionally not advertised.
export function publicStages(slug: ProgramSlug) {
  const template = templates.find(t => t.program === programs[slug].code)!;
  return template.stages.map(stage => ({
    title: stage.title, range: stage.range,
    description: stage.title === 'Nhị phân & băm'
      ? 'Tìm hiểu cách thu hẹp miền tìm kiếm và làm quen với băm trong xử lý dữ liệu.'
      : stage.description.replace(/^Con /, 'Học sinh '),
    lessons: stage.lessons.map(({ code, title }) => ({ range: code, title })),
  }));
}
