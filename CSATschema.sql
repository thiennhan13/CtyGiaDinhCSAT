-- Supabase Database Schema for Công Ty Gia Đình (CSAT TUTOR)
-- Phiên bản hoàn thiện: Hỗ trợ Admin Role, RLS chặt chẽ, logic bù trừ phí CSAT và quản lý học phí

-- ==========================================
-- 0. XÓA BẢNG CŨ ĐỂ LÀM SẠCH DATABASE
-- ==========================================
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS session_attendance CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS class_students CASCADE;
DROP TABLE IF EXISTS student_reviews CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS tutors CASCADE;
DROP TABLE IF EXISTS students CASCADE;

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
  contact_phone VARCHAR(20),
  contact_link VARCHAR(255),
  status VARCHAR(255) DEFAULT 'Đang học',
  is_deleted BOOLEAN DEFAULT false,
  notes TEXT,
  default_tuition_fee DECIMAL(10,2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng: tutors (Gia sư)
CREATE TABLE IF NOT EXISTS tutors (
  tutor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_uid UUID NOT NULL UNIQUE, -- Liên kết với auth.users(id)
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  status VARCHAR(255) DEFAULT 'active',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng: classes (Lớp học)
CREATE TABLE IF NOT EXISTS classes (
  class_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  status VARCHAR(255) DEFAULT 'active',
  class_type VARCHAR(255) NOT NULL DEFAULT 'Lớp Cơ bản',
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

-- 7. Bảng: student_reviews (Nhận xét học sinh)
CREATE TABLE IF NOT EXISTS student_reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  month_year VARCHAR(7),
  general_assessment TEXT,
  learning_attitude TEXT,
  logical_thinking TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Bảng: sessions (Buổi học)
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status session_status DEFAULT 'scheduled',
  csat_fee_snapshot DECIMAL(10,2), -- Chốt giá CSAT khi tạo buỏi học
  billing_period VARCHAR(255), -- Đánh dấu session thuộc kỳ chốt sổ nào
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Bảng: session_attendance (Điểm danh)
CREATE TABLE IF NOT EXISTS session_attendance (
  attendance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  tuition_fee_snapshot DECIMAL(10,2), -- Chốt giá học phí của học sinh tại thời điểm điểm danh
  notes TEXT,
  UNIQUE(session_id, student_id)
);

-- 10. Bảng: payments (Thanh toán/Hóa đơn)
CREATE TABLE IF NOT EXISTS payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  billing_period VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Bảng: announcements (Bảng tin)
CREATE TABLE IF NOT EXISTS announcements (
  announcement_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  link VARCHAR(255),
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Chỉ mục (Indexes) để tối ưu hoá hiệu năng truy vấn
CREATE INDEX IF NOT EXISTS idx_classes_tutor_id ON public.classes(tutor_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON public.class_students(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON public.sessions(class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON public.sessions(date);
CREATE INDEX IF NOT EXISTS idx_session_attendance_student_id ON public.session_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_billing_period ON public.payments(billing_period);

-- ==========================================
-- THIẾT LẬP BẢO MẬT (ROW LEVEL SECURITY)
-- ==========================================

ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_reviews ENABLE ROW LEVEL SECURITY;

-- Helper Function: Kiểm tra Admin thông qua JWT (hỗ trợ app_metadata, user_metadata và email csattutor@gmail.com)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
DECLARE
  user_email VARCHAR;
BEGIN
  user_email := auth.jwt() ->> 'email';
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR user_email = 'csattutor@gmail.com';
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

-- 1. Cấp quyền sử dụng schema public cho tất cả các vai trò kết nối
GRANT USAGE ON SCHEMA public TO postgres, service_role, authenticated, anon;

-- 2. Cấp quyền thao tác chi tiết trên toàn bộ các bảng hiện có trong schema public
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;

-- 3. Cấu hình mặc định: Các bảng và sequence tạo mới trong tương lai sẽ tự động được cấp quyền này
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated, anon;

-- 1. Xóa tất cả policies cũ để dọn dẹp (Tránh xung đột)
DO $$ 
DECLARE 
    tbl VARCHAR; 
    pol VARCHAR; 
BEGIN 
    FOR tbl, pol IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol, tbl); 
    END LOOP; 
END $$;

-- ==========================================
-- POLICIES: ADMIN (TOÀN QUYỀN - ĐÃ THÊM WITH CHECK)
-- ==========================================
-- Đối với lệnh FOR ALL (bao gồm INSERT/UPDATE), bắt buộc phải có WITH CHECK để kiểm tra quyền trước khi ghi vào DB.

CREATE POLICY "Admin_Full_Students" ON students FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Tutors" ON tutors FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Classes" ON classes FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Class_Students" ON class_students FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Sessions" ON sessions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Attendance" ON session_attendance FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Payments" ON payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Announcements" ON announcements FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin_Full_Student_Reviews" ON student_reviews FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- ==========================================
-- POLICIES: TUTOR (CHỈ XEM/SỬA LỚP ĐƯỢC GÁN)
-- ==========================================

-- Quyền SELECT (Đọc) thì chỉ cần USING
CREATE POLICY "Tutor_View_Self" ON tutors FOR SELECT TO authenticated USING (auth_uid = auth.uid());

CREATE POLICY "Tutor_View_Assigned_Students" ON students FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM class_students cs
    JOIN classes c ON cs.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE cs.student_id = students.student_id AND t.auth_uid = auth.uid()
  )
);

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

CREATE POLICY "Public_View_Announcements" ON announcements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tutor_Manage_Own_Reviews" ON student_reviews FOR ALL TO authenticated USING (
  tutor_id = (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid())
) WITH CHECK (
  tutor_id = (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid())
);

-- Quyền UPDATE/ALL (Ghi/Sửa) thì bắt buộc lặp lại logic ở cả USING và WITH CHECK
CREATE POLICY "Tutor_Manage_Assigned_Sessions" ON sessions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM classes c
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE c.class_id = sessions.class_id AND t.auth_uid = auth.uid()
  )
) WITH CHECK (
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
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN classes c ON s.class_id = c.class_id
    JOIN tutors t ON c.tutor_id = t.tutor_id
    WHERE s.session_id = session_attendance.session_id AND t.auth_uid = auth.uid()
  )
);

-- ==========================================
-- RPC: CREATE CLASS FULL (Transaction)
-- ==========================================
CREATE OR REPLACE FUNCTION create_class_full(
    p_name VARCHAR,
    p_class_type VARCHAR,
    p_tutor_id UUID,
    p_csat_fee DECIMAL,
    p_start_date DATE,
    p_end_date DATE,
    p_students JSONB,
    p_sessions JSONB
) RETURNS UUID AS $$
DECLARE
    v_class_id UUID;
    v_student JSONB;
    v_session JSONB;
BEGIN
    -- 1. Create class
    INSERT INTO classes (name, class_type, tutor_id, csat_fee_per_session, start_date, end_date)
    VALUES (p_name, p_class_type, p_tutor_id, p_csat_fee, p_start_date, p_end_date)
    RETURNING class_id INTO v_class_id;

    -- 2. Insert students
    IF p_students IS NOT NULL AND jsonb_array_length(p_students) > 0 THEN
        FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
        LOOP
            INSERT INTO class_students (class_id, student_id, tuition_fee_per_session)
            VALUES (
                v_class_id,
                (v_student->>'student_id')::UUID,
                (v_student->>'tuition_fee_per_session')::DECIMAL
            );
        END LOOP;
    END IF;

    -- 3. Insert sessions
    IF p_sessions IS NOT NULL AND jsonb_array_length(p_sessions) > 0 THEN
        FOR v_session IN SELECT * FROM jsonb_array_elements(p_sessions)
        LOOP
            INSERT INTO sessions (class_id, date, start_time, end_time, csat_fee_snapshot, status)
            VALUES (
                v_class_id,
                (v_session->>'date')::DATE,
                (v_session->>'start_time')::TIME,
                (v_session->>'end_time')::TIME,
                p_csat_fee,
                'scheduled'
            );
        END LOOP;
    END IF;

    RETURN v_class_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bắt buộc Supabase làm mới schema cache để nhận diện function mới
NOTIFY pgrst, 'reload schema';

-- ==========================================
-- SQL MIGRATION SCRIPT (Cập nhật Database cũ)
-- ==========================================
-- Hướng dẫn: Nếu database thực tế trên Supabase của bạn được tạo từ phiên bản cũ và thiếu cột,
-- hãy copy toàn bộ đoạn mã SQL dưới đây và chạy trong SQL Editor của Supabase:

-- 1. Viết lại hàm kiểm tra admin hỗ trợ cả user_metadata, app_metadata và email csattutor@gmail.com
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
DECLARE
  user_email VARCHAR;
BEGIN
  user_email := auth.jwt() ->> 'email';
  RETURN (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR user_email = 'csattutor@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bổ sung cột email vào bảng tutors (Sửa lỗi thiếu cột email)
ALTER TABLE public.tutors 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- 3. Bổ sung cột billing_period và csat_fee_snapshot vào bảng sessions
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS billing_period VARCHAR(255),
ADD COLUMN IF NOT EXISTS csat_fee_snapshot DECIMAL(10,2);

-- 4. Bổ sung cột tuition_fee_snapshot vào bảng session_attendance
ALTER TABLE public.session_attendance 
ADD COLUMN IF NOT EXISTS tuition_fee_snapshot DECIMAL(10,2);

-- 5. Bổ sung class_type vào classes
ALTER TABLE public.classes 
ADD COLUMN IF NOT EXISTS class_type VARCHAR(255) NOT NULL DEFAULT 'Lớp Cơ bản';

-- 6. Tạo bảng student_reviews nếu chưa có (Migration)
CREATE TABLE IF NOT EXISTS public.student_reviews (
  review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES tutors(tutor_id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(class_id) ON DELETE SET NULL,
  month_year VARCHAR(7),
  general_assessment TEXT,
  learning_attitude TEXT,
  logical_thinking TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE public.student_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin_Full_Student_Reviews" ON public.student_reviews;
CREATE POLICY "Admin_Full_Student_Reviews" ON public.student_reviews FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "Tutor_Manage_Own_Reviews" ON public.student_reviews;
CREATE POLICY "Tutor_Manage_Own_Reviews" ON public.student_reviews FOR ALL TO authenticated USING (
  tutor_id = (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid())
) WITH CHECK (
  tutor_id = (SELECT tutor_id FROM tutors WHERE auth_uid = auth.uid())
);

-- 7. Khắc phục lỗi Permission Denied (42501) - Cấp quyền đầy đủ cho các bảng hiện có
GRANT USAGE ON SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, service_role, authenticated, anon;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role, authenticated, anon;

-- ==========================================
-- 6. CẬP NHẬT TÀI KHOẢN ADMIN HIỆN CÓ (csattutor@gmail.com)
-- ==========================================
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Lấy ID của user đã tồn tại
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'csattutor@gmail.com' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- 1. Đặt lại mật khẩu thành Vicsatlanha và cấp quyền admin trong metadata
    UPDATE auth.users 
    SET encrypted_password = crypt('Vicsatlanha', gen_salt('bf')),
        raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"admin"}',
        raw_user_meta_data = '{"name":"Admin CSAT","role":"admin"}'
    WHERE id = v_user_id;

    -- 2. Đưa tài khoản này vào bảng tutors (Gia sư) để có thể hiển thị trên giao diện nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM public.tutors WHERE auth_uid = v_user_id) THEN
      INSERT INTO public.tutors (auth_uid, name, email, status)
      VALUES (v_user_id, 'Admin CSAT', 'csattutor@gmail.com', 'active');
    END IF;
  END IF;
END $$;
