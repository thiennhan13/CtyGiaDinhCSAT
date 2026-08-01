/**
 * types/database.ts
 * Centralized TypeScript interfaces cho toàn bộ hệ thống CSAT Tutor.
 * Đây là nguồn duy nhất (Single Source of Truth) cho tất cả các kiểu dữ liệu
 * liên quan đến database — thay thế các local type bị khai báo rải rác.
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
  notes: string | null;
  created_at: string;
}

export interface Tutor {
  tutor_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive';
  auth_uid: string | null;
  created_at: string;
}

export interface Class {
  class_id: string;
  name: string;
  tutor_id: string | null;
  status: 'active' | 'inactive' | 'archived';
  start_date: string | null;
  end_date: string | null;
  schedule_days: string[] | null;
  start_time: string | null;
  end_time: string | null;
  csat_fee_per_session: number;
  created_at: string;
  // Relations (optional — populated by Supabase joins)
  tutors?: Pick<Tutor, 'tutor_id' | 'name' | 'auth_uid'> | Pick<Tutor, 'tutor_id' | 'name' | 'auth_uid'>[];
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
  // Relations
  classes?: Pick<Class, 'class_id' | 'name'> | Pick<Class, 'class_id' | 'name'>[];
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
}

export interface Attendance {
  attendance_id: string;
  session_id: string;
  student_id: string;
  status: 'attended' | 'absent';
  notes: string | null;
  // Relations
  sessions?: Pick<Session, 'session_id' | 'date' | 'start_time' | 'end_time'> & {
    classes?: Pick<Class, 'class_id' | 'name'> | Pick<Class, 'class_id' | 'name'>[];
  };
}

export interface ClassStudent {
  class_student_id: string;
  class_id: string;
  student_id: string;
  status: 'active' | 'inactive';
  tuition_fee_per_session: number;
  enrolled_at: string | null;
  // Relations
  students?: Pick<Student, 'student_id' | 'name' | 'student_contact'>;
  classes?: Pick<Class, 'class_id' | 'name'>;
}

export interface Announcement {
  announcement_id: string;
  title: string;
  content: string;
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

/** Payload dùng khi tạo mới học sinh (các trường bắt buộc / tùy chọn) */
export type CreateStudentInput = Omit<Student, 'student_id' | 'created_at'>;

/** Payload dùng khi cập nhật thông tin học sinh */
export type UpdateStudentInput = Partial<Omit<Student, 'student_id' | 'created_at'>>;

/** Payload dùng khi tạo mới gia sư */
export type CreateTutorInput = Omit<Tutor, 'tutor_id' | 'created_at'>;

/** Payload dùng khi cập nhật gia sư */
export type UpdateTutorInput = Partial<Omit<Tutor, 'tutor_id' | 'created_at'>>;
