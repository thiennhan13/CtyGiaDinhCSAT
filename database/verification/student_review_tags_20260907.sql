-- Chỉ đọc. Chạy sau migration 20260907_04_student_review_tags.sql.
-- 1. Phải có đủ 4 cột, đều NOT NULL.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='student_reviews'
  AND column_name IN ('review_context','review_tags','review_status','updated_at')
ORDER BY column_name;

-- 2. Mỗi hàm có một chữ ký; save_student_review là SECURITY INVOKER (false).
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS arguments, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('save_student_review','valid_student_review_tags','guard_student_review_write');

-- 3. Kiểm tra quyền RPC: authenticated=true; anon và service_role=false.
SELECT role_name, has_function_privilege(role_name,
  'public.save_student_review(uuid,uuid,uuid,timestamptz,text,text,text,text,text,text,jsonb)', 'EXECUTE') AS can_save_review
FROM (VALUES ('authenticated'),('anon'),('service_role')) r(role_name);

-- 4. Chính sách phải có insert, update nháp và delete nháp dành cho gia sư.
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname='public' AND tablename='student_reviews'
ORDER BY policyname;

-- 5. Trigger kiểm soát ghi đang bật; hai constraint thẻ/phạm vi đã được xác thực.
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid='public.student_reviews'::regclass AND NOT tgisinternal;
SELECT conname, convalidated FROM pg_constraint
WHERE conrelid='public.student_reviews'::regclass
  AND conname IN ('student_review_tags_valid','student_review_context_valid');

-- 6. Cả hai kết quả phải là true: lọc đã gửi và có nội dung thẻ.
SELECT position('review_status=''published''' IN pg_get_functiondef('public.get_parent_lookup(text,uuid)'::regprocedure)) > 0 AS parents_only_published,
       position('review_tags' IN pg_get_functiondef('public.get_parent_lookup(text,uuid)'::regprocedure)) > 0 AS parents_receive_tags;
