import type { LearningBody, LearningTemplate } from '@/lib/learning';
import { PROGRAMS } from '@/lib/learning';
import { getReviewTag } from '@/lib/student-reviews';
export function Roadmap({ body, template }: { body: LearningBody; template?: LearningTemplate | null }) {
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-primary/10 px-3 py-2 text-primary">{body.program ? PROGRAMS[body.program] : 'Chưa xác nhận chương trình'}</span>{body.format && <span className="rounded-full bg-secondary px-3 py-2">{body.format === 'individual' ? 'Học 1–1' : 'Học nhóm'}</span>}</div>
    {body.goal && <div><h3 className="font-bold">Mục tiêu đồng hành</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{body.goal}</p></div>}
    {body.focus_tags.length > 0 && <div className="flex flex-wrap gap-2">{body.focus_tags.map(id => <span key={id} className="rounded-lg border border-primary/25 px-3 py-2 text-xs">{getReviewTag(id)?.label || id}</span>)}</div>}
    {body.next_step && <p className="whitespace-pre-wrap rounded-xl bg-accent p-4 text-sm leading-7"><strong>Bước tiếp theo: </strong>{body.next_step}</p>}
    {template ? <>
      <p className="text-xs text-muted-foreground">{template.title} · Phiên bản {template.version}. Khung buổi là kế hoạch tham chiếu; khả năng vận dụng được ghi nhận trong nhận xét tháng.</p>
      <ol className="space-y-4">{template.stages.map((stage, index) => <li key={index} className={'rounded-xl border p-4 sm:p-5 ' + (body.stage_index === index ? 'border-primary bg-primary/5' : 'border-foreground/15')}>
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">Chặng {index + 1}</span><span className="text-xs text-muted-foreground">Buổi {stage.range}</span>{body.stage_index === index && <span className="text-xs font-bold text-primary">Trọng tâm hiện tại</span>}</div>
        <h3 className="mt-3 text-lg font-extrabold">{stage.title}</h3><p className="mt-2 text-sm leading-7">{stage.description}</p>
        <ul className="my-3 list-disc space-y-1 pl-5 text-sm leading-6">{stage.outcomes.map((outcome,i) => <li key={i}>{outcome}</li>)}</ul>
        <div className="space-y-2">{stage.lessons.map((lesson,i) => <details key={i} className="rounded-lg border border-foreground/10 bg-card p-3 print:break-inside-avoid"><summary className="cursor-pointer text-sm font-semibold">Buổi {lesson.range} · {lesson.title}</summary><div className="mt-3 space-y-2 text-sm leading-7"><p>{lesson.description}</p><p className="text-xs text-muted-foreground">{lesson.source}</p></div></details>)}</div>
      </li>)}</ol><p className="text-xs leading-6 text-muted-foreground">Nguồn: {template.source}</p>
    </> : <p className="rounded-xl border border-dashed p-5 text-sm">{body.program === 'voi' ? 'Khung HSGQG đang chờ giáo án được trung tâm xác nhận. Mục tiêu và bước chuẩn bị riêng sẽ được gia sư cập nhật.' : body.program === 'custom' ? 'Lộ trình luyện thi được điều chỉnh theo kỳ thi, mục tiêu và nội dung cần củng cố. Gia sư sẽ cập nhật nội dung phù hợp với lớp.' : 'Gia sư chưa công bố phiên bản giáo án cho lớp.'}</p>}
  </div>;
}
