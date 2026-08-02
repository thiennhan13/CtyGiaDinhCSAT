/**
 * types/database.ts
 * Centralized TypeScript interfaces cho toàn bộ hệ thống CSAT Tutor.
 * Nguồn duy nhất (Single Source of Truth) đồng bộ 100% với database/CSAT_master_schema.sql.
 */

// ─── Core Entities ─────────────────────────────────────────────────────────────

export interface Student {
  student_id: string;
  name: string;
  date_of_birth: string | null;
  old_age: number | null;
  province: string | null;
  student_contact: string | null;
  parent_contact: string | null;
  parent_name: string | null;
  zalo_class_name: string | null;
  status: 'Đang học' | 'Đã nghỉ' | 'Tạm dừng';
  is_deleted?: boolean;
  notes: string | null;
  created_at: string;
}

export interface Tutor {
  tutor_id: string;
  name: string;
  email: string | null;
  phone?: string | null; // Client payload dùng làm mật khẩu Auth ban đầu
  status: 'active' | 'inactive';
  is_deleted?: boolean;
  auth_uid: string | null;
  created_at: string;
}

export interface Class {
  class_id: string;
  name: string;
  tutor_id: string | null;
  status: 'active' | 'inactive' | 'archived';
  class_type: string;
  start_date: string | null;
  end_date: string | null;
  csat_fee_per_session: number;
  created_at: string;
  // Relations (optional — populated by Supabase joins)
  tutors?: Pick<Tutor, 'tutor_id' | 'name' | 'auth_uid'> | Pick<Tutor, 'tutor_id' | 'name' | 'auth_uid'>[];
}

export interface ClassStudent {
  class_id: string;
  student_id: string;
  status: 'active' | 'dropped';
  tuition_fee_per_session: number;
  created_at: string;
  // Relations
  students?: Pick<Student, 'student_id' | 'name' | 'student_contact'>;
  classes?: Pick<Class, 'class_id' | 'name'>;
}

export interface Session {
  session_id: string;
  class_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  billing_period: string | null;
  csat_fee_snapshot: number | null;
  tutor_id_snapshot: string | null;
  notes: string | null;
  created_at?: string;
  // Relations
  classes?: Pick<Class, 'class_id' | 'name'> | Pick<Class, 'class_id' | 'name'>[];
}

export interface SessionAttendance {
  session_id: string;
  student_id: string;
  status: 'attended' | 'absent';
  tuition_fee_snapshot: number | null;
  notes: string | null;
  // Relations
  sessions?: Pick<Session, 'session_id' | 'date' | 'start_time' | 'end_time'> & {
    classes?: Pick<Class, 'class_id' | 'name'> | Pick<Class, 'class_id' | 'name'>[];
  };
}

export interface Payment {
  payment_id: string;
  student_id: string;
  class_id: string;
  billing_period: string;
  amount: number;
  status: 'paid' | 'unpaid';
  paid_at: string | null;
  created_at: string;
  // Relations
  classes?: Pick<Class, 'class_id' | 'name'> | Pick<Class, 'class_id' | 'name'>[];
  students?: Pick<Student, 'student_id' | 'name'>;
}

export interface ClassChangeLog {
  log_id: string;
  class_id: string;
  change_type: string;
  old_value: string | null;
  new_value: string | null;
  old_label: string | null;
  new_label: string | null;
  effective_date: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Announcement {
  announcement_id: string;
  title: string;
  content: string;
  link?: string | null;
  media_url?: string | null;
  created_at: string;
}

export interface TutorReview {
  review_id: string;
  student_id: string;
  tutor_id: string;
  class_id: string;
  month_year: string;
  general_assessment: string | null;
  learning_attitude: string | null;
  logical_thinking: string | null;
  created_at: string;
  // Relations
  tutors?: Pick<Tutor, 'tutor_id' | 'name'> | Pick<Tutor, 'tutor_id' | 'name'>[];
  classes?: Pick<Class, 'class_id' | 'name'> | Pick<Class, 'class_id' | 'name'>[];
}

// ─── API / Form Types ───────────────────────────────────────────────────────────

/** Payload dùng khi tạo mới học sinh */
export type CreateStudentInput = Omit<Student, 'student_id' | 'created_at'>;

/** Payload dùng khi cập nhật thông tin học sinh */
export type UpdateStudentInput = Partial<Omit<Student, 'student_id' | 'created_at'>>;

/** Payload dùng khi tạo mới gia sư */
export type CreateTutorInput = Omit<Tutor, 'tutor_id' | 'created_at'>;

/** Payload dùng khi cập nhật gia sư */
export type UpdateTutorInput = Partial<Omit<Tutor, 'tutor_id' | 'created_at'>>;
