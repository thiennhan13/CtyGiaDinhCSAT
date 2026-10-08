import type { ParentPortalData } from './parents';
import type { LearningBody, LearningTemplate } from './learning';
export interface ParentClassProgress {
 class_id: string;
 completed_sessions: number;
 as_of: string;
}
export interface ParentLearningData extends ParentPortalData {
 month: string; reviewPage:number; reviewCount:number;
 plans: {class_id:string;class_name:string;kind:'class'|'student';body:LearningBody;template:LearningTemplate|null;published_at:string}[];
 // Optional while environments without migration 23 retain the older projection.
 class_progress?: ParentClassProgress[];
 attendance:{session_id:string;class_name:string;date:string;start_time:string;end_time:string;session_status:string;status:'attended'|'absent'|null;lesson:LearningBody|null;tuition_amount?:number|null;billing_period?:string|null;fee_adjusted?:boolean}[];
 invoices:{payment_id:string;class_name:string|null;period:string;amount:number;balance:number}[];
 provisional:{class_name:string;month:string;amount:number|null;unknown:number}[];
 tutors:{class_name:string;name:string|null;introduction:string|null;tutor_id?:string|null;background?:string|null;major?:string|null;university?:string|null;achievements?:string|null;avatar_path?:string|null}[];
 contact:{label:string;url:string};
}

// Nullable until an authenticated CSATOJ integration supplies verified data.
export interface ParentOJMetrics {
 student_id:string; class_id:string; contest_id:string|null; as_of:string|null;
 solved:number|null; total:number|null; rank:number|null;
}
