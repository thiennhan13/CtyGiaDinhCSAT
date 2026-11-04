BEGIN;
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261031_30') OR NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260923_22') THEN RAISE EXCEPTION 'Apply 22 and 30 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261031_31') THEN RAISE EXCEPTION 'Migration 31 already applied'; END IF;
END $$;
ALTER TABLE public.tutor_public_profiles ADD COLUMN certificates text NOT NULL DEFAULT '' CHECK(length(certificates)<=2000);
-- Keep the established ownership, revision and avatar transaction intact. Older clients preserve certificates.
DO $$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('public.save_tutor_profile(uuid,integer,jsonb)'::regprocedure);
 IF strpos(d,'''background'',''major'',''university'',''achievements'',''introduction'',''avatar_action'',''avatar_path''')=0 THEN RAISE EXCEPTION 'Unexpected profile writer'; END IF;
 d:=replace(d,'''background'',''major'',''university'',''achievements'',''introduction'',''avatar_action'',''avatar_path''','''certificates'',''background'',''major'',''university'',''achievements'',''introduction'',''avatar_action'',''avatar_path''');
 d:=replace(d,'achievements,avatar_path,revision)','achievements,certificates,avatar_path,revision)');
 d:=replace(d,'btrim(p_data->>''achievements''),newpath,1)','btrim(p_data->>''achievements''),coalesce(btrim(p_data->>''certificates''),p.certificates,''''),newpath,1)');
 d:=replace(d,'achievements=excluded.achievements,avatar_path=excluded.avatar_path','achievements=excluded.achievements,certificates=excluded.certificates,avatar_path=excluded.avatar_path');
 EXECUTE d;
 d:=pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure);
 IF strpos(d,'''achievements'',p.achievements')=0 THEN RAISE EXCEPTION 'Unexpected profile projection'; END IF;
 EXECUTE replace(d,'''achievements'',p.achievements','''achievements'',p.achievements,''certificates'',p.certificates');
END $$;

-- Internal ledger writer, never granted to any API role. Public admin entry remains unchanged.
DO $$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('public.record_payment_event(uuid,uuid,numeric,text,uuid)'::regprocedure);
 d:=replace(d,'public.record_payment_event(','csat_internal.record_payment_event(');
 d:=replace(d,'PERFORM csat_internal.require_admin();','');
 EXECUTE d;
END $$;
REVOKE ALL ON FUNCTION csat_internal.record_payment_event(uuid,uuid,numeric,text,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.tutor_payment_accounts() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Chưa đăng nhập.' USING ERRCODE='42501'; END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('payment_id',p.payment_id,'student_name',s.name,'class_name',c.name,'period',p.billing_period,
 'amount',p.amount,'balance',csat_internal.payment_balance(p.payment_id)) ORDER BY p.created_at DESC,p.payment_id)
 FROM public.payments p JOIN public.classes c USING(class_id) JOIN public.students s USING(student_id)
 WHERE public.is_current_class_tutor(c.class_id) AND EXISTS(SELECT 1 FROM public.billing_items i WHERE i.payment_id=p.payment_id)),'[]'::jsonb);
END $$;
CREATE FUNCTION public.tutor_record_receipt(p_payment_id uuid,p_request_id uuid,p_expected_balance numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.payments;
BEGIN
 PERFORM pg_advisory_xact_lock(20260908,1);
 SELECT * INTO p FROM public.payments WHERE payment_id=p_payment_id FOR UPDATE;
 IF auth.uid() IS NULL OR p.payment_id IS NULL OR public.is_current_class_tutor(p.class_id) IS NOT TRUE
 OR NOT EXISTS(SELECT 1 FROM public.billing_items i WHERE i.payment_id=p.payment_id)
 OR EXISTS(SELECT 1 FROM public.billing_items i JOIN public.billing_sessions b USING(session_id) WHERE i.payment_id=p.payment_id AND b.class_id IS DISTINCT FROM p.class_id) THEN
 RAISE EXCEPTION 'Không có quyền thu chứng từ này.' USING ERRCODE='42501'; END IF;
 IF p_expected_balance IS NULL OR p_expected_balance<=0 THEN RAISE EXCEPTION 'Chỉ ghi nhận toàn bộ khoản còn đóng.' USING ERRCODE='22023'; END IF;
 -- The ledger replays the same request before checking balance, but authorization above is always current.
 RETURN csat_internal.record_payment_event(p_payment_id,p_request_id,p_expected_balance,'Gia sư ghi nhận đã thu',NULL);
END $$;
REVOKE ALL ON FUNCTION public.tutor_payment_accounts(),public.tutor_record_receipt(uuid,uuid,numeric) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.tutor_payment_accounts(),public.tutor_record_receipt(uuid,uuid,numeric) TO authenticated;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261031_31');
NOTIFY pgrst,'reload schema';
COMMIT;
