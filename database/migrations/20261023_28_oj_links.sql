-- OJ metadata only: no changes to attendance, billing, reviews or parent login.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261014_27') THEN
  RAISE EXCEPTION 'Apply migration 27 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261023_28') THEN
  RAISE EXCEPTION 'Migration 28 already applied'; END IF;
END $$;
CREATE TABLE public.oj_links (
 kind text NOT NULL CHECK(kind IN ('student','class','session')), portal_id uuid NOT NULL,
 instance_id uuid NOT NULL, revision integer NOT NULL CHECK(revision>=0),
 state text NOT NULL CHECK(state IN ('pending','active','revoked')),
 payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,portal_id)
);
CREATE UNIQUE INDEX oj_student_unique ON public.oj_links(instance_id,(payload->>'profile_id'))
 WHERE kind='student' AND state<>'revoked';
CREATE UNIQUE INDEX oj_class_unique ON public.oj_links(instance_id,(payload->>'organization_id'))
 WHERE kind='class' AND state<>'revoked';
CREATE TABLE public.oj_link_outbox (
 request_id uuid PRIMARY KEY, kind text NOT NULL, portal_id uuid NOT NULL,
 revision integer NOT NULL, body jsonb NOT NULL, request_input jsonb NOT NULL, previous jsonb,
 acknowledged boolean NOT NULL DEFAULT false, rejection text,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(kind,portal_id) REFERENCES public.oj_links(kind,portal_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX oj_one_pending ON public.oj_link_outbox(kind,portal_id) WHERE NOT acknowledged;
-- Keep the old target reserved during an in-flight replacement, so rejection can restore it safely.
CREATE TABLE public.oj_target_claims (
 kind text NOT NULL CHECK(kind IN ('student','class')), instance_id uuid NOT NULL, target_id text NOT NULL,
 portal_id uuid NOT NULL, PRIMARY KEY(kind,instance_id,target_id),
 FOREIGN KEY(kind,portal_id) REFERENCES public.oj_links(kind,portal_id) ON DELETE RESTRICT
);
ALTER TABLE public.oj_target_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oj_target_claims FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.oj_target_claims TO service_role;
ALTER TABLE public.oj_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oj_link_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.oj_links,public.oj_link_outbox FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.oj_links,public.oj_link_outbox TO service_role;

CREATE FUNCTION public.oj_workspace(p_class_id uuid DEFAULT NULL,p_search text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE admin boolean:=public.is_admin(); result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Chưa đăng nhập.' USING ERRCODE='42501'; END IF;
 IF p_class_id IS NOT NULL AND NOT admin AND NOT public.is_current_class_tutor(p_class_id) THEN
  RAISE EXCEPTION 'Không có quyền truy cập lớp.' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('admin',admin,
 'classes',coalesce((SELECT jsonb_agg(to_jsonb(c)) FROM
  (SELECT class_id,name FROM public.classes WHERE status='active' AND
   (admin OR public.is_current_class_tutor(class_id)) ORDER BY name LIMIT 200)c),'[]'::jsonb),
 'students',CASE WHEN admin THEN coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM
  (SELECT student_id,name FROM public.students WHERE is_deleted IS NOT TRUE
   AND (coalesce(p_search,'')='' OR name ILIKE '%'||left(p_search,80)||'%')
   AND (p_class_id IS NULL OR EXISTS(SELECT 1 FROM public.class_students cs WHERE cs.class_id=p_class_id
    AND cs.student_id=students.student_id AND cs.status='active')) ORDER BY name LIMIT 100)s),'[]'::jsonb)
  ELSE '[]'::jsonb END,
 'sessions',coalesce((SELECT jsonb_agg(to_jsonb(s)) FROM
  (SELECT session_id,date,start_time,status FROM public.sessions WHERE class_id=p_class_id AND status<>'cancelled'
   ORDER BY date DESC,start_time DESC LIMIT 100)s),'[]'::jsonb),
 'links',coalesce((SELECT jsonb_agg(to_jsonb(l)) FROM public.oj_links l WHERE
  (l.kind='class' AND l.portal_id=p_class_id) OR
  (l.kind='session' AND l.payload->>'class_id'=p_class_id::text) OR
  (admin AND l.kind='student' AND EXISTS(SELECT 1 FROM public.students s WHERE s.student_id=l.portal_id
   AND s.is_deleted IS NOT TRUE AND (coalesce(p_search,'')='' OR s.name ILIKE '%'||left(p_search,80)||'%')
   AND (p_class_id IS NULL OR EXISTS(SELECT 1 FROM public.class_students cs WHERE cs.class_id=p_class_id
    AND cs.student_id=s.student_id AND cs.status='active'))))),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;

CREATE FUNCTION public.oj_queue_link(p_kind text,p_id uuid,p_instance uuid,p_expected integer,
 p_active boolean,p_payload jsonb,p_reason text,p_request uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old public.oj_links%ROWTYPE; existing public.oj_link_outbox%ROWTYPE; cid uuid;
 cl public.oj_links%ROWTYPE; students jsonb; total integer; normalized jsonb; body jsonb; input jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Chưa đăng nhập.' USING ERRCODE='42501'; END IF;
 IF p_kind NOT IN ('student','class','session') OR p_id IS NULL OR p_instance IS NULL OR p_request IS NULL
  OR p_expected IS NULL OR p_expected<0 OR p_active IS NULL OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 500 THEN
  RAISE EXCEPTION 'Yêu cầu liên kết không hợp lệ.' USING ERRCODE='22023'; END IF;
 IF p_kind IN ('student','class') THEN PERFORM csat_internal.require_admin();
 ELSE
  SELECT class_id INTO cid FROM public.sessions WHERE session_id=p_id AND status<>'cancelled';
  IF cid IS NULL OR (public.is_admin() IS NOT TRUE AND NOT public.is_current_class_tutor(cid)) THEN
   RAISE EXCEPTION 'Không có quyền sửa buổi học.' USING ERRCODE='42501'; END IF;
 END IF;
 -- Serialize create/update and snapshot the request before doing any remote call.
 PERFORM pg_advisory_xact_lock(hashtextextended('oj:'||p_kind||':'||p_id::text,0));
 input:=jsonb_build_object('kind',p_kind,'id',p_id,'instance',p_instance,'expected',p_expected,
  'active',p_active,'payload',p_payload,'reason',p_reason,'actor',auth.uid());
 SELECT * INTO existing FROM public.oj_link_outbox WHERE request_id=p_request;
 IF FOUND THEN
  IF existing.request_input IS DISTINCT FROM input THEN
   RAISE EXCEPTION 'Mã yêu cầu đã được sử dụng.' USING ERRCODE='23505'; END IF;
  IF existing.rejection IS NOT NULL THEN
   RAISE EXCEPTION 'Yêu cầu trước đã bị từ chối. Kiểm tra dữ liệu và tạo xác nhận mới.' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('request_id',p_request,'revision',existing.revision);
 END IF;
 SELECT * INTO old FROM public.oj_links WHERE kind=p_kind AND portal_id=p_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.oj_link_outbox WHERE kind=p_kind AND portal_id=p_id AND NOT acknowledged) THEN
  RAISE EXCEPTION 'Liên kết đang chờ đồng bộ. Thử đồng bộ lại trước khi sửa.' USING ERRCODE='40001'; END IF;
 IF coalesce(old.revision,0)<>p_expected THEN RAISE EXCEPTION 'Liên kết đã thay đổi; tải lại.' USING ERRCODE='40001'; END IF;
 IF old.instance_id IS NOT NULL AND old.instance_id<>p_instance THEN
  RAISE EXCEPTION 'Nguồn OJ không khớp; cần đối soát riêng.' USING ERRCODE='22023'; END IF;
 IF p_active THEN
  IF p_kind='student' THEN
   IF NOT EXISTS(SELECT 1 FROM public.students WHERE student_id=p_id AND is_deleted IS NOT TRUE)
    OR coalesce(p_payload->>'profile_id','')!~'^[1-9][0-9]{0,9}$' THEN
    RAISE EXCEPTION 'Học sinh/tài khoản không hợp lệ.' USING ERRCODE='22023'; END IF;
   normalized:=jsonb_build_object('profile_id',(p_payload->>'profile_id')::bigint,'username',left(p_payload->>'username',150));
  ELSIF p_kind='class' THEN
   IF NOT EXISTS(SELECT 1 FROM public.classes WHERE class_id=p_id AND status='active')
    OR coalesce(p_payload->>'organization_id','')!~'^[1-9][0-9]{0,9}$' THEN
    RAISE EXCEPTION 'Lớp/tổ chức không hợp lệ.' USING ERRCODE='22023'; END IF;
   normalized:=jsonb_build_object('organization_id',(p_payload->>'organization_id')::bigint,'slug',left(p_payload->>'slug',128));
  ELSE
   SELECT * INTO cl FROM public.oj_links WHERE kind='class' AND portal_id=cid AND state='active' AND instance_id=p_instance;
   IF NOT FOUND THEN RAISE EXCEPTION 'Liên kết tổ chức của lớp chưa sẵn sàng.' USING ERRCODE='22023'; END IF;
   IF jsonb_typeof(p_payload->'contest_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(p_payload->'contest_ids') NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Chọn từ 1 đến 20 contest.' USING ERRCODE='22023'; END IF;
   SELECT count(*) INTO total FROM csat_internal.session_roster(p_id);
   SELECT jsonb_agg(jsonb_build_object('student_id',r.student_id,'revision',l.revision) ORDER BY r.student_id)
    INTO students FROM csat_internal.session_roster(p_id)r JOIN public.students s USING(student_id)
    JOIN public.oj_links l ON l.kind='student' AND l.portal_id=r.student_id AND l.state='active' AND l.instance_id=p_instance
    WHERE s.is_deleted IS NOT TRUE;
   IF total NOT BETWEEN 1 AND 200 OR coalesce(jsonb_array_length(students),0)<>total THEN
    RAISE EXCEPTION 'Cần xác nhận roster và liên kết đầy đủ tài khoản học sinh của buổi.' USING ERRCODE='22023'; END IF;
   normalized:=jsonb_build_object('class_id',cid,'class_revision',cl.revision,'organization_id',cl.payload->'organization_id',
    'contest_ids',p_payload->'contest_ids','roster',students);
  END IF;
 ELSE normalized:=coalesce(old.payload,'{}'::jsonb);
 END IF;
 body:=jsonb_build_object('request_id',p_request,'actor_id',auth.uid(),'reason',btrim(p_reason),
  'expected_revision',p_expected,'active',p_active,'payload',normalized);
 INSERT INTO public.oj_links(kind,portal_id,instance_id,revision,state,payload)
 VALUES(p_kind,p_id,p_instance,p_expected+1,CASE WHEN p_active THEN 'pending' ELSE 'revoked' END,normalized)
 ON CONFLICT(kind,portal_id) DO UPDATE SET revision=excluded.revision,state=excluded.state,payload=excluded.payload,updated_at=now();
 IF p_active AND p_kind IN ('student','class') THEN
  INSERT INTO public.oj_target_claims(kind,instance_id,target_id,portal_id)
  VALUES(p_kind,p_instance,normalized->>CASE WHEN p_kind='student' THEN 'profile_id' ELSE 'organization_id' END,p_id)
  ON CONFLICT(kind,instance_id,target_id) DO UPDATE SET portal_id=excluded.portal_id
   WHERE oj_target_claims.portal_id=excluded.portal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tài khoản/tổ chức đang được giữ bởi liên kết khác.' USING ERRCODE='23505'; END IF;
 END IF;
 INSERT INTO public.oj_link_outbox(request_id,kind,portal_id,revision,body,request_input,previous)
 VALUES(p_request,p_kind,p_id,p_expected+1,body,input,to_jsonb(old));
 RETURN jsonb_build_object('request_id',p_request,'revision',p_expected+1);
END $$;

CREATE FUNCTION public.oj_pending(p_kind text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE cid uuid;
BEGIN
 IF p_kind='session' THEN SELECT class_id INTO cid FROM public.sessions WHERE session_id=p_id; END IF;
 IF public.is_admin() IS NOT TRUE AND (cid IS NULL OR NOT public.is_current_class_tutor(cid)) THEN
  RAISE EXCEPTION 'Không có quyền đồng bộ.' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(to_jsonb(o) ORDER BY revision) FROM public.oj_link_outbox o
  WHERE kind=p_kind AND portal_id=p_id AND NOT acknowledged),'[]'::jsonb);
END $$;
CREATE FUNCTION public.oj_ack(p_request uuid,p_revision integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.oj_link_outbox%ROWTYPE;
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.oj_link_outbox WHERE request_id=p_request FOR UPDATE;
 IF NOT FOUND OR op.revision<>p_revision OR op.rejection IS NOT NULL THEN RAISE EXCEPTION 'Acknowledgement mismatch' USING ERRCODE='22023'; END IF;
 UPDATE public.oj_link_outbox SET acknowledged=true WHERE request_id=p_request;
 UPDATE public.oj_links SET state=CASE WHEN (op.body->>'active')::boolean THEN 'active' ELSE 'revoked' END,updated_at=now()
 WHERE kind=op.kind AND portal_id=op.portal_id AND revision=op.revision;
 IF FOUND THEN
  DELETE FROM public.oj_target_claims c WHERE c.kind=op.kind AND c.portal_id=op.portal_id
   AND ((op.body->>'active')::boolean IS NOT TRUE OR c.target_id IS DISTINCT FROM
    op.body->'payload'->>CASE WHEN op.kind='student' THEN 'profile_id' ELSE 'organization_id' END);
 END IF;
END $$;

-- Called only for a definitive remote validation failure (never a timeout/409).
CREATE FUNCTION public.oj_reject(p_request uuid,p_code text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE op public.oj_link_outbox%ROWTYPE;
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Server only' USING ERRCODE='42501'; END IF;
 SELECT * INTO op FROM public.oj_link_outbox WHERE request_id=p_request FOR UPDATE;
 IF NOT FOUND OR op.acknowledged THEN RETURN; END IF;
 UPDATE public.oj_link_outbox SET acknowledged=true,rejection=left(p_code,100) WHERE request_id=p_request;
 UPDATE public.oj_links SET revision=coalesce((op.previous->>'revision')::integer,0),
  state=coalesce(op.previous->>'state','revoked'),payload=coalesce(op.previous->'payload','{}'::jsonb),updated_at=now()
 WHERE kind=op.kind AND portal_id=op.portal_id AND revision=op.revision;
 DELETE FROM public.oj_target_claims c WHERE c.kind=op.kind AND c.portal_id=op.portal_id
  AND (op.previous->>'state' IS DISTINCT FROM 'active' OR c.target_id IS DISTINCT FROM
   op.previous->'payload'->>CASE WHEN op.kind='student' THEN 'profile_id' ELSE 'organization_id' END);
END $$;

CREATE FUNCTION public.oj_parent_context(p_token_hash text,p_student_id uuid,p_month text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.jwt()->>'role' IS DISTINCT FROM 'service_role' OR NOT public.parent_phone_session_valid(p_token_hash)
  OR NOT EXISTS(SELECT 1 FROM public.parent_lookup_sessions ps JOIN public.parent_student_links pl USING(parent_id)
   JOIN public.students s USING(student_id) WHERE ps.token_hash=p_token_hash AND pl.student_id=p_student_id AND s.is_deleted IS NOT TRUE) THEN
  RAISE EXCEPTION 'Không có quyền xem học sinh.' USING ERRCODE='42501'; END IF;
 IF coalesce(p_month,'')!~'^[0-9]{4}-(0[1-9]|1[0-2])$' THEN RAISE EXCEPTION 'Tháng không hợp lệ.' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('student',(SELECT jsonb_build_object('revision',revision,'instance_id',instance_id)
  FROM public.oj_links WHERE kind='student' AND portal_id=p_student_id AND state='active'),
 'sessions',coalesce((SELECT jsonb_agg(jsonb_build_object('session_id',s.session_id,'date',s.date,
   'class_id',s.class_id,'class_name',c.name,'revision',l.revision,'instance_id',l.instance_id) ORDER BY s.date DESC)
  FROM public.sessions s JOIN public.classes c USING(class_id)
  JOIN public.oj_links l ON l.kind='session' AND l.portal_id=s.session_id AND l.state='active'
  JOIN public.oj_links cl ON cl.kind='class' AND cl.portal_id=s.class_id AND cl.state='active'
   AND cl.instance_id=l.instance_id AND cl.revision=(l.payload->>'class_revision')::integer
  JOIN public.oj_links st ON st.kind='student' AND st.portal_id=p_student_id AND st.state='active' AND st.instance_id=l.instance_id
  WHERE s.status<>'cancelled' AND to_char(s.date,'YYYY-MM')=p_month
   AND EXISTS(SELECT 1 FROM jsonb_array_elements(l.payload->'roster') r
    WHERE r->>'student_id'=p_student_id::text AND (r->>'revision')::integer=st.revision)),'[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.oj_workspace(uuid,text),public.oj_queue_link(text,uuid,uuid,integer,boolean,jsonb,text,uuid),
 public.oj_pending(text,uuid),public.oj_ack(uuid,integer),public.oj_reject(uuid,text),public.oj_parent_context(text,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.oj_workspace(uuid,text),public.oj_queue_link(text,uuid,uuid,integer,boolean,jsonb,text,uuid),public.oj_pending(text,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.oj_ack(uuid,integer),public.oj_reject(uuid,text),public.oj_parent_context(text,uuid,text) TO service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261023_28');
COMMIT;
