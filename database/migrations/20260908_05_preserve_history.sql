-- Existing deployments: apply after 20260907_04. No business rows are rewritten.
BEGIN;
CREATE SCHEMA IF NOT EXISTS csat_internal;
REVOKE ALL ON SCHEMA csat_internal FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE IF NOT EXISTS csat_internal.schema_migrations (
  version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS csat_internal.legacy_payments (
  payment_id uuid PRIMARY KEY, original_row jsonb NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO csat_internal.legacy_payments(payment_id,original_row)
SELECT payment_id,to_jsonb(p) FROM public.payments p
WHERE NOT EXISTS (SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260908_05')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.business_audit_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity_table text NOT NULL, entity_id text NOT NULL, operation text NOT NULL,
  actor_id uuid, actor_role text, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  before_data jsonb, after_data jsonb
);
ALTER TABLE public.business_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.business_audit_events FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.business_audit_events TO authenticated;
CREATE POLICY business_audit_admin_read ON public.business_audit_events FOR SELECT TO authenticated USING(public.is_admin());
CREATE INDEX business_audit_entity_idx ON public.business_audit_events(entity_table,entity_id,event_id DESC);

CREATE OR REPLACE FUNCTION csat_internal.audit_business_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE old_data jsonb; new_data jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_data:=to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_data:=to_jsonb(NEW); END IF;
  IF old_data IS NOT DISTINCT FROM new_data THEN RETURN NULL; END IF;
  INSERT INTO public.business_audit_events(entity_table,entity_id,operation,actor_id,actor_role,before_data,after_data)
  VALUES(TG_TABLE_NAME,coalesce(new_data,old_data)->>TG_ARGV[0],TG_OP,auth.uid(),auth.jwt()->>'role',old_data,new_data);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION csat_internal.protect_financial_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE sid uuid; period_label text;
BEGIN
  IF TG_TABLE_NAME='sessions' THEN
    IF TG_OP <> 'INSERT' AND OLD.billing_period IS NOT NULL THEN
      IF TG_OP='DELETE' OR to_jsonb(OLD) IS DISTINCT FROM to_jsonb(NEW) THEN
        RAISE EXCEPTION 'Buổi học đã chốt sổ; dữ liệu gốc được giữ nguyên.' USING ERRCODE='23514';
      END IF;
    END IF;
    IF TG_OP='DELETE' AND (OLD.status <> 'scheduled' OR EXISTS(
      SELECT 1 FROM public.session_attendance a WHERE a.session_id=OLD.session_id)) THEN
      RAISE EXCEPTION 'Không xóa buổi học đã có lịch sử.' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='session_attendance' THEN
    IF TG_OP='UPDATE' AND (NEW.session_id,NEW.student_id) IS DISTINCT FROM (OLD.session_id,OLD.student_id) THEN
      RAISE EXCEPTION 'Không chuyển dòng điểm danh sang buổi hoặc học sinh khác.' USING ERRCODE='23514';
    END IF;
    IF TG_OP='DELETE' THEN sid:=OLD.session_id; ELSE sid:=NEW.session_id; END IF;
    SELECT billing_period INTO period_label FROM public.sessions WHERE session_id=sid FOR UPDATE;
    IF period_label IS NOT NULL THEN
      RAISE EXCEPTION 'Điểm danh đã chốt sổ; hãy lập khoản điều chỉnh.' USING ERRCODE='23514';
    END IF;
  ELSIF TG_TABLE_NAME='payments' THEN
    IF TG_OP='DELETE' THEN
      RAISE EXCEPTION 'Không xóa chứng từ học phí; hãy giữ lịch sử và lập điều chỉnh.' USING ERRCODE='23514';
    END IF;
    IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['status','paid_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','paid_at']) THEN
      RAISE EXCEPTION 'Không sửa chứng từ học phí gốc.' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE t text; k text; fk record; BEGIN
  FOREACH t IN ARRAY ARRAY['sessions','session_attendance','payments'] LOOP
    EXECUTE format('CREATE TRIGGER protect_financial_history BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.protect_financial_history()',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['sessions','session_attendance','payments','classes','class_students'] LOOP
    k:=CASE t WHEN 'sessions' THEN 'session_id' WHEN 'session_attendance' THEN 'attendance_id' WHEN 'payments' THEN 'payment_id' ELSE 'class_id' END;
    EXECUTE format('CREATE TRIGGER audit_business_write AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION csat_internal.audit_business_write(%L)',t,k);
  END LOOP;
  -- Preserve even unpaid/draft historical relationships. Existing NULL references remain NULL.
  FOR fk IN SELECT c.conname,c.conrelid::regclass AS relation,pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace
    WHERE c.contype='f' AND c.confdeltype IN ('c','n') AND n.nspname='public'
      AND r.relname IN ('classes','class_students','sessions','session_attendance','payments','student_reviews','class_change_log')
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I, ADD CONSTRAINT %I %s',fk.relation,fk.conname,fk.conname,
      regexp_replace(fk.definition,'ON DELETE (CASCADE|SET NULL)','ON DELETE RESTRICT'));
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rollback_billing_partial(p_billing_period text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF public.is_admin() IS NOT TRUE THEN RAISE EXCEPTION 'Quyền truy cập bị từ chối.' USING ERRCODE='42501'; END IF;
  RAISE EXCEPTION 'Kỳ đã chốt được giữ nguyên. Không còn hỗ trợ xóa hóa đơn để chốt lại.' USING ERRCODE='23514';
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA csat_internal FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20260908_05');
NOTIFY pgrst,'reload schema';
COMMIT;
