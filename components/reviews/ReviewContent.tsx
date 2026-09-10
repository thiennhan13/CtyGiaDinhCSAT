import { BookOpen, Star, Target } from 'lucide-react';
import { REVIEW_GROUP_ORDER, REVIEW_GROUPS, REVIEW_LEVELS, type StudentReview } from '@/lib/student-reviews';

export function ReviewContent({ review }: { review: Pick<StudentReview, 'corrections' | 'review_context' | 'review_tags' | 'general_assessment' | 'learning_attitude' | 'logical_thinking'> }) {
  const tags = Array.isArray(review.review_tags) ? review.review_tags : [];
  const texts = [
    ['Đánh giá chung', review.general_assessment],
    ['Thái độ học tập', review.learning_attitude],
    ['Tư duy logic / Giải quyết vấn đề', review.logical_thinking],
  ];
  return (
    <div className="space-y-5 text-sm [overflow-wrap:anywhere]">
      {review.corrections?.map(c=><section key={c.correction_id} className="rounded-xl border border-primary/30 bg-primary/5 p-4"><h3 className="text-sm font-bold">Thông tin đính chính từ trung tâm</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{c.message}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} · Nhận xét gốc được giữ bên dưới để đối chiếu.</p></section>)}
      {review.review_context && <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs whitespace-pre-wrap">{review.review_context}</p>}
      {REVIEW_GROUP_ORDER.map(group => {
        const items = tags.filter(tag => tag.group === group);
        if (!items.length) return null;
        return <section key={group} className="space-y-3" aria-label={REVIEW_GROUPS.find(item => item.id === group)?.label}>
          <h3 className="flex items-center gap-2 text-sm font-bold">
            {group === 'strength' ? <Star className="size-4 text-primary" /> : <BookOpen className="size-4 text-primary" />}
            {REVIEW_GROUPS.find(item => item.id === group)?.label}
          </h3>
          {items.map(tag => <article key={tag.tag_id} className="space-y-2 border-t border-foreground/10 pt-3">
            <h4 className="text-xs font-bold leading-relaxed">{tag.label}</h4>
            {tag.level && <span className="inline-block rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] text-primary">
              {REVIEW_LEVELS.find(level => level.id === tag.level)?.label || tag.level}
            </span>}
            {tag.comparison && <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap"><strong>Đối chiếu với lần trước:</strong> {tag.comparison}</p>}
            {tag.evidence && <p className="text-sm leading-relaxed whitespace-pre-wrap">{tag.evidence}</p>}
            {tag.next_step && <div className="flex items-start gap-2 border-l-2 border-primary pl-3 text-xs leading-relaxed">
              <Target className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <p className="whitespace-pre-wrap"><strong>{tag.propose_focus ? 'Trọng tâm rèn luyện đề xuất' : 'Bước tiếp theo'}:</strong> {tag.next_step}</p>
            </div>}
          </article>)}
        </section>;
      })}
      {texts.filter(([, text]) => text).map(([label, text]) => <section key={label} className="space-y-1.5 rounded-lg border border-foreground/10 bg-background p-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wide">{label}</h3>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      </section>)}
      {!tags.length && !texts.some(([, text]) => text) && <p className="py-6 text-sm text-muted-foreground">Chưa có nội dung nhận xét.</p>}
    </div>
  );
}
