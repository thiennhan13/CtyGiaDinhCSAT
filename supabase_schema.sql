-- Supabase Database Schema for Công Ty Gia Đình (CSAT TUTOR)
-- Phiên bản hoàn thiện theo đặc tả dự án

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
  status VARCHAR(255) DEFAULT 'Đang học',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng: tutors (Gia sư)
CREATE TABLE IF NOT EXISTS tutors (
  tutor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_uid UUID NOT NULL UNIQUE, -- Liên kết với auth.users
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(255) DEFAULT 'active',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng: classes (Lớp học)
CREATE TABLE IF NOT EXISTS classes (
  class_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(255) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng: class_students (Bảng trung gian Học sinh - Lớp học)
CREATE TABLE IF NOT EXISTS class_students (
  class_id UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  tuition_fee_per_session DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Phí riêng cho từng HS
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bảng: session_attendance (Điểm danh)
CREATE TABLE IF NOT EXISTS session_attendance (
  attendance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, student_id)
);

-- 9. Bảng: payments (Thanh toán/Hóa đơn)
CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  billing_period VARCHAR(7) NOT NULL, -- Định dạng "YYYY-MM"
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
  created_by UUID, -- Thường là admin UID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- THIẾT LẬP BẢO MẬT (ROW LEVEL SECURITY)
-- ==========================================

-- Bật RLS cho tất cả các bảng
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Helper Function: Kiểm tra user có phải Admin không (dựa trên app_metadata)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Chính sách cho bảng students
CREATE POLICY "Admin full access students" ON students FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Tutor view assigned students" ON students FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON cs.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE cs.student_id = students.student_id AND t.auth_uid = auth.uid()
  )
);

-- 2. Chính sách cho bảng tutors
CREATE POLICY "Admin full access tutors" ON tutors FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Tutors view self profile" ON tutors FOR SELECT TO authenticated USING (auth_uid = auth.uid());

-- 3. Chính sách cho bảng classes
CREATE POLICY "Admin full access classes" ON classes FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Tutors view assigned classes" ON classes FOR SELECT TO authenticated USING (
  tutor_id IN (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid())
);

-- 4. Chính sách cho bảng class_students
CREATE POLICY "Admin full access class_students" ON class_students FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Tutors view assigned class_students" ON class_students FOR SELECT TO authenticated USING (
  class_id IN (SELECT class_id FROM classes WHERE tutor_id IN (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid()))
);

-- 5. Chính sách cho bảng sessions
CREATE POLICY "Admin full access sessions" ON sessions FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Tutors view assigned sessions" ON sessions FOR SELECT TO authenticated USING (
  class_id IN (SELECT class_id FROM classes WHERE tutor_id IN (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid()))
);

-- 6. Chính sách cho bảng session_attendance
CREATE POLICY "Admin full access attendance" ON session_attendance FOR ALL TO authenticated USING (is_admin());
CREATE POLICY "Tutors manage assigned attendance" ON session_attendance FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN classes c ON s.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE s.session_id = session_attendance.session_id AND t.auth_uid = auth.uid()
  )
);

-- 7. Chính sách cho bảng payments
CREATE POLICY "Admin full access payments" ON payments FOR ALL TO authenticated USING (is_admin());
-- Phụ huynh/Gia sư không được xem bảng này (theo đặc tả admin_only)

-- 8. Chính sách cho bảng announcements
CREATE POLICY "Anyone view announcements" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage announcements" ON announcements FOR ALL TO authenticated USING (is_admin());

