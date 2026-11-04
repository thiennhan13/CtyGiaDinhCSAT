-- Application cutover required. Does not delete contacts or Auth users.
BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261024_29') THEN RAISE EXCEPTION 'Apply 29 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261031_30') THEN RAISE EXCEPTION 'Migration 30 already applied'; END IF;
 IF EXISTS(SELECT parent_id FROM public.parent_student_links GROUP BY parent_id HAVING count(*)>1)
 OR EXISTS(SELECT student_id FROM public.parent_student_links GROUP BY student_id HAVING count(*)>1) THEN
 RAISE EXCEPTION 'Resolve many-to-many contacts or run the approved reset before migration 30'; END IF;
END $$;
ALTER TABLE public.parent_student_links ADD CONSTRAINT parent_one_student UNIQUE(parent_id), ADD CONSTRAINT student_one_parent UNIQUE(student_id);
ALTER TABLE public.parent_accounts ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.students ADD COLUMN revision integer NOT NULL DEFAULT 1;
CREATE TABLE public.parent_identity_links (
 parent_id uuid PRIMARY KEY REFERENCES public.parent_accounts ON DELETE RESTRICT,
 auth_uid uuid NOT NULL UNIQUE REFERENCES auth.users ON DELETE RESTRICT,
 state text NOT NULL CHECK(state IN ('active','blocked')) DEFAULT 'active',
 method text NOT NULL DEFAULT 'phone_match' CHECK(method IN ('phone_match','admin_transfer')),
 revision integer NOT NULL DEFAULT 1, reason text NOT NULL DEFAULT 'Phone match',
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by uuid REFERENCES auth.users
);
ALTER TABLE public.parent_identity_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parent_identity_links FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.parent_identity_links TO authenticated;
CREATE POLICY identity_admin ON public.parent_identity_links FOR SELECT TO authenticated USING(public.is_admin());
CREATE TRIGGER identity_audit AFTER INSERT OR UPDATE OR DELETE ON public.parent_identity_links FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write('parent_id');
CREATE TRIGGER contact_audit AFTER INSERT OR UPDATE OR DELETE ON public.parent_accounts FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write('parent_id');
CREATE TRIGGER parent_student_audit AFTER INSERT OR UPDATE OR DELETE ON public.parent_student_links FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write('parent_id');
CREATE TRIGGER student_audit AFTER INSERT OR UPDATE OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write('student_id');

CREATE FUNCTION public.parent_access() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT jsonb_build_object('state',CASE WHEN p.active AND i.state='active' AND s.is_deleted IS NOT TRUE THEN 'active' ELSE 'blocked' END,
 'parent_id',p.parent_id,'student_id',s.student_id,'revision',i.revision,'contact_revision',p.revision)
 FROM public.parent_identity_links i JOIN public.parent_accounts p USING(parent_id)
 JOIN public.parent_student_links l USING(parent_id) JOIN public.students s USING(student_id)
 WHERE i.auth_uid=auth.uid()),jsonb_build_object('state','unlinked'))
$$;

CREATE FUNCTION public.claim_parent_phone(p_phone text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.parent_accounts; existing public.parent_identity_links;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND
 (u.raw_app_meta_data->>'provider'='google' OR coalesce(u.raw_app_meta_data->'providers','[]'::jsonb)?'google')) THEN
 RAISE EXCEPTION 'Đăng nhập Google trước khi liên kết.' USING ERRCODE='42501'; END IF;
 p_phone:=csat_internal.parent_phone_domestic(p_phone);
 IF p_phone IS NULL THEN RAISE EXCEPTION 'Số điện thoại không hợp lệ.' USING ERRCODE='22023'; END IF;
 -- Same lock order for claims, contact changes and transfers. Unique constraints are the final guard.
 PERFORM pg_advisory_xact_lock(7100030);
 IF NOT public.consume_auth_attempt(md5('claim-source:'||auth.uid()::text)||md5('claim-source:'||auth.uid()::text),md5('claim:'||auth.uid()::text)||md5('claim:'||auth.uid()::text)) THEN RETURN jsonb_build_object('code','RATE_LIMITED'); END IF;
 SELECT * INTO p FROM public.parent_accounts WHERE phone=p_phone FOR UPDATE;
 IF p.parent_id IS NULL THEN RETURN jsonb_build_object('code','PHONE_NOT_FOUND'); END IF;
 SELECT * INTO existing FROM public.parent_identity_links WHERE parent_id=p.parent_id FOR UPDATE;
 IF existing.auth_uid IS NOT NULL AND existing.auth_uid<>auth.uid() THEN RETURN jsonb_build_object('code','PHONE_ALREADY_LINKED'); END IF;
 IF NOT p.active OR existing.state='blocked' THEN RETURN jsonb_build_object('code','LINK_BLOCKED'); END IF;
 IF EXISTS(SELECT 1 FROM public.parent_identity_links WHERE auth_uid=auth.uid() AND parent_id<>p.parent_id) THEN RETURN jsonb_build_object('code','ACCOUNT_ALREADY_LINKED'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.parent_student_links l JOIN public.students s USING(student_id) WHERE l.parent_id=p.parent_id AND s.is_deleted IS NOT TRUE) THEN RETURN jsonb_build_object('code','PHONE_NOT_FOUND'); END IF;
 INSERT INTO public.parent_identity_links(parent_id,auth_uid,updated_by) VALUES(p.parent_id,auth.uid(),auth.uid()) ON CONFLICT(parent_id) DO NOTHING;
 RETURN public.parent_access();
END $$;

CREATE FUNCTION public.admin_transfer_parent(p_parent_id uuid,p_auth_uid uuid,p_revision integer,p_reason text,p_blocked boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i public.parent_identity_links;
BEGIN
 PERFORM csat_internal.require_admin(); PERFORM pg_advisory_xact_lock(7100030);
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000 OR p_blocked IS NULL THEN RAISE EXCEPTION 'Cần ghi lý do.' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.parent_accounts WHERE parent_id=p_parent_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy phụ huynh.' USING ERRCODE='P0002'; END IF;
 SELECT * INTO i FROM public.parent_identity_links WHERE parent_id=p_parent_id FOR UPDATE;
 IF coalesce(i.revision,0) IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Liên kết đã thay đổi. Tải lại.' USING ERRCODE='40001'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_auth_uid AND (u.raw_app_meta_data->>'provider'='google' OR coalesce(u.raw_app_meta_data->'providers','[]'::jsonb)?'google')) THEN
 RAISE EXCEPTION 'Tài khoản nhận phải đã đăng nhập Google.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.parent_identity_links(parent_id,auth_uid,state,method,reason,updated_by)
 VALUES(p_parent_id,p_auth_uid,CASE WHEN p_blocked THEN 'blocked' ELSE 'active' END,'admin_transfer',btrim(p_reason),auth.uid())
 ON CONFLICT(parent_id) DO UPDATE SET auth_uid=excluded.auth_uid,state=excluded.state,method=excluded.method,reason=excluded.reason,
 revision=parent_identity_links.revision+1,updated_at=now(),updated_by=auth.uid();
 RETURN jsonb_build_object('ok',true);
END $$;

CREATE FUNCTION public.admin_parent_google_candidates(p_email text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM csat_internal.require_admin();
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',u.id,'email',u.email)) FROM auth.users u
 WHERE lower(u.email)=lower(btrim(p_email)) AND (u.raw_app_meta_data->>'provider'='google' OR coalesce(u.raw_app_meta_data->'providers','[]'::jsonb)?'google')),'[]'::jsonb);
END $$;

-- Preserve all existing published projections; replace only the identity gate.
DO $$ DECLARE d text; a text := 'JOIN public.parent_lookup_sessions s ON s.parent_id=p.parent_id';
 b text := 's.token_hash=p_token_hash AND s.expires_at>CURRENT_TIMESTAMP AND p.active AND public.parent_phone_session_valid(s.token_hash)'; BEGIN
 d:=pg_get_functiondef('public.get_parent_lookup(text,uuid)'::regprocedure);
 IF strpos(d,a)=0 OR strpos(d,b)=0 THEN RAISE EXCEPTION 'Unexpected parent read model'; END IF;
 EXECUTE replace(replace(d,a,'JOIN public.parent_identity_links i ON i.parent_id=p.parent_id'),b,'i.auth_uid=auth.uid() AND i.state=''active'' AND p.active');
END $$;
CREATE FUNCTION public.parent_portal(p_student_id uuid DEFAULT NULL,p_month text DEFAULT NULL,p_review_page integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT public.parent_learning_portal(NULL,p_student_id,p_month,p_review_page) $$;
REVOKE ALL ON FUNCTION public.parent_learning_portal(text,uuid,text,integer),public.get_parent_lookup(text,uuid),
 public.start_parent_phone_session(text,text,text,text),public.parent_phone_session_valid(text) FROM PUBLIC,anon,authenticated,service_role;
DELETE FROM public.parent_lookup_sessions;

-- Synchronize student contact fields behind a single admin RPC; direct writes are revoked.
CREATE FUNCTION public.admin_save_student(p_student_id uuid,p_data jsonb,p_revision integer DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s public.students; n public.students; p public.parent_accounts; sid uuid:=coalesce(p_student_id,gen_random_uuid()); v_phone text;
BEGIN
 PERFORM csat_internal.require_admin(); PERFORM pg_advisory_xact_lock(7100030);
 IF jsonb_typeof(p_data)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_data) k WHERE k NOT IN
 ('name','date_of_birth','old_age','province','student_contact','parent_number','parent_link','parent_name','status','notes','is_deleted')) THEN
 RAISE EXCEPTION 'Dữ liệu học sinh không hợp lệ.' USING ERRCODE='22023'; END IF;
 SELECT * INTO s FROM public.students WHERE student_id=sid FOR UPDATE;
 IF p_student_id IS NOT NULL AND s.student_id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy học sinh.' USING ERRCODE='P0002'; END IF;
 IF p_student_id IS NOT NULL AND s.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Hồ sơ đã thay đổi. Tải lại.' USING ERRCODE='40001'; END IF;
 n:=jsonb_populate_record(s,p_data); v_phone:=csat_internal.parent_phone_domestic(n.parent_number);
 IF length(btrim(coalesce(n.name,''))) NOT BETWEEN 1 AND 200 OR (nullif(btrim(n.parent_number),'') IS NOT NULL AND v_phone IS NULL)
 OR (v_phone IS NOT NULL AND nullif(btrim(n.parent_name),'') IS NULL) THEN RAISE EXCEPTION 'Kiểm tra tên học sinh, tên phụ huynh và số điện thoại.' USING ERRCODE='22023'; END IF;
 SELECT a.* INTO p FROM public.parent_accounts a JOIN public.parent_student_links l USING(parent_id) WHERE l.student_id=sid FOR UPDATE OF a;
 IF p.parent_id IS NOT NULL AND v_phone IS NULL THEN RAISE EXCEPTION 'Dùng quản lý phụ huynh để khóa liên kết trước khi bỏ liên hệ.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.students(student_id,name,date_of_birth,old_age,province,student_contact,parent_number,parent_link,parent_name,status,notes,is_deleted)
 VALUES(sid,btrim(n.name),n.date_of_birth,n.old_age,n.province,n.student_contact,v_phone,n.parent_link,n.parent_name,coalesce(n.status,'Đang học'),n.notes,coalesce(n.is_deleted,false))
 ON CONFLICT(student_id) DO UPDATE SET name=excluded.name,date_of_birth=excluded.date_of_birth,old_age=excluded.old_age,province=excluded.province,
 student_contact=excluded.student_contact,parent_number=excluded.parent_number,parent_link=excluded.parent_link,parent_name=excluded.parent_name,
 status=excluded.status,notes=excluded.notes,is_deleted=excluded.is_deleted,revision=students.revision+1;
 IF v_phone IS NOT NULL THEN
  IF p.parent_id IS NULL THEN
   INSERT INTO public.parent_accounts(display_name,phone,updated_by) VALUES(btrim(n.parent_name),v_phone,auth.uid()) RETURNING * INTO p;
   INSERT INTO public.parent_student_links(parent_id,student_id,created_by) VALUES(p.parent_id,sid,auth.uid());
  ELSE
   IF p.phone IS DISTINCT FROM v_phone OR coalesce(n.is_deleted,false) THEN
    UPDATE public.parent_identity_links SET state='blocked',revision=revision+1,reason='Student contact changed',updated_at=now(),updated_by=auth.uid() WHERE parent_id=p.parent_id;
   END IF;
   UPDATE public.parent_accounts SET phone=v_phone,display_name=btrim(n.parent_name),revision=revision+1,updated_at=now(),updated_by=auth.uid() WHERE parent_id=p.parent_id;
  END IF;
 END IF;
 RETURN (SELECT to_jsonb(x) FROM public.students x WHERE student_id=sid);
END $$;

CREATE FUNCTION public.admin_save_parent(p_parent_id uuid,p_display_name text,p_phone text,p_student_id uuid,p_active boolean,p_revision integer DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.parent_accounts; pid uuid:=coalesce(p_parent_id,gen_random_uuid()); old_student uuid;
BEGIN
 PERFORM csat_internal.require_admin(); PERFORM pg_advisory_xact_lock(7100030);
 p_phone:=csat_internal.parent_phone_domestic(p_phone);
 IF p_phone IS NULL OR length(btrim(coalesce(p_display_name,''))) NOT BETWEEN 1 AND 150 OR p_active IS NULL THEN RAISE EXCEPTION 'Liên hệ không hợp lệ.' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.students WHERE student_id=p_student_id AND is_deleted IS NOT TRUE FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Chọn một học sinh hợp lệ.' USING ERRCODE='22023'; END IF;
 SELECT * INTO p FROM public.parent_accounts WHERE parent_id=pid FOR UPDATE;
 IF p_parent_id IS NOT NULL AND (p.parent_id IS NULL OR p.revision IS DISTINCT FROM p_revision) THEN RAISE EXCEPTION 'Hồ sơ đã thay đổi. Tải lại.' USING ERRCODE='40001'; END IF;
 SELECT student_id INTO old_student FROM public.parent_student_links WHERE parent_id=pid;
 IF p.parent_id IS NOT NULL AND (p.phone IS DISTINCT FROM p_phone OR old_student IS DISTINCT FROM p_student_id OR NOT p_active) THEN
  UPDATE public.parent_identity_links SET state='blocked',revision=revision+1,reason='Admin contact changed',updated_at=now(),updated_by=auth.uid() WHERE parent_id=pid;
 END IF;
 INSERT INTO public.parent_accounts(parent_id,display_name,phone,active,updated_by) VALUES(pid,btrim(p_display_name),p_phone,p_active,auth.uid())
 ON CONFLICT(parent_id) DO UPDATE SET display_name=excluded.display_name,phone=excluded.phone,active=excluded.active,revision=parent_accounts.revision+1,updated_at=now(),updated_by=auth.uid();
 DELETE FROM public.parent_student_links WHERE parent_id=pid AND student_id<>p_student_id;
 INSERT INTO public.parent_student_links(parent_id,student_id,created_by) VALUES(pid,p_student_id,auth.uid()) ON CONFLICT(parent_id,student_id) DO NOTHING;
 IF old_student IS NOT NULL AND old_student<>p_student_id THEN UPDATE public.students SET parent_number=NULL,parent_name=NULL,revision=revision+1 WHERE student_id=old_student; END IF;
 UPDATE public.students SET parent_number=p_phone,parent_name=btrim(p_display_name),revision=revision+1 WHERE student_id=p_student_id;
 RETURN pid;
END $$;
REVOKE INSERT,UPDATE,DELETE ON public.students,public.parent_accounts,public.parent_student_links FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.admin_save_parent_contact(uuid,text,text,uuid[],boolean) FROM PUBLIC,anon,authenticated,service_role;
-- The legacy import remains available for unreconciled contacts, sharing the claim lock.
DO $$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('public.admin_import_parent_contacts(jsonb)'::regprocedure);
 EXECUTE replace(d,'PERFORM csat_internal.require_admin();','PERFORM csat_internal.require_admin(); PERFORM pg_advisory_xact_lock(7100030);');
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure sig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('parent_access','claim_parent_phone','parent_portal','admin_transfer_parent','admin_parent_google_candidates','admin_save_student','admin_save_parent') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.sig);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.sig);
 END LOOP;
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261031_30');
NOTIFY pgrst,'reload schema';
COMMIT;
