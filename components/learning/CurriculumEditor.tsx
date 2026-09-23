import type { LearningBody, LearningTemplate } from '@/lib/learning';
import { defaultCurriculum, effectiveStages, type CurriculumSelection } from '@/lib/curriculum';
export function CurriculumEditor({body,template,onChange}:{body:LearningBody;template:LearningTemplate;onChange:(patch:Partial<LearningBody>)=>void}){
 const config=body.curriculum ?? defaultCurriculum();
 function update(patch:Partial<CurriculumSelection>){
  const next={...config,...patch};
  if(next.current_stage_id && !effectiveStages(template,{...body,curriculum:next}).some(s=>s.id===next.current_stage_id))next.current_stage_id=null;
  onChange({curriculum:next,stage_index:null});
 }
 const toggle=(items:string[],id:string,include:boolean)=>include?items.filter(x=>x!==id):[...items,id];
 return <div className="space-y-4 rounded-xl border p-4">
  <h3 className="font-bold">Nội dung riêng của lớp</h3>
  <p className="text-xs leading-6 text-muted-foreground">Bỏ hoặc khôi phục nội dung, giữ nguyên thứ tự trong khung. Loại chặng đang tập trung sẽ đưa trạng thái về chưa ghi nhận. Thay đổi chỉ đến phụ huynh khi công bố.</p>
  {body.program==='basic' && <label className="block text-sm">Tầng kiến thức<select className="mt-2 min-h-11 w-full rounded-lg border bg-background px-3" value={config.parts.length===2?'AB':config.parts[0]} onChange={e=>update({parts:e.target.value==='AB'?['A','B']:[e.target.value as 'A'|'B']})}><option value="AB">A + B · Khung đầy đủ</option><option value="A">A · Nhập môn</option><option value="B">B · Cơ bản</option></select></label>}
  {template.stages.filter(s=>s.part==='CD'||config.parts.includes(s.part as 'A'|'B')).map(s=><details key={s.id} className="rounded-lg border p-3"><summary className="min-h-11 cursor-pointer text-sm font-semibold">{s.title}{config.excluded_stage_ids.includes(s.id!)?' · Đã bỏ':''}</summary><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={!config.excluded_stage_ids.includes(s.id!)} onChange={e=>update({excluded_stage_ids:toggle(config.excluded_stage_ids,s.id!,e.target.checked)})}/>Giữ chặng này</label><div className="border-t pt-2">{s.lessons.map(l=><label key={l.code} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" disabled={config.excluded_stage_ids.includes(s.id!)} checked={!config.excluded_topic_codes.includes(l.code!)} onChange={e=>update({excluded_topic_codes:toggle(config.excluded_topic_codes,l.code!,e.target.checked)})}/><span>{l.code} · {l.title}</span></label>)}</div></details>)}
  <button type="button" className="min-h-11 text-sm underline" onClick={()=>update({excluded_stage_ids:[],excluded_topic_codes:[]})}>Khôi phục các mục đã bỏ</button>
  <label className="block text-sm">Chặng đang tập trung<select aria-label="Chặng đang tập trung" className="mt-2 min-h-11 w-full rounded-lg border bg-background px-3" value={config.current_stage_id ?? ''} onChange={e=>update({current_stage_id:e.target.value||null})}><option value="">Chưa ghi nhận</option>{effectiveStages(template,body).map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
 </div>;
}
