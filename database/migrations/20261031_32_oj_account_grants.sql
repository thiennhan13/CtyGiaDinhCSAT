BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261031_31') THEN RAISE EXCEPTION 'Apply 31 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261031_32') THEN RAISE EXCEPTION 'Migration 32 already applied'; END IF;
END $$;
CREATE TABLE public.student_oj_accounts (
 student_id uuid PRIMARY KEY REFERENCES public.students ON DELETE RESTRICT, instance_id uuid NOT NULL,
 profile_id bigint NOT NULL CHECK(profile_id>0), grant_id bigint NOT NULL CHECK(grant_id>0), grant_revision integer NOT NULL CHECK(grant_revision>0),
 username text NOT NULL, state text NOT NULL CHECK(state IN ('active','pending','unavailable')), revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(instance_id,profile_id)
);
CREATE TABLE public.oj_connection_operations (
 request_id uuid PRIMARY KEY, student_id uuid NOT NULL REFERENCES public.students ON DELETE RESTRICT, instance_id uuid NOT NULL,
 expected_revision integer NOT NULL CHECK(expected_revision>=0), code_digest text NOT NULL CHECK(code_digest~'^[a-f0-9]{64}$'),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','complete','abandoned')), created_by uuid NOT NULL REFERENCES auth.users,
 created_at timestamptz NOT NULL DEFAULT now(), reason text NOT NULL CHECK(length(reason) BETWEEN 1 AND 500)
);
CREATE UNIQUE INDEX oj_grant_one_pending ON public.oj_connection_operations(student_id) WHERE state='pending';
CREATE TABLE public.oj_class_organizations (
 class_id uuid PRIMARY KEY REFERENCES public.classes ON DELETE RESTRICT, organization_id bigint NOT NULL CHECK(organization_id>0),
 revision integer NOT NULL DEFAULT 1, updated_by uuid NOT NULL REFERENCES auth.users
);
CREATE TABLE public.oj_session_contests (
 session_id uuid PRIMARY KEY REFERENCES public.sessions ON DELETE RESTRICT, contest_ids bigint[] NOT NULL,
 revision integer NOT NULL DEFAULT 1, updated_by uuid NOT NULL REFERENCES auth.users,
 CHECK(cardinality(contest_ids) BETWEEN 0 AND 20)
);
CREATE TABLE csat_internal.oj_request_budget (
 instance_id uuid NOT NULL, kind text NOT NULL, used integer NOT NULL, reset_at timestamptz NOT NULL,
 blocked_until timestamptz, PRIMARY KEY(instance_id,kind)
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['student_oj_accounts','oj_connection_operations','oj_class_organizations','oj_session_contests'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated,service_role',t);
 EXECUTE format('CREATE TRIGGER audit_write AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write(%L)',t,CASE t WHEN 'oj_connection_operations' THEN 'request_id' WHEN 'oj_class_organizations' THEN 'class_id' WHEN 'oj_session_contests' THEN 'session_id' ELSE 'student_id' END);
 END LOOP;
END $$;
CREATE FUNCTION public.oj_begin_exchange(p_student uuid,p_instance uuid,p_request uuid,p_expected integer,p_digest text,p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.oj_connection_operations; current_rev integer;
BEGIN
 PERFORM csat_internal.require_admin(); PERFORM pg_advisory_xact_lock(7100032);
 SELECT * INTO op FROM public.oj_connection_operations WHERE request_id=p_request;
 IF FOUND THEN
  IF (op.student_id,op.instance_id,op.code_digest,op.expected_revision) IS DISTINCT FROM (p_student,p_instance,p_digest,p_expected) OR op.state='abandoned' THEN RAISE EXCEPTION 'Yêu cầu đã được dùng cho thao tác khác.' USING ERRCODE='23505'; END IF;
  RETURN to_jsonb(op);
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.students WHERE student_id=p_student AND is_deleted IS NOT TRUE) THEN RAISE EXCEPTION 'Không tìm thấy học sinh.' USING ERRCODE='P0002'; END IF;
 SELECT revision INTO current_rev FROM public.student_oj_accounts WHERE student_id=p_student FOR UPDATE;
 IF coalesce(current_rev,0) IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Liên kết đã thay đổi.' USING ERRCODE='40001'; END IF;
 INSERT INTO public.oj_connection_operations(request_id,student_id,instance_id,expected_revision,code_digest,created_by,reason)
 VALUES(p_request,p_student,p_instance,p_expected,p_digest,auth.uid(),btrim(p_reason)) RETURNING * INTO op;
 UPDATE public.student_oj_accounts SET state='pending' WHERE student_id=p_student;
 RETURN to_jsonb(op);
END $$;
CREATE FUNCTION public.oj_finish_exchange(p_request uuid,p_profile bigint,p_grant bigint,p_grant_revision integer,p_username text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.oj_connection_operations; current_rev integer;
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(7100032);
 SELECT * INTO op FROM public.oj_connection_operations WHERE request_id=p_request FOR UPDATE;
 IF op.state='complete' THEN RETURN; END IF;
 IF op.request_id IS NULL OR op.state<>'pending' THEN RAISE EXCEPTION 'Thao tác không còn chờ.' USING ERRCODE='40001'; END IF;
 SELECT revision INTO current_rev FROM public.student_oj_accounts WHERE student_id=op.student_id FOR UPDATE;
 IF coalesce(current_rev,0)<>op.expected_revision THEN RAISE EXCEPTION 'Liên kết đã thay đổi.' USING ERRCODE='40001'; END IF;
 INSERT INTO public.student_oj_accounts(student_id,instance_id,profile_id,grant_id,grant_revision,username,state,revision)
 VALUES(op.student_id,op.instance_id,p_profile,p_grant,p_grant_revision,p_username,'active',op.expected_revision+1)
 ON CONFLICT(student_id) DO UPDATE SET instance_id=excluded.instance_id,profile_id=excluded.profile_id,grant_id=excluded.grant_id,
 grant_revision=excluded.grant_revision,username=excluded.username,state='active',revision=excluded.revision,updated_at=now();
 UPDATE public.oj_connection_operations SET state='complete' WHERE request_id=p_request;
END $$;
CREATE FUNCTION public.oj_exchange_operation(p_request uuid,p_abandon boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE op public.oj_connection_operations; BEGIN
 PERFORM csat_internal.require_admin(); PERFORM pg_advisory_xact_lock(7100032);
 SELECT * INTO op FROM public.oj_connection_operations WHERE request_id=p_request FOR UPDATE;
 IF op.request_id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thao tác.' USING ERRCODE='P0002'; END IF;
 IF p_abandon AND op.state='pending' THEN
  UPDATE public.oj_connection_operations SET state='abandoned' WHERE request_id=p_request;
  UPDATE public.student_oj_accounts SET state='unavailable',revision=revision+1 WHERE student_id=op.student_id;
 END IF;
 RETURN to_jsonb(op)-'code_digest';
END $$;
CREATE FUNCTION public.oj_save_local_mapping(p_kind text,p_id uuid,p_values bigint[],p_revision integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ DECLARE cid uuid; rev integer; BEGIN
 PERFORM pg_advisory_xact_lock(7100032);
 IF p_values IS NULL OR EXISTS(SELECT 1 FROM unnest(p_values) v WHERE v IS NULL OR v<=0) OR cardinality(p_values)<>(SELECT count(DISTINCT v) FROM unnest(p_values)v) THEN RAISE EXCEPTION 'ID không hợp lệ.' USING ERRCODE='22023'; END IF;
 IF p_kind='class' THEN
  PERFORM csat_internal.require_admin();
  IF cardinality(p_values)<>1 THEN RAISE EXCEPTION 'Chọn một organization.' USING ERRCODE='22023'; END IF;
  SELECT revision INTO rev FROM public.oj_class_organizations WHERE class_id=p_id FOR UPDATE;
  IF coalesce(rev,0) IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Mapping đã thay đổi.' USING ERRCODE='40001'; END IF;
  INSERT INTO public.oj_class_organizations(class_id,organization_id,updated_by) VALUES(p_id,p_values[1],auth.uid()) ON CONFLICT(class_id) DO UPDATE SET organization_id=excluded.organization_id,revision=oj_class_organizations.revision+1,updated_by=auth.uid();
 ELSIF p_kind='session' THEN
  SELECT class_id INTO cid FROM public.sessions WHERE session_id=p_id;
  IF auth.uid() IS NULL OR cid IS NULL OR (public.is_admin() IS NOT TRUE AND public.is_current_class_tutor(cid) IS NOT TRUE) THEN RAISE EXCEPTION 'Không có quyền sửa buổi.' USING ERRCODE='42501'; END IF;
  IF cardinality(p_values)>20 THEN RAISE EXCEPTION 'Tối đa 20 contest mỗi buổi.' USING ERRCODE='22023'; END IF;
  SELECT revision INTO rev FROM public.oj_session_contests WHERE session_id=p_id FOR UPDATE;
  IF coalesce(rev,0) IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Mapping đã thay đổi.' USING ERRCODE='40001'; END IF;
  INSERT INTO public.oj_session_contests(session_id,contest_ids,updated_by) VALUES(p_id,p_values,auth.uid()) ON CONFLICT(session_id) DO UPDATE SET contest_ids=excluded.contest_ids,revision=oj_session_contests.revision+1,updated_by=auth.uid();
 ELSE RAISE EXCEPTION 'Mapping không hợp lệ.' USING ERRCODE='22023'; END IF;
END $$;
CREATE FUNCTION public.oj_account_context(p_student uuid,p_session uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE mapping public.student_oj_accounts; roster jsonb; total integer; contest public.oj_session_contests; allowed boolean;
BEGIN
 allowed:=public.is_admin() OR ((public.parent_access()->>'state')='active' AND public.parent_access()->>'student_id'=p_student::text)
 OR EXISTS(SELECT 1 FROM public.class_students cs WHERE cs.student_id=p_student AND cs.status='active' AND public.is_current_class_tutor(cs.class_id));
 IF auth.uid() IS NULL OR allowed IS NOT TRUE THEN RAISE EXCEPTION 'Không có quyền đọc học sinh.' USING ERRCODE='42501'; END IF;
 SELECT * INTO mapping FROM public.student_oj_accounts WHERE student_id=p_student AND state='active';
 IF p_session IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM csat_internal.session_roster(p_session) r WHERE r.student_id=p_student) THEN RAISE EXCEPTION 'Học sinh không thuộc buổi.' USING ERRCODE='42501'; END IF;
  IF public.is_admin() IS NOT TRUE AND (public.parent_access()->>'student_id' IS DISTINCT FROM p_student::text) AND NOT EXISTS(SELECT 1 FROM public.sessions s WHERE s.session_id=p_session AND public.is_current_class_tutor(s.class_id)) THEN RAISE EXCEPTION 'Không có quyền đọc buổi.' USING ERRCODE='42501'; END IF;
  SELECT * INTO contest FROM public.oj_session_contests WHERE session_id=p_session;
  SELECT count(*) INTO total FROM csat_internal.session_roster(p_session);
  SELECT coalesce(jsonb_agg(jsonb_build_object('profile_id',m.profile_id,'revision',m.grant_revision,'mapping_revision',m.revision) ORDER BY m.profile_id),'[]'::jsonb) INTO roster
  FROM csat_internal.session_roster(p_session) r JOIN public.student_oj_accounts m USING(student_id) JOIN public.students st USING(student_id)
  WHERE m.state='active' AND m.instance_id=mapping.instance_id AND st.is_deleted IS NOT TRUE;
 END IF;
 RETURN jsonb_build_object('mapping',CASE WHEN mapping.student_id IS NULL THEN NULL ELSE to_jsonb(mapping) END,'access',public.parent_access(),
 'contest_ids',coalesce(to_jsonb(contest.contest_ids),'[]'::jsonb),'contest_revision',contest.revision,'roster',coalesce(roster,'[]'::jsonb),
 'roster_complete',coalesce(total=jsonb_array_length(roster),false) AND NOT EXISTS(
 SELECT 1 FROM public.sessions s JOIN public.class_fee_history h USING(class_id)
 WHERE s.session_id=p_session AND h.source='baseline' AND s.date<h.effective_from
 AND NOT EXISTS(SELECT 1 FROM public.session_roster_verifications v WHERE v.session_id=p_session)));
END $$;
CREATE FUNCTION public.oj_invalidate_account(p_student uuid,p_revision integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(7100032);
 UPDATE public.student_oj_accounts SET state='unavailable',revision=revision+1,updated_at=now() WHERE student_id=p_student AND revision=p_revision AND state='active';
END $$;
-- Roster profile IDs are server-only, never exposed by a parent-callable RPC.
ALTER FUNCTION public.oj_account_context(uuid,uuid) SET SCHEMA csat_internal;
REVOKE ALL ON FUNCTION csat_internal.oj_account_context(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.oj_account_context(p_student uuid,p_session uuid,p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE claims text:=current_setting('request.jwt.claims',true); u auth.users; result jsonb; BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 SELECT * INTO u FROM auth.users WHERE id=p_actor AND (banned_until IS NULL OR banned_until<now());
 IF u.id IS NULL THEN RAISE EXCEPTION 'Không có quyền.' USING ERRCODE='42501'; END IF;
 PERFORM set_config('request.jwt.claims',jsonb_build_object('role','authenticated','sub',u.id,'app_metadata',u.raw_app_meta_data)::text,true);
 result:=csat_internal.oj_account_context(p_student,p_session);
 PERFORM set_config('request.jwt.claims',claims,true);
 RETURN result;
END $$;
CREATE FUNCTION public.oj_grants_workspace(p_class uuid DEFAULT NULL,p_search text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE adm boolean:=public.is_admin(); BEGIN
 IF auth.uid() IS NULL OR (NOT adm AND public.current_tutor_id() IS NULL) THEN RAISE EXCEPTION 'Không có quyền.' USING ERRCODE='42501'; END IF;
 IF p_class IS NOT NULL AND NOT adm AND NOT public.is_current_class_tutor(p_class) THEN RAISE EXCEPTION 'Không có quyền lớp.' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('classes',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT c.class_id,c.name,m.organization_id,coalesce(m.revision,0) revision FROM public.classes c LEFT JOIN public.oj_class_organizations m USING(class_id) WHERE adm OR public.is_current_class_tutor(c.class_id) ORDER BY c.name LIMIT 200)x),'[]'::jsonb),
 'students',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT s.student_id,s.name,m.profile_id,m.username,m.state,coalesce(m.revision,0) revision,
 (SELECT request_id FROM public.oj_connection_operations o WHERE o.student_id=s.student_id AND o.state='pending') pending_request
 FROM public.students s LEFT JOIN public.student_oj_accounts m USING(student_id) WHERE s.is_deleted IS NOT TRUE AND s.name ILIKE '%'||left(coalesce(p_search,''),80)||'%'
 AND (p_class IS NULL AND adm OR EXISTS(SELECT 1 FROM public.class_students cs WHERE cs.student_id=s.student_id AND cs.class_id=p_class AND cs.status='active')) ORDER BY s.name LIMIT 100)x),'[]'::jsonb),
 'sessions',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT s.session_id,s.date,s.start_time,coalesce(m.contest_ids,'{}') contest_ids,coalesce(m.revision,0) revision FROM public.sessions s LEFT JOIN public.oj_session_contests m USING(session_id) WHERE s.class_id=p_class ORDER BY s.date DESC,s.start_time DESC LIMIT 100)x),'[]'::jsonb));
END $$;
CREATE FUNCTION public.admin_parent_link_details(p_parents uuid[]) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM csat_internal.require_admin();
 IF cardinality(p_parents)>25 THEN RAISE EXCEPTION 'Tối đa 25 hồ sơ.' USING ERRCODE='22023'; END IF;
 RETURN coalesce((SELECT jsonb_object_agg(p.parent_id,jsonb_build_object('email',u.email,'oj',CASE WHEN m.student_id IS NULL THEN NULL ELSE jsonb_build_object('username',m.username,'profile_id',m.profile_id,'state',m.state) END))
 FROM public.parent_accounts p LEFT JOIN public.parent_identity_links i USING(parent_id) LEFT JOIN auth.users u ON u.id=i.auth_uid
 LEFT JOIN public.parent_student_links l USING(parent_id) LEFT JOIN public.student_oj_accounts m USING(student_id)
 WHERE p.parent_id=ANY(p_parents)),'{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.admin_parent_link_details(uuid[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_parent_link_details(uuid[]) TO authenticated;
CREATE FUNCTION public.oj_request_slot(p_instance uuid,p_manage boolean,p_retry integer DEFAULT 0) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b csat_internal.oj_request_budget; k text:=CASE WHEN p_manage THEN 'manage' ELSE 'read' END; lim integer:=CASE WHEN p_manage THEN 30 ELSE 120 END;
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 INSERT INTO csat_internal.oj_request_budget(instance_id,kind,used,reset_at) VALUES(p_instance,k,0,now()+interval '1 minute') ON CONFLICT DO NOTHING;
 SELECT * INTO b FROM csat_internal.oj_request_budget WHERE instance_id=p_instance AND kind=k FOR UPDATE;
 IF p_retry>0 THEN UPDATE csat_internal.oj_request_budget SET blocked_until=now()+make_interval(secs=>least(p_retry,86400)) WHERE instance_id=p_instance AND kind=k; RETURN p_retry; END IF;
 IF b.blocked_until>now() THEN RETURN greatest(1,ceil(extract(epoch FROM b.blocked_until-now()))::integer); END IF;
 IF b.reset_at<=now() THEN b.used:=0; b.reset_at:=now()+interval '1 minute'; END IF;
 IF b.used>=lim THEN RETURN greatest(1,ceil(extract(epoch FROM b.reset_at-now()))::integer); END IF;
 UPDATE csat_internal.oj_request_budget SET used=b.used+1,reset_at=b.reset_at WHERE instance_id=p_instance AND kind=k;
 RETURN 0;
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT oid::regprocedure sig,proname FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
 ('oj_begin_exchange','oj_finish_exchange','oj_exchange_operation','oj_save_local_mapping','oj_account_context','oj_invalidate_account','oj_grants_workspace','oj_request_slot') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.sig);
 EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I',f.sig,CASE WHEN f.proname IN ('oj_finish_exchange','oj_invalidate_account','oj_request_slot','oj_account_context') THEN 'service_role' ELSE 'authenticated' END);
 END LOOP;
 -- Old bindings writers/readers are retired, including when migration28 was installed.
 FOR f IN SELECT oid::regprocedure sig FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('oj_workspace','oj_queue_link','oj_pending','oj_ack','oj_reject','oj_parent_context') LOOP
 EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',f.sig);
 END LOOP;
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261031_32');
NOTIFY pgrst,'reload schema';
COMMIT;
