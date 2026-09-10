import type { ParentPortalData } from './parents';
import type { LearningBody, LearningTemplate } from './learning';
export interface ParentLearningData extends ParentPortalData {
 month: string; reviewPage:number; reviewCount:number;
 plans: {class_id:string;class_name:string;kind:'class'|'student';body:LearningBody;template:LearningTemplate|null;published_at:string}[];
 attendance:{session_id:string;class_name:string;date:string;start_time:string;end_time:string;session_status:string;status:'attended'|'absent'|null;lesson:LearningBody|null}[];
 invoices:{payment_id:string;class_name:string|null;period:string;amount:number;balance:number}[];
 provisional:{class_name:string;month:string;amount:number|null;unknown:number}[];
 tutors:{class_name:string;name:string|null;introduction:string|null}[];
 contact:{label:string;url:string};
}
