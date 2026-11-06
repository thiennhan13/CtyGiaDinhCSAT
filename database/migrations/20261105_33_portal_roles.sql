BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM csat_internal.schema_migrations WHERE version='20261031_32') THEN RAISE EXCEPTION 'Apply migration 32 first'; END IF;
 IF EXISTS(SELECT FROM csat_internal.schema_migrations WHERE version='20261105_33') THEN RAISE EXCEPTION 'Migration 33 already applied'; END IF;
END $$;

-- Read the current server-managed identity even when a browser still holds an old JWT.
CREATE FUNCTION csat_internal.parent_identity_allowed(actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS (SELECT FROM auth.users u WHERE u.id=actor
  AND (u.banned_until IS NULL OR u.banned_until <= now())
  AND coalesce(u.raw_app_meta_data->>'role','parent')='parent'
  AND (u.raw_app_meta_data->>'provider'='google' OR coalesce(u.raw_app_meta_data->'providers','[]'::jsonb)?'google'))
$$;
REVOKE ALL ON FUNCTION csat_internal.parent_identity_allowed(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.current_tutor_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT t.tutor_id FROM public.tutors t JOIN auth.users u ON u.id=t.auth_uid
 WHERE u.id=auth.uid() AND u.raw_app_meta_data->>'role'='tutor'
 AND (u.banned_until IS NULL OR u.banned_until <= now())
 AND t.status='active' AND t.is_deleted IS NOT TRUE
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce(auth.jwt()->>'role'='service_role', false) OR EXISTS (
 SELECT FROM auth.users u WHERE u.id=auth.uid() AND u.raw_app_meta_data->>'role'='admin'
 AND (u.banned_until IS NULL OR u.banned_until <= now()))
$$;

CREATE OR REPLACE FUNCTION public.parent_access() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT coalesce((SELECT jsonb_build_object('state',CASE WHEN p.active AND i.state='active' AND s.is_deleted IS NOT TRUE THEN 'active' ELSE 'blocked' END,
 'parent_id',p.parent_id,'student_id',s.student_id,'revision',i.revision,'contact_revision',p.revision)
 FROM public.parent_identity_links i JOIN public.parent_accounts p USING(parent_id)
 JOIN public.parent_student_links l USING(parent_id) JOIN public.students s USING(student_id)
 WHERE i.auth_uid=auth.uid() AND csat_internal.parent_identity_allowed(auth.uid())),jsonb_build_object('state','unlinked'))
$$;

CREATE OR REPLACE FUNCTION public.claim_parent_phone(p_phone text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.parent_accounts; existing public.parent_identity_links;
BEGIN
 IF NOT csat_internal.parent_identity_allowed(auth.uid()) THEN
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

CREATE OR REPLACE FUNCTION public.admin_transfer_parent(p_parent_id uuid,p_auth_uid uuid,p_revision integer,p_reason text,p_blocked boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE i public.parent_identity_links;
BEGIN
 PERFORM csat_internal.require_admin(); PERFORM pg_advisory_xact_lock(7100030);
 IF length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 2000 OR p_blocked IS NULL THEN RAISE EXCEPTION 'Cần ghi lý do.' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.parent_accounts WHERE parent_id=p_parent_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy phụ huynh.' USING ERRCODE='P0002'; END IF;
 SELECT * INTO i FROM public.parent_identity_links WHERE parent_id=p_parent_id FOR UPDATE;
 IF coalesce(i.revision,0) IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Liên kết đã thay đổi. Tải lại.' USING ERRCODE='40001'; END IF;
 IF NOT csat_internal.parent_identity_allowed(p_auth_uid) AND NOT (p_blocked AND i.auth_uid IS NOT NULL AND i.auth_uid=p_auth_uid) THEN
 RAISE EXCEPTION 'Tài khoản nhận phải đã đăng nhập Google.' USING ERRCODE='22023'; END IF;
 INSERT INTO public.parent_identity_links(parent_id,auth_uid,state,method,reason,updated_by)
 VALUES(p_parent_id,p_auth_uid,CASE WHEN p_blocked THEN 'blocked' ELSE 'active' END,'admin_transfer',btrim(p_reason),auth.uid())
 ON CONFLICT(parent_id) DO UPDATE SET auth_uid=excluded.auth_uid,state=excluded.state,method=excluded.method,reason=excluded.reason,
 revision=parent_identity_links.revision+1,updated_at=now(),updated_by=auth.uid();
 RETURN jsonb_build_object('ok',true);
END $$;

CREATE OR REPLACE FUNCTION public.admin_parent_google_candidates(p_email text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM csat_internal.require_admin();
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',u.id,'email',u.email)) FROM auth.users u
 WHERE lower(u.email)=lower(btrim(p_email)) AND csat_internal.parent_identity_allowed(u.id)),'[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.parent_portal(p_student_id uuid DEFAULT NULL,p_month text DEFAULT NULL,p_review_page integer DEFAULT 0) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF public.parent_access()->>'state' IS DISTINCT FROM 'active' THEN
   RAISE EXCEPTION 'Không có quyền phụ huynh.' USING ERRCODE='42501';
 END IF;
 RETURN public.parent_learning_portal(NULL,p_student_id,p_month,p_review_page);
END $$;
-- Own tutor records and staff announcements also require a current staff identity.
ALTER POLICY "Tutor_View_Self" ON public.tutors USING (tutor_id=public.current_tutor_id());
ALTER POLICY "Public_View_Announcements" ON public.announcements USING (public.is_admin() OR public.current_tutor_id() IS NOT NULL);
ALTER POLICY consultation_admin_read ON public.consultation_requests USING (public.is_admin());
ALTER POLICY consultation_email_admin_read ON public.consultation_email_outbox USING (public.is_admin());
ALTER POLICY consultation_history_admin ON public.consultation_status_history USING (public.is_admin());
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261105_33');
NOTIFY pgrst,'reload schema';
COMMIT;
