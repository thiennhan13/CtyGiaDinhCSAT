BEGIN;
CREATE FUNCTION public.admin_import_parent_contacts(p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
  normalized:=regexp_replace(s.parent_number,'[[:space:]().-]','','g');
  IF normalized LIKE '0084%' THEN normalized:='+84'||substr(normalized,5); END IF;
  IF normalized ~ '^0[35789][0-9]{8}$' THEN normalized:='+84'||substr(normalized,2); END IF;
  IF normalized !~ '^\+84[35789][0-9]{8}$' OR normalized IS DISTINCT FROM x->>'phone' THEN RAISE EXCEPTION 'Số điện thoại cần đối chiếu.' USING ERRCODE='22023'; END IF;
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
END $$;
REVOKE ALL ON FUNCTION public.admin_import_parent_contacts(jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_import_parent_contacts(jsonb) TO authenticated;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260910_14');
NOTIFY pgrst,'reload schema';
COMMIT;
