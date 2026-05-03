-- Supabase Database Schema for Công Ty Gia Đình (CSAT TUTOR)

-- To setup, run this in your Supabase SQL Editor.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define custom enum for session attendance
CREATE TYPE attendance_status AS ENUM ('attended', 'absent');
CREATE TYPE payment_status AS ENUM ('unpaid', 'paid');
CREATE TYPE class_student_status AS ENUM ('active', 'dropped');

-- 1. Table: students
CREATE TABLE students (
  student_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(255) DEFAULT 'Đang học',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table: tutors
-- Links to auth.users UID
CREATE TABLE tutors (
  tutor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- auth_uid UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_uid UUID NOT NULL UNIQUE, 
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(255) DEFAULT 'active',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table: classes
CREATE TABLE classes (
  class_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID REFERENCES tutors(tutor_id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(255) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table: class_students
CREATE TABLE class_students (
  class_id UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  tuition_fee_per_session DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status class_student_status DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (class_id, student_id)
);

-- 5. Table: sessions
CREATE TABLE sessions (
  session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(class_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Table: session_attendance
CREATE TABLE session_attendance (
  attendance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(session_id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(student_id) ON DELETE CASCADE,
  status attendance_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, student_id)
);

-- 7. Table: payments
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(student_id),
  class_id UUID REFERENCES classes(class_id),
  billing_period VARCHAR(7) NOT NULL, -- e.g. "2026-04"
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'unpaid',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Row Level Security (RLS) Setup
-- For a robust setup, in reality you should carefully construct these policies.
-- Here we provide baseline policies to enable RLS.

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Note: The admin check requires reading jwt custom claims `role: 'admin'`.
-- For simplified Next.js SSR + Service Role integration, many writes will happen via backend API bypassing RLS.
-- So we can enable read access mostly, and let backend do the writes for admin.

-- Allow read for authenticated users to check their own data or if they are admin.
-- (This is just an example, please refine based on specific strict rules).
CREATE POLICY "Allow authenticated read access" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON tutors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON class_students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON session_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON payments FOR SELECT TO authenticated USING (true);

-- Allow tutors to insert/update their attendance.
CREATE POLICY "Allow attendance update" ON session_attendance FOR ALL TO authenticated USING (true) WITH CHECK(true);
-- Normally you would restrict this to only if the session belongs to them:
-- USING (EXISTS (SELECT 1 FROM sessions s JOIN classes c ON s.class_id = c.class_id JOIN tutors t ON c.tutor_id = t.tutor_id WHERE s.session_id = session_attendance.session_id AND t.auth_uid = auth.uid()));

