-- Authorized one-time contact repair, not a default for future students.
-- Run only after backup and review. Repeating with unchanged data is a no-op.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE public.students,public.parent_accounts,public.parent_student_links IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE csat_phone_fallback_candidates ON COMMIT DROP AS
 SELECT s.student_id,to_jsonb(s) before_row,btrim(s.parent_name) parent_name,
        csat_internal.parent_phone_domestic(s.student_contact) phone
 FROM public.students s
 WHERE s.is_deleted IS NOT TRUE AND nullif(btrim(s.parent_number),'') IS NULL
   AND csat_internal.parent_phone_domestic(s.student_contact) IS NOT NULL;
-- Never guess identity or silently broaden an existing account's access.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM csat_phone_fallback_candidates WHERE parent_name IS NULL OR length(parent_name) NOT BETWEEN 1 AND 150)
 OR EXISTS(SELECT 1 FROM csat_phone_fallback_candidates GROUP BY phone HAVING count(*)>1)
 OR EXISTS(SELECT 1 FROM csat_phone_fallback_candidates c JOIN public.parent_accounts p USING(phone))
 OR EXISTS(SELECT 1 FROM csat_phone_fallback_candidates c JOIN public.parent_student_links l USING(student_id)) THEN
  RAISE EXCEPTION 'Phone fallback requires manual identity/link review' USING ERRCODE='22023';
 END IF;
END $$;
UPDATE public.students s SET parent_number=c.phone FROM csat_phone_fallback_candidates c WHERE s.student_id=c.student_id;
INSERT INTO public.parent_accounts(display_name,phone,active)
 SELECT parent_name,phone,true FROM csat_phone_fallback_candidates ORDER BY student_id;
INSERT INTO public.parent_student_links(parent_id,student_id)
 SELECT p.parent_id,c.student_id FROM csat_phone_fallback_candidates c JOIN public.parent_accounts p USING(phone);
-- The operator is not impersonating an Auth user. Record the explicit repair.
INSERT INTO public.business_audit_events(entity_table,entity_id,operation,actor_role,before_data,after_data)
 SELECT 'students',s.student_id::text,'UPDATE','authorized_phone_fallback',c.before_row,to_jsonb(s)
 FROM csat_phone_fallback_candidates c JOIN public.students s USING(student_id);
INSERT INTO public.business_audit_events(entity_table,entity_id,operation,actor_role,after_data)
 SELECT 'parent_accounts',p.parent_id::text,'INSERT','authorized_phone_fallback',to_jsonb(p)
 FROM csat_phone_fallback_candidates c JOIN public.parent_accounts p USING(phone);
INSERT INTO public.business_audit_events(entity_table,entity_id,operation,actor_role,after_data)
 SELECT 'parent_student_links',l.parent_id::text||':'||l.student_id::text,'INSERT','authorized_phone_fallback',to_jsonb(l)
 FROM csat_phone_fallback_candidates c JOIN public.parent_accounts p USING(phone)
 JOIN public.parent_student_links l ON l.parent_id=p.parent_id AND l.student_id=c.student_id;
SELECT count(*)::int AS copied_phones_and_linked_accounts FROM csat_phone_fallback_candidates;
COMMIT;
