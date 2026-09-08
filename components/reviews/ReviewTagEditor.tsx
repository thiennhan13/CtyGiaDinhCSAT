'use client';

import { useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  REVIEW_GROUPS, REVIEW_LEVELS, REVIEW_TAGS, emptyReviewTag, getReviewTag,
  initialReviewScope, normalizeReviewSearch, tagReadiness, type ReviewGroup, type ReviewTagInput,
} from '@/lib/student-reviews';

const control = 'w-full min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function ReviewTagEditor({ value, onChange, classType, disabled }: {
  value: ReviewTagInput[]; onChange: (tags: ReviewTagInput[]) => void; classType: string; disabled: boolean;
}) {
  const [scope, setScope] = useState(initialReviewScope(classType));
  const [group, setGroup] = useState<ReviewGroup>('knowledge');
  const [search, setSearch] = useState('');
  const query = normalizeReviewSearch(search.trim());
  const inScope = (tag: (typeof REVIEW_TAGS)[number]) => scope !== 'basic' || tag.scope === 'both';
  const filtered = REVIEW_TAGS.filter(tag => inScope(tag) && (query
    ? normalizeReviewSearch(`${tag.label} ${tag.evidence} ${tag.keywords || ''} ${REVIEW_GROUPS.find(item => item.id === tag.group)?.label}`).includes(query)
    : tag.group === group));
  const update = (id: string, patch: Partial<ReviewTagInput>) => onChange(value.map(tag => tag.tag_id === id ? { ...tag, ...patch } : tag));

  return <div className="space-y-6">
    <section className="space-y-4 rounded-xl border border-foreground/15 bg-card p-4 sm:p-5" aria-labelledby="tag-library-title">
      <div><h2 id="tag-library-title" className="text-lg font-extrabold">Chọn thẻ nhận xét</h2><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Ưu tiên 3–6 thẻ tiêu biểu, có quan sát cụ thể. Thư viện gồm 64 thẻ kiến thức, kỹ năng, điểm mạnh, tiến bộ và thói quen.</p></div>
      <div><label className="mb-2 block text-xs font-semibold" htmlFor="review-scope">Khung gợi ý kiến thức</label>
        <select id="review-scope" className={control} value={scope} onChange={event => setScope(event.target.value as typeof scope)} disabled={disabled}>
          <option value="basic">Cơ bản</option><option value="advanced">Nâng cao · gồm nền Cơ bản</option><option value="all">Tất cả kiến thức trong danh mục</option>
        </select><p className="mt-1.5 text-[11px] text-muted-foreground">Lọc thư viện để tìm thẻ; các thẻ đã chọn và loại lớp được giữ nguyên.</p>
      </div>
      <div><label htmlFor="review-tag-search" className="mb-2 flex items-center gap-2 text-xs font-semibold"><Search className="size-4" />Tìm thẻ trong mọi nhóm</label>
        <Input id="review-tag-search" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ví dụ: số học, kiểm thử, tự giải…" className="min-h-11" disabled={disabled} />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Nhóm thẻ">
        {REVIEW_GROUPS.map(item => <button key={item.id} type="button" disabled={disabled} aria-pressed={!query && item.id === group}
          className={`min-h-11 rounded-lg border px-3 py-2 text-xs transition-colors disabled:opacity-60 ${!query && item.id === group ? 'border-foreground bg-foreground text-background' : 'border-foreground/15 bg-card hover:border-primary'}`}
          onClick={() => { setGroup(item.id); setSearch(''); }}>{item.label} <span className="opacity-70">{REVIEW_TAGS.filter(tag => tag.group === item.id && inScope(tag)).length}</span></button>)}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">{filtered.length} thẻ phù hợp · Đã chọn {value.length}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {filtered.map(tag => {
          const selected = value.some(item => item.tag_id === tag.id);
          return <button key={tag.id} type="button" aria-pressed={selected} disabled={disabled}
            className={`flex min-h-12 items-center gap-2.5 rounded-lg border p-3 text-left text-xs leading-relaxed disabled:opacity-60 ${selected ? 'border-primary bg-primary/5 text-primary' : 'border-foreground/15 hover:border-primary'}`}
            onClick={() => onChange(selected ? value.filter(item => item.tag_id !== tag.id) : [...value, emptyReviewTag(tag.id)])}>
            {selected ? <Check className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}<span>{tag.label}</span>
          </button>;
        })}
      </div>
      {!filtered.length && <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Chưa có thẻ phù hợp. Thử từ khóa ngắn hơn hoặc đổi khung gợi ý.</p>}
    </section>
    <section className="space-y-3" aria-labelledby="selected-tags-title">
      <h2 id="selected-tags-title" className="text-lg font-extrabold">Bổ sung minh chứng <span className="text-sm font-normal text-muted-foreground">({value.length} thẻ)</span></h2>
      {value.length > 6 && <p className="text-xs text-muted-foreground">Có thể ưu tiên các thẻ tiêu biểu để phụ huynh dễ theo dõi. Mỗi thẻ đều cần minh chứng trước khi gửi.</p>}
      {value.map(tag => {
        const definition = getReviewTag(tag.tag_id);
        if (!definition) return null;
        const assessed = ['knowledge', 'skill'].includes(definition.group);
        const issues = tagReadiness(tag);
        const prefix = `tag-${tag.tag_id}`;
        return <details key={tag.tag_id} open className="group rounded-xl border border-foreground/15 bg-card">
          <summary className="cursor-pointer rounded-t-xl bg-secondary/30 p-4 text-sm font-bold">{definition.label}<span className="mt-1 block text-[11px] font-normal text-muted-foreground">{issues.length ? 'Cần bổ sung thông tin trước khi gửi' : 'Đã có nội dung để xem trước'}</span></summary>
          <div className="space-y-4 border-t border-foreground/10 p-4">
            {!inScope(definition) && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Thẻ Nâng cao đã chọn được giữ lại. Kiểm tra nội dung học thực tế trước khi nhận xét.</p>}
            {assessed && <div><label className="mb-2 block text-xs font-semibold" htmlFor={`${prefix}-level`}>Mức độ quan sát</label>
              <select id={`${prefix}-level`} value={tag.level} disabled={disabled} className={control} onChange={event => update(tag.tag_id, { level: event.target.value as ReviewTagInput['level'] })}>
                <option value="">Chưa chọn mức đánh giá</option>{REVIEW_LEVELS.map(level => <option key={level.id} value={level.id}>{level.label}</option>)}
              </select><p className="mt-1.5 text-[11px] text-muted-foreground">{REVIEW_LEVELS.find(level => level.id === tag.level)?.description || 'Chỉ chọn mức khi đã có quan sát phù hợp.'}</p>
            </div>}
            <p id={`${prefix}-hint`} className="border-l-2 border-primary bg-primary/5 p-3 text-xs leading-relaxed">{definition.evidence}</p>
            {definition.group === 'progress' && <div><label className="mb-2 block text-xs font-semibold" htmlFor={`${prefix}-comparison`}>Lần trước dùng để đối chiếu</label><Textarea id={`${prefix}-comparison`} value={tag.comparison} onChange={event => update(tag.tag_id, { comparison: event.target.value })} maxLength={400} disabled={disabled} placeholder="Lần quan sát, tình huống và mức hỗ trợ trước đây…" className="min-h-24" /></div>}
            <div><label className="mb-2 block text-xs font-semibold" htmlFor={`${prefix}-evidence`}>{definition.group === 'progress' ? 'Biểu hiện trong lần này' : 'Biểu hiện / bài làm cụ thể'}</label>
              <Textarea id={`${prefix}-evidence`} aria-describedby={`${prefix}-hint`} value={tag.evidence} onChange={event => update(tag.tag_id, { evidence: event.target.value })} maxLength={700} disabled={disabled} className="min-h-28" placeholder="Điều con thực hiện được, bài hoặc tình huống và phần cần hỗ trợ…" />
            </div>
            <div><label className="mb-2 block text-xs font-semibold" htmlFor={`${prefix}-next`}>Bước rèn luyện tiếp theo {tag.propose_focus ? '· cần có' : '· tùy nội dung'}</label>
              <Textarea id={`${prefix}-next`} value={tag.next_step} onChange={event => update(tag.tag_id, { next_step: event.target.value })} maxLength={300} disabled={disabled} className="min-h-20" placeholder="Nội dung, cách luyện và mốc rà soát nếu đã thống nhất…" />
            </div>
            {assessed && <label className="flex min-h-11 cursor-pointer items-start gap-2 text-xs leading-relaxed"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={tag.propose_focus} disabled={disabled} onChange={event => update(tag.tag_id, { propose_focus: event.target.checked })} /><span>Đề xuất làm trọng tâm rèn luyện<br /><span className="text-muted-foreground">Trọng tâm được xác nhận riêng; nhận xét này chưa tự thay đổi lộ trình.</span></span></label>}
            <div className="flex items-start justify-between gap-3 border-t border-foreground/10 pt-2"><p className="pt-2 text-[10px] text-muted-foreground">{definition.source || 'Ghi nhận trong phạm vi buổi hoặc giai đoạn review.'}</p><Button type="button" variant="ghost" disabled={disabled} className="min-h-11 shrink-0 text-xs" onClick={() => onChange(value.filter(item => item.tag_id !== tag.tag_id))}><X className="size-3.5" /> Bỏ thẻ</Button></div>
          </div>
        </details>;
      })}
      {!value.length && <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Chọn thẻ từ thư viện để ghi nhận kiến thức, kỹ năng hoặc điểm mạnh của con.</p>}
    </section>
  </div>;
}
