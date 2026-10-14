BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261008_23') THEN RAISE EXCEPTION 'Apply migration 23 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261012_25') THEN RAISE EXCEPTION 'Migration 25 already applied'; END IF;
END $$;
LOCK TABLE public.classes IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.classes ADD COLUMN program_code text CHECK(program_code IN ('A','B','AB','C','E','PREVOI','K'));
ALTER TABLE public.classes ADD COLUMN program_revision integer NOT NULL DEFAULT 1;
CREATE FUNCTION csat_internal.class_program_code(p_type text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT CASE regexp_replace(lower(btrim(p_type)),'[[:space:]]+',' ','g')
 WHEN 'lớp a' THEN 'A' WHEN 'lớp b' THEN 'B' WHEN 'lớp c' THEN 'C' WHEN 'lớp e' THEN 'E' WHEN 'lớp k' THEN 'K'
 WHEN 'lớp cơ bản' THEN 'AB' WHEN 'cơ bản' THEN 'AB' WHEN 'lop co ban' THEN 'AB' WHEN 'co ban' THEN 'AB'
 WHEN 'lớp nâng cao' THEN 'C' WHEN 'nâng cao' THEN 'C' WHEN 'lop nang cao' THEN 'C' WHEN 'nang cao' THEN 'C'
 WHEN 'lớp prevoi' THEN 'PREVOI' WHEN 'prevoi' THEN 'PREVOI' WHEN 'lớp hsgqg' THEN 'PREVOI' WHEN 'hsgqg' THEN 'PREVOI' WHEN 'lop hsgqg' THEN 'PREVOI' WHEN 'ôn thi voi' THEN 'PREVOI' WHEN 'on thi voi' THEN 'PREVOI'
 WHEN 'lớp luyện thi' THEN 'K' WHEN 'luyện thi' THEN 'K' WHEN 'lop luyen thi' THEN 'K' WHEN 'luyen thi' THEN 'K' WHEN 'kèm riêng' THEN 'K' WHEN 'lớp kèm riêng' THEN 'K' WHEN 'tùy chỉnh' THEN 'K' WHEN 'lớp tùy chỉnh' THEN 'K' END
$$;
CREATE TABLE public.class_program_history (
 event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), class_id uuid NOT NULL REFERENCES public.classes(class_id),
 old_code text, new_code text, revision integer NOT NULL, reason text NOT NULL, actor_id uuid,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(class_id,revision)
);
ALTER TABLE public.class_program_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.class_program_history FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.class_program_history TO authenticated;
CREATE POLICY class_program_history_admin ON public.class_program_history FOR SELECT TO authenticated USING(public.is_admin());
UPDATE public.classes SET program_code=csat_internal.class_program_code(class_type);
INSERT INTO public.class_program_history(class_id,new_code,revision,reason) SELECT class_id,program_code,1,'Chuẩn hóa phân loại; giữ nguyên tên lớp và giáo án.' FROM public.classes;

CREATE FUNCTION public.admin_set_class_program(p_class_id uuid,p_code text,p_revision integer,p_reason text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.classes;
BEGIN
 PERFORM csat_internal.require_admin();
 IF p_code IS NULL OR p_code NOT IN ('A','B','AB','C','E','PREVOI','K') OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 5 AND 500 THEN RAISE EXCEPTION 'Chọn chương trình và ghi lý do.' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.classes WHERE class_id=p_class_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lớp.' USING ERRCODE='P0002'; END IF;
 IF c.program_revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Phân loại đã thay đổi. Tải lại lớp.' USING ERRCODE='40001'; END IF;
 IF c.program_code=p_code THEN RETURN c.program_revision; END IF;
 UPDATE public.classes SET program_code=p_code,program_revision=program_revision+1 WHERE class_id=p_class_id;
 INSERT INTO public.class_program_history(class_id,old_code,new_code,revision,reason,actor_id) VALUES(p_class_id,c.program_code,p_code,c.program_revision+1,btrim(p_reason),auth.uid());
 RETURN c.program_revision+1;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_class_program(uuid,text,integer,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_class_program(uuid,text,integer,text) TO authenticated;

-- Keep the existing workflow behind a single creation entry point. A direct
-- authenticated manage_class call must also initialize classification and plan.
ALTER FUNCTION public.manage_class(text,uuid,jsonb,uuid) SET SCHEMA csat_internal;
ALTER FUNCTION csat_internal.manage_class(text,uuid,jsonb,uuid) RENAME TO manage_class_core;
REVOKE ALL ON FUNCTION csat_internal.manage_class_core(text,uuid,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.manage_class(p_action text,p_class_id uuid,p_data jsonb,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_action='create' THEN
  RETURN public.create_class_with_learning(p_data,p_request_id);
 END IF;
 RETURN csat_internal.manage_class_core(p_action,p_class_id,p_data,p_request_id);
END $$;
REVOKE ALL ON FUNCTION public.manage_class(text,uuid,jsonb,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.manage_class(text,uuid,jsonb,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_class_with_learning(p_data jsonb,p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; cid uuid; code text:=coalesce(p_data->>'program_code',csat_internal.class_program_code(p_data->>'class_type')); prog text; typ text; tid uuid; b jsonb;
BEGIN
 PERFORM csat_internal.require_admin();
 IF code IS NULL OR code NOT IN ('A','B','AB','C','E','PREVOI','K') THEN RAISE EXCEPTION 'Chọn mã chương trình của lớp.' USING ERRCODE='22023'; END IF;
 prog:=CASE WHEN code IN ('A','B','AB') THEN 'basic' WHEN code='C' THEN 'advanced' WHEN code='PREVOI' THEN 'voi' ELSE 'custom' END;
 typ:=CASE code WHEN 'A' THEN 'Lớp A' WHEN 'B' THEN 'Lớp B' WHEN 'AB' THEN 'Lớp Cơ bản' WHEN 'C' THEN 'Lớp Nâng cao' WHEN 'E' THEN 'Lớp E' WHEN 'PREVOI' THEN 'Lớp PreVOI' ELSE 'Lớp K' END;
 IF p_data->>'program' IS NOT NULL AND p_data->>'program'<>prog THEN RAISE EXCEPTION 'Chương trình không khớp phân loại.' USING ERRCODE='22023'; END IF;
 result:=csat_internal.manage_class_core('create',NULL,p_data||jsonb_build_object('class_type',typ,'program_code',code),p_request_id);cid:=(result->>'class_id')::uuid;
 IF NOT EXISTS(SELECT 1 FROM public.class_program_history WHERE class_id=cid) THEN
  UPDATE public.classes SET program_code=code WHERE class_id=cid;
  INSERT INTO public.class_program_history(class_id,new_code,revision,reason,actor_id) VALUES(cid,code,1,'Thiết lập lớp mới.',auth.uid());
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.learning_records WHERE class_id=cid AND kind='class') THEN
  IF prog IN ('basic','advanced') THEN
   SELECT template_id INTO tid FROM public.learning_defaults WHERE program=prog;
   IF tid IS NULL THEN RAISE EXCEPTION 'Chưa có giáo án mặc định.' USING ERRCODE='22023'; END IF;
  END IF;
  b:=jsonb_build_object('goal','','focus_tags','[]'::jsonb,'next_step','','stage_index',NULL,'title','','content','','continuation','','program',prog,'format',coalesce(p_data->>'teaching_format','group'),'template_id',tid);
  IF tid IS NOT NULL THEN b:=b||jsonb_build_object('curriculum',jsonb_build_object('parts',CASE WHEN code='A' THEN '["A"]'::jsonb WHEN code='B' THEN '["B"]'::jsonb ELSE '["A","B"]'::jsonb END,'excluded_stage_ids','[]'::jsonb,'excluded_topic_codes','[]'::jsonb,'current_stage_id',NULL)); END IF;
  PERFORM public.save_learning_record(cid,'class',NULL,NULL,0,b,prog IN ('basic','advanced'));
 END IF;
 RETURN result;
END $$;

-- Append columns to the existing view without changing its historical calculations.
DO $$ DECLARE body text; BEGIN
 SELECT pg_get_viewdef('public.class_current_state'::regclass,true) INTO body;
 body:=regexp_replace(body,';[[:space:]]*$','');
 EXECUTE 'CREATE OR REPLACE VIEW public.class_current_state WITH (security_invoker=true) AS SELECT old.*,c.program_code,c.program_revision FROM ('||body||') old JOIN public.classes c USING(class_id)';
END $$;
-- Extend only the plan labels; retain optional fee/profile and pacing projections.
DO $$ DECLARE definition text; anchor text:=$a$'class_name',c.name,'kind',r.kind$a$; BEGIN
 definition:=pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure);
 IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected parent plan projection'; END IF;
 EXECUTE replace(definition,anchor,$a$'class_name',c.name,'program_code',c.program_code,'kind',r.kind$a$);
END $$;
DO $$ DECLARE definition text; anchor text:=$a$'class_type',class_type$a$; BEGIN
 definition:=pg_get_functiondef('public.learning_workspace(uuid,text)'::regprocedure);
 IF strpos(definition,anchor)=0 THEN RAISE EXCEPTION 'Unexpected learning workspace projection'; END IF;
 EXECUTE replace(definition,anchor,$a$'class_type',class_type,'program_code',program_code$a$);
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261012_25');
NOTIFY pgrst,'reload schema';
COMMIT;
