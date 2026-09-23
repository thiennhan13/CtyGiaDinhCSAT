-- Profile publication is immediate; no accounting or learning-history changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260922_21') THEN RAISE EXCEPTION 'Apply migration 21 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260923_22') THEN RAISE EXCEPTION 'Migration 22 already applied'; END IF;
END $$;
ALTER TABLE public.tutor_public_profiles
 ADD COLUMN background text NOT NULL DEFAULT 'Cựu học sinh chuyên Tin trường THPT Chuyên Phan Bội Châu' CHECK(length(background)<=300),
 ADD COLUMN major text NOT NULL DEFAULT '' CHECK(length(major)<=200),
 ADD COLUMN university text NOT NULL DEFAULT '' CHECK(length(university)<=200),
 ADD COLUMN achievements text NOT NULL DEFAULT '' CHECK(length(achievements)<=2000),
 ADD COLUMN avatar_path text,
 ADD COLUMN revision integer NOT NULL DEFAULT 1 CHECK(revision>0);

CREATE TABLE public.tutor_avatar_assets (
 path text PRIMARY KEY,
 tutor_id uuid NOT NULL REFERENCES public.tutors ON DELETE RESTRICT,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','ready','attached','retired','deleting')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(path ~ ('^'||tutor_id::text||'/[0-9a-f-]{36}\.webp$'))
);
ALTER TABLE public.tutor_public_profiles ADD CONSTRAINT tutor_avatar_reference FOREIGN KEY(avatar_path) REFERENCES public.tutor_avatar_assets(path) ON DELETE RESTRICT;
ALTER TABLE public.tutor_avatar_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tutor_avatar_assets FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tutor_avatar_assets TO service_role;
CREATE POLICY tutor_read_own_profile ON public.tutor_public_profiles FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.tutors t WHERE t.tutor_id=tutor_public_profiles.tutor_id AND t.auth_uid=auth.uid() AND t.status='active' AND t.is_deleted IS NOT TRUE));

CREATE FUNCTION public.save_tutor_profile(p_tutor_id uuid,p_revision integer,p_data jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t public.tutors%ROWTYPE; p public.tutor_public_profiles%ROWTYPE; isadmin boolean; newpath text; oldpath text;
BEGIN
 isadmin:=coalesce(public.is_admin(),false);
 SELECT * INTO t FROM public.tutors WHERE tutor_id=p_tutor_id FOR UPDATE;
 IF auth.uid() IS NULL OR t.tutor_id IS NULL OR t.is_deleted IS TRUE OR
   (NOT isadmin AND (t.auth_uid IS DISTINCT FROM auth.uid() OR t.status IS DISTINCT FROM 'active')) THEN
  RAISE EXCEPTION 'Không có quyền chỉnh sửa hồ sơ gia sư.' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR p_revision IS NULL OR p_revision<0 OR
    EXISTS(SELECT 1 FROM jsonb_object_keys(p_data) k WHERE k NOT IN ('background','major','university','achievements','introduction','avatar_action','avatar_path')) THEN
  RAISE EXCEPTION 'Dữ liệu hồ sơ không hợp lệ.' USING ERRCODE='22023'; END IF;
 IF NOT isadmin AND p_data ? 'background' THEN RAISE EXCEPTION 'Chỉ admin được sửa thông tin nền.' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_data) e WHERE e.key<>'avatar_path' AND jsonb_typeof(e.value)<>'string') OR
    NOT (p_data ?& ARRAY['major','university','achievements','introduction','avatar_action']) OR
    p_data->>'avatar_action' NOT IN ('keep','replace','remove') THEN
  RAISE EXCEPTION 'Dữ liệu hồ sơ không hợp lệ.' USING ERRCODE='22023'; END IF;
 SELECT * INTO p FROM public.tutor_public_profiles WHERE tutor_id=p_tutor_id FOR UPDATE;
 IF coalesce(p.revision,0)<>p_revision THEN RAISE EXCEPTION 'Hồ sơ đã được cập nhật ở phiên khác. Tải lại để đối chiếu.' USING ERRCODE='40001'; END IF;
 oldpath:=p.avatar_path; newpath:=oldpath;
 IF p_data->>'avatar_action'='replace' THEN
  newpath:=p_data->>'avatar_path';
  PERFORM 1 FROM public.tutor_avatar_assets WHERE path=newpath AND tutor_id=p_tutor_id AND state='ready' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ảnh chưa sẵn sàng hoặc không thuộc gia sư.' USING ERRCODE='22023'; END IF;
 ELSIF p_data->>'avatar_action'='remove' THEN newpath:=NULL;
 END IF;
 INSERT INTO public.tutor_public_profiles(tutor_id,introduction,background,major,university,achievements,avatar_path,revision)
 VALUES(p_tutor_id,btrim(p_data->>'introduction'),coalesce(p_data->>'background',p.background,'Cựu học sinh chuyên Tin trường THPT Chuyên Phan Bội Châu'),
  btrim(p_data->>'major'),btrim(p_data->>'university'),btrim(p_data->>'achievements'),newpath,1)
 ON CONFLICT(tutor_id) DO UPDATE SET introduction=excluded.introduction,background=excluded.background,major=excluded.major,
  university=excluded.university,achievements=excluded.achievements,avatar_path=excluded.avatar_path,
  revision=tutor_public_profiles.revision+1,updated_at=now() RETURNING * INTO p;
 IF oldpath IS DISTINCT FROM newpath THEN
  UPDATE public.tutor_avatar_assets SET state='retired' WHERE path=oldpath;
  UPDATE public.tutor_avatar_assets SET state='attached' WHERE path=newpath;
 END IF;
 RETURN to_jsonb(p)||jsonb_build_object('name',t.name,'previous_avatar_path',oldpath);
END $$;
REVOKE ALL ON FUNCTION public.save_tutor_profile(uuid,integer,jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.save_tutor_profile(uuid,integer,jsonb) TO authenticated;

-- Claim before Storage deletion: a claimed object cannot be attached by a concurrent save.
CREATE FUNCTION public.claim_tutor_avatar_cleanup(p_path text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(current_setting('request.jwt.claims',true)::jsonb->>'role','')<>'service_role' THEN RAISE EXCEPTION 'Service only' USING ERRCODE='42501'; END IF;
 UPDATE public.tutor_avatar_assets a SET state='deleting' WHERE path=p_path
  AND (state IN ('retired','deleting') OR (state IN ('pending','ready') AND created_at<now()-interval '24 hours'))
  AND NOT EXISTS(SELECT 1 FROM public.tutor_public_profiles p WHERE p.avatar_path=a.path);
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_tutor_avatar_cleanup(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_tutor_avatar_cleanup(text) TO service_role;

-- Retire the legacy unversioned writer; other settings actions remain unchanged.
DO $$ DECLARE d text; starttext text:=$s$ ELSIF p_action='profile' THEN$s$; endtext text:=$s$ ELSIF p_action='settings' THEN$s$; a integer; b integer;
BEGIN
 d:=pg_get_functiondef('public.admin_learning_settings(text,jsonb)'::regprocedure); a:=position(starttext IN d); b:=position(endtext IN d);
 IF a=0 OR b<=a THEN RAISE EXCEPTION 'Unexpected settings function'; END IF;
 d:=left(d,a-1)||E' ELSIF p_action=''profile'' THEN\n  RAISE EXCEPTION ''Mở hồ sơ gia sư để cập nhật theo phiên bản.'' USING ERRCODE=''22023'';\n'||substring(d FROM b);
 EXECUTE d;
END $$;
DO $$ DECLARE d text; anchor text:=$a$'class_name',c.name,'name',t.name,'introduction',p.introduction$a$;
BEGIN
 d:=pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure);
 IF position(anchor IN d)=0 THEN RAISE EXCEPTION 'Unexpected parent tutor projection'; END IF;
 EXECUTE replace(d,anchor,$r$'class_name',c.name,'name',t.name,'introduction',p.introduction,'tutor_id',t.tutor_id,
 'background',CASE WHEN t.tutor_id IS NOT NULL THEN coalesce(p.background,'Cựu học sinh chuyên Tin trường THPT Chuyên Phan Bội Châu') END,
 'major',p.major,'university',p.university,'achievements',p.achievements,'avatar_path',p.avatar_path$r$);
END $$;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260923_22');
NOTIFY pgrst,'reload schema';
COMMIT;
