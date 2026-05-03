-- Supabase Database Schema for Công Ty Gia Đình (CSAT TUTOR)
-- Phiên bản hoàn thiện: Hỗ trợ Admin Role, RLS chặt chẽ, logic bù trừ phí CSAT và quản lý học phí

-- 1. Khởi tạo Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Định nghĩa các kiểu dữ liệu Enum
DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('attended', 'absent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'paid');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE class_student_status AS ENUM ('active', 'dropped');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Bảng: students (Học sinh)
CREATE TABLE IF NOT EXISTS students (
  student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  province VARCHAR(100),
  parent_phone VARCHAR(20),
  facebook_link VARCHAR(255),
  status VARCHAR(255) DEFAULT 'Đang học',
  is_deleted BOOLEAN DEFAULT false,
  default_tuition_fee DECIMAL(10,2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng: tutors (Gia sư)
CREATE TABLE IF NOT EXISTS tutors (
  tutor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_uid UUID NOT NULL UNIQUE, -- Liên kết với auth.users(id)
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(255) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng: classes (Lớp học)
CREATE TABLE IF NOT EXISTS classes (
  class_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(255) DEFAULT 'active',
  csat_fee_per_session DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng: class_students (Bảng trung gian Học sinh - Lớp học)
CREATE TABLE IF NOT EXISTS class_students (
  class_id UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  tuition_fee_per_session DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status class_student_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, student_id)
);

-- 7. Bảng: sessions (Buổi học)
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status session_status DEFAULT 'scheduled',
  csat_fee_snapshot DECIMAL(10,2), -- Chốt giá CSAT khi tạo buỏi học
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bảng: session_attendance (Điểm danh)
CREATE TABLE IF NOT EXISTS session_attendance (
  attendance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  tuition_fee_snapshot DECIMAL(10,2), -- Chốt giá học phí của học sinh tại thời điểm điểm danh
  note TEXT,
  UNIQUE(session_id, student_id)
);

-- 9. Bảng: payments (Thanh toán/Hóa đơn)
CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  billing_period VARCHAR(7) NOT NULL, -- "YYYY-MM"
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Bảng: announcements (Bảng tin)
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  link VARCHAR(255),
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- THIẾT LẬP BẢO MẬT (ROW LEVEL SECURITY)
-- ==========================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Helper Function: Kiểm tra Admin thông qua JWT app_metadata
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies: Admin có quyền tối cao (Toàn quyền)
CREATE POLICY "Admin_Full_Students" ON students FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin_Full_Tutors" ON tutors FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin_Full_Classes" ON classes FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin_Full_Class_Students" ON class_students FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin_Full_Sessions" ON sessions FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin_Full_Attendance" ON session_attendance FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin_Full_Payments" ON payments FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Admin_Full_Announcements" ON announcements FOR ALL TO authenticated USING (is_admin());

-- Policies: Tutors (Chỉ xem và sửa dữ liệu liên quan)
CREATE POLICY "Tutor_View_Assigned_Students" ON students FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON cs.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE cs.student_id = students.student_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_View_Self" ON tutors FOR SELECT TO authenticated USING (auth_uid = auth.uid());

CREATE POLICY "Tutor_View_Assigned_Classes" ON classes FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM tutors t 
    WHERE t.tutor_id = classes.tutor_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_View_Class_Students" ON class_students FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE c.class_id = class_students.class_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_View_Assigned_Sessions" ON sessions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE c.class_id = sessions.class_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_Update_Assigned_Sessions" ON sessions FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE c.class_id = sessions.class_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Tutor_Manage_Attendance" ON session_attendance FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN classes c ON s.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE s.session_id = session_attendance.session_id AND t.auth_uid = auth.uid()
  )
);

CREATE POLICY "Public_View_Announcements" ON announcements FOR SELECT TO authenticated USING (true);
