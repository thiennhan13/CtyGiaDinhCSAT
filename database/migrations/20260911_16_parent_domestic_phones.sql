-- Store parent phones as 0xxxxxxxxx. Full international input remains accepted.
-- Apply once after 20260910_15. Parent IDs, links and lookup sessions are preserved.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260910_15') THEN
  RAISE EXCEPTION 'Apply learning migration 15 first.';
 END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260911_16') THEN
  RAISE EXCEPTION 'Parent phone migration 16 already applied.';
 END IF;
END $$;
LOCK TABLE public.parent_accounts,public.students IN SHARE ROW EXCLUSIVE MODE;

CREATE FUNCTION csat_internal.parent_phone_domestic(p_value text) RETURNS text
LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE p text;
BEGIN
 IF p_value IS NULL OR p_value !~ '^[+0-9[:space:]().-]+$' THEN RETURN NULL; END IF;
 p:=regexp_replace(p_value,'[[:space:]().-]','','g');
 IF p ~ '^0084[35789][0-9]{8}$' THEN p:='0'||substr(p,5);
 ELSIF p ~ '^\+84[35789][0-9]{8}$' THEN p:='0'||substr(p,4); END IF;
 IF p ~ '^0[35789][0-9]{8}$' THEN RETURN p; END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION csat_internal.parent_phone_domestic(text) FROM PUBLIC,anon,authenticated,service_role;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.parent_accounts WHERE csat_internal.parent_phone_domestic(phone) IS NULL) THEN
  RAISE EXCEPTION 'Some parent account phones need manual review.';
 END IF;
 IF EXISTS(SELECT 1 FROM public.parent_accounts GROUP BY csat_internal.parent_phone_domestic(phone) HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Canonical phone collision: review accounts and links before migration.';
 END IF;
END $$;
ALTER TABLE public.parent_accounts DROP CONSTRAINT parent_accounts_phone_check;
UPDATE public.parent_accounts SET phone=csat_internal.parent_phone_domestic(phone)
 WHERE phone IS DISTINCT FROM csat_internal.parent_phone_domestic(phone);
ALTER TABLE public.parent_accounts ADD CONSTRAINT parent_accounts_phone_check CHECK(phone ~ '^0[35789][0-9]{8}$');
-- Normalize only unambiguous source values; preserve missing or ambiguous contact information.
UPDATE public.students SET parent_number=csat_internal.parent_phone_domestic(parent_number)
 WHERE csat_internal.parent_phone_domestic(parent_number) IS NOT NULL
 AND parent_number IS DISTINCT FROM csat_internal.parent_phone_domestic(parent_number);
CREATE FUNCTION csat_internal.normalize_parent_account_phone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 NEW.phone:=csat_internal.parent_phone_domestic(NEW.phone);
 IF NEW.phone IS NULL THEN RAISE EXCEPTION 'Số điện thoại di động không hợp lệ.' USING ERRCODE='22023'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION csat_internal.normalize_student_parent_phone() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 NEW.parent_number:=coalesce(csat_internal.parent_phone_domestic(NEW.parent_number),NEW.parent_number);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION csat_internal.normalize_parent_account_phone(),csat_internal.normalize_student_parent_phone() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER normalize_parent_account_phone BEFORE INSERT OR UPDATE OF phone ON public.parent_accounts
 FOR EACH ROW EXECUTE FUNCTION csat_internal.normalize_parent_account_phone();
CREATE TRIGGER normalize_student_parent_phone BEFORE INSERT OR UPDATE OF parent_number ON public.students
 FOR EACH ROW EXECUTE FUNCTION csat_internal.normalize_student_parent_phone();
CREATE OR REPLACE FUNCTION public.admin_save_parent_contact(p_parent_id uuid, p_display_name text, p_phone text, p_student_ids uuid[], p_active boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_id UUID := p_parent_id;
BEGIN
  IF public.is_admin() IS NOT TRUE THEN
    RAISE EXCEPTION 'Thao tác này yêu cầu quyền Admin.' USING ERRCODE='42501';
  END IF;
  p_phone := csat_internal.parent_phone_domestic(p_phone);
  IF p_phone IS NULL THEN RAISE EXCEPTION 'Số điện thoại di động không hợp lệ.' USING ERRCODE='22023'; END IF;
  IF p_active IS NULL OR p_student_ids IS NULL OR cardinality(p_student_ids)>50
    OR (p_parent_id IS NULL AND cardinality(p_student_ids)=0)
    OR EXISTS (SELECT 1 FROM unnest(p_student_ids) s WHERE s IS NULL)
    OR cardinality(p_student_ids)<>(SELECT count(DISTINCT s) FROM unnest(p_student_ids) s) THEN
    RAISE EXCEPTION 'Danh sách học sinh không hợp lệ.' USING ERRCODE='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_student_ids) s WHERE NOT EXISTS (
    SELECT 1 FROM public.students st WHERE st.student_id=s AND (NOT p_active OR st.is_deleted IS NOT TRUE)
  )) THEN
    RAISE EXCEPTION 'Có học sinh không tồn tại hoặc đã bị xóa.' USING ERRCODE='22023';
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO public.parent_accounts(display_name,phone,active,updated_by)
    VALUES(trim(p_display_name),p_phone,p_active,auth.uid()) RETURNING parent_id INTO v_id;
  ELSE
    PERFORM 1 FROM public.parent_accounts WHERE parent_id=v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy phụ huynh.' USING ERRCODE='P0002'; END IF;
    -- Closing or changing the lookup key permanently revokes outstanding sessions.
    DELETE FROM public.parent_lookup_sessions WHERE parent_id=v_id AND
      (NOT p_active OR EXISTS (SELECT 1 FROM public.parent_accounts WHERE parent_id=v_id AND phone<>p_phone));
    UPDATE public.parent_accounts SET display_name=trim(p_display_name),phone=p_phone,active=p_active,
      updated_at=CURRENT_TIMESTAMP,updated_by=auth.uid() WHERE parent_id=v_id;
  END IF;
  DELETE FROM public.parent_student_links WHERE parent_id=v_id AND NOT(student_id=ANY(p_student_ids));
  INSERT INTO public.parent_student_links(parent_id,student_id,created_by)
  SELECT v_id,s,auth.uid() FROM unnest(p_student_ids) s ON CONFLICT(parent_id,student_id) DO NOTHING;
  RETURN v_id;
END $function$;

CREATE OR REPLACE FUNCTION public.start_parent_lookup(p_phone text, p_token_hash text, p_client_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_count INTEGER; v_parent_id UUID;
BEGIN
  p_phone := csat_internal.parent_phone_domestic(p_phone);
  IF p_phone IS NULL OR p_phone !~ '^0[35789][0-9]{8}$'
    OR p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$'
    OR p_client_key IS NULL OR p_client_key !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid lookup request.' USING ERRCODE='22023';
  END IF;
  DELETE FROM public.parent_lookup_limits WHERE reset_at<=CURRENT_TIMESTAMP;
  DELETE FROM public.parent_lookup_sessions WHERE expires_at<=CURRENT_TIMESTAMP;
  INSERT INTO public.parent_lookup_limits(client_key,request_count,reset_at)
  VALUES(p_client_key,1,CURRENT_TIMESTAMP+INTERVAL '1 minute')
  ON CONFLICT(client_key) DO UPDATE SET request_count=LEAST(public.parent_lookup_limits.request_count+1,11)
  RETURNING request_count INTO v_count;
  IF v_count>10 THEN RETURN 'rate_limited'; END IF;
  SELECT parent_id INTO v_parent_id FROM public.parent_accounts WHERE phone=p_phone AND active FOR SHARE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  INSERT INTO public.parent_lookup_sessions(token_hash,parent_id,expires_at)
  VALUES(p_token_hash,v_parent_id,CURRENT_TIMESTAMP+INTERVAL '12 hours');
  RETURN 'ok';
END $function$;

CREATE OR REPLACE FUNCTION public.admin_import_parent_contacts(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE x jsonb; s public.students%ROWTYPE; p public.parent_accounts%ROWTYPE; normalized text; created integer:=0; linked integer:=0; n integer;
BEGIN
 PERFORM csat_internal.require_admin();
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Danh sách không hợp lệ.' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('parent-import',0));
 FOR x IN SELECT value FROM jsonb_array_elements(p_rows) ORDER BY value->>'student_id' LOOP
  SELECT * INTO s FROM public.students WHERE student_id=(x->>'student_id')::uuid AND is_deleted IS NOT TRUE FOR UPDATE;
  IF NOT FOUND OR s.parent_number IS DISTINCT FROM x->>'parent_number' OR s.parent_name IS DISTINCT FROM x->>'parent_name' THEN
   RAISE EXCEPTION 'Dữ liệu học sinh đã thay đổi. Xem trước lại.' USING ERRCODE='40001'; END IF;
  IF coalesce(s.parent_number,'') !~ '^[+0-9[:space:]().-]+$' OR length(trim(coalesce(s.parent_name,'')))=0 THEN RAISE EXCEPTION 'Thiếu tên hoặc số không hợp lệ.' USING ERRCODE='22023'; END IF;
  normalized:=csat_internal.parent_phone_domestic(s.parent_number);
  IF normalized IS NULL OR normalized IS DISTINCT FROM csat_internal.parent_phone_domestic(x->>'phone') THEN
   RAISE EXCEPTION 'Số điện thoại cần đối chiếu.' USING ERRCODE='22023';
  END IF;
  SELECT * INTO p FROM public.parent_accounts WHERE phone=normalized FOR UPDATE;
  IF FOUND THEN
   IF NOT p.active OR trim(p.display_name)<>trim(s.parent_name) THEN RAISE EXCEPTION 'Hồ sơ đang khóa hoặc tên khác. Cần đối chiếu.' USING ERRCODE='22023'; END IF;
  ELSE
   INSERT INTO public.parent_accounts(display_name,phone,active,updated_by) VALUES(trim(s.parent_name),normalized,true,auth.uid()) RETURNING * INTO p;
   created:=created+1;
  END IF;
  INSERT INTO public.parent_student_links(parent_id,student_id,created_by) VALUES(p.parent_id,s.student_id,auth.uid()) ON CONFLICT(parent_id,student_id) DO NOTHING;
  GET DIAGNOSTICS n=ROW_COUNT;linked:=linked+n;
 END LOOP;
 RETURN jsonb_build_object('created',created,'linked',linked);
END $function$;

-- CREATE OR REPLACE retains existing RPC grants and ownership.
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260911_16');
NOTIFY pgrst,'reload schema';
COMMIT;
