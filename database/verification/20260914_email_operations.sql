-- Read-only post-migration checks. Run against the intended database after versions 18 and 19.
BEGIN READ ONLY;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260914_19') THEN RAISE EXCEPTION 'Missing migration 19'; END IF;
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260913_18') THEN RAISE EXCEPTION 'Missing migration 18'; END IF;
 IF has_function_privilege('anon','public.review_email_work(text,jsonb)','EXECUTE') OR has_function_privilege('anon','public.reconcile_email(text,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Unexpected public email access'; END IF;
 IF has_table_privilege('authenticated','public.email_reconciliations','INSERT') OR has_table_privilege('authenticated','public.review_email_outbox','UPDATE') THEN RAISE EXCEPTION 'Unexpected direct email mutation'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.email_reconciliations'::regclass) THEN RAISE EXCEPTION 'Missing RLS'; END IF;
END $$;
SELECT version FROM csat_internal.schema_migrations WHERE version IN ('20260913_18','20260914_19') ORDER BY version;
SELECT email_enabled,cardinality(admin_emails) AS admin_recipient_count FROM public.parent_portal_settings WHERE singleton;
SELECT month,kind,status,count(*) FROM public.review_email_outbox GROUP BY month,kind,status ORDER BY month DESC,kind,status;
SELECT status,count(*) FROM public.consultation_email_outbox GROUP BY status;
SELECT count(*) AS reconciliation_count FROM public.email_reconciliations;
-- No claims, preparation, email delivery, review publication or billing writes.
COMMIT;
