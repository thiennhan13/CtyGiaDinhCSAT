import { normalizeParentPhone } from './parents';
export interface ParentSource {student_id:string;name:string;parent_name:string|null;parent_number:string|null}
export interface ExistingParent {parent_id:string;display_name:string;phone:string;active:boolean}
export interface ParentImportRow extends ParentSource {phone:string|null;status:'ready'|'existing'|'review';reason:string}
export function previewParentImport(students:ParentSource[],parents:ExistingParent[]):ParentImportRow[]{
 const names=new Map<string,Set<string>>();
 for(const s of students){const phone=normalizeParentPhone(s.parent_number||'');if(phone){const set=names.get(phone)||new Set<string>();set.add((s.parent_name||'').trim());names.set(phone,set);}}
 return students.map(s=>{
  const phone=normalizeParentPhone(s.parent_number||''),name=(s.parent_name||'').trim(),parent=parents.find(p=>p.phone===phone);
  const reason=!phone?'Thiếu số điện thoại hoặc có nhiều nội dung cần đối chiếu.':!name?'Chưa có tên phụ huynh.':(names.get(phone)?.size||0)>1?'Cùng số điện thoại nhưng khác tên phụ huynh.':parent&&!parent.active?'Hồ sơ đang khóa; không tự mở lại.':parent&&parent.display_name.trim()!==name?'Tên khác hồ sơ đang có; cần kiểm tra.':'';
  return {...s,phone,status:reason?'review':parent?'existing':'ready',reason:reason||(parent?'Bổ sung liên kết còn thiếu, giữ thông tin hồ sơ.':'Tạo hồ sơ và liên kết học sinh.')};
 });
}
