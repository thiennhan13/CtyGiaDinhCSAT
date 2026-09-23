import type { LearningBody, LearningTemplate } from './learning';
export type CurriculumSelection = NonNullable<LearningBody['curriculum']>;
export const defaultCurriculum = (): CurriculumSelection => ({parts:['A','B'],excluded_stage_ids:[],excluded_topic_codes:[],current_stage_id:null});
export const isStructuredCurriculum = (template?: LearningTemplate | null) => !!template?.stages.length && template.stages.every(s=>s.id && s.part && s.lessons.every(l=>l.code));
export function effectiveStages(template: LearningTemplate | null | undefined, body: LearningBody) {
 if(!template)return [];
 const config=body.curriculum ?? defaultCurriculum();
 return template.stages.map((stage,index)=>({...stage,originalIndex:index})).filter(stage=>
  (!stage.part || stage.part==='CD' || config.parts.includes(stage.part)) && !config.excluded_stage_ids.includes(stage.id ?? '')
 ).map(stage=>({...stage,lessons:stage.lessons.filter(l=>!config.excluded_topic_codes.includes(l.code ?? ''))})).filter(stage=>stage.lessons.length>0 || !stage.id);
}
export function curriculumError(template: LearningTemplate | null | undefined, body: LearningBody, publish: boolean): string | null {
 const c=body.curriculum;
 if(!isStructuredCurriculum(template)) return c ? 'Phiên bản cũ không hỗ trợ lựa chọn nội dung theo mã.' : null;
 if(body.stage_index!==null)return 'Chọn chặng bằng mã của khung mới.';
 if(c){
  const unique=(a:string[])=>new Set(a).size===a.length;
  if(!unique(c.parts)||!unique(c.excluded_stage_ids)||!unique(c.excluded_topic_codes))return 'Danh sách lựa chọn bị lặp.';
  if(body.program==='advanced' && (c.parts.length!==2 || !c.parts.includes('A') || !c.parts.includes('B')))return 'Nâng cao sử dụng một khung thống nhất.';
  if(c.excluded_stage_ids.some(id=>!template!.stages.some(s=>s.id===id)) || c.excluded_topic_codes.some(code=>!template!.stages.some(s=>s.lessons.some(l=>l.code===code))))return 'Nội dung không thuộc phiên bản giáo án.';
  if(c.current_stage_id && !effectiveStages(template,body).some(s=>s.id===c.current_stage_id))return 'Chặng đang tập trung không còn trong nội dung lớp. Hãy xác nhận lại.';
 }
 if(publish && !effectiveStages(template,body).some(s=>s.lessons.length))return 'Giữ lại ít nhất một chủ đề trước khi công bố.';
 return null;
}
