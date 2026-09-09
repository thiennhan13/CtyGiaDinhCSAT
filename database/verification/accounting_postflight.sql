-- Read-only, immediately after the upgrade and before reopening writes.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT version,applied_at FROM csat_internal.schema_migrations ORDER BY version;
SELECT 'legacy_payment_changed' AS issue,count(*) AS affected
 FROM csat_internal.legacy_payments l FULL JOIN public.payments p USING(payment_id)
 WHERE l.payment_id IS NULL OR p.payment_id IS NULL OR (to_jsonb(p)-'paid_at') IS DISTINCT FROM (l.original_row-'paid_at');
SELECT t,has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE') AS browser_can_write,
 has_table_privilege('service_role','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE') AS service_can_write
 FROM unnest(ARRAY['classes','class_students','sessions','session_attendance','payments']) t;
SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND NOT relrowsecurity;
SELECT n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid) AS definition
 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE k.contype='f' AND n.nspname='public' AND c.relname IN('classes','class_students','sessions','session_attendance','payments','student_reviews','class_change_log')
 AND k.confdeltype IN('c','n');
SELECT count(*) AS legacy_periods FROM public.billing_periods WHERE source='legacy';
SELECT count(*) AS new_ledger_periods FROM public.billing_periods WHERE source='ledger';
-- Exactly one enrollment audit trigger; every verification table must be immutable and admin-readable only.
SELECT tgname,pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.class_enrollments'::regclass AND NOT tgisinternal;
SELECT tablename,policyname,qual FROM pg_policies WHERE tablename IN ('session_roster_verifications','attendance_fee_verifications');
SELECT t,has_table_privilege('authenticated','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE') AS browser_can_write,
 has_table_privilege('service_role','public.'||t,'INSERT,UPDATE,DELETE,TRUNCATE') AS service_can_write
 FROM unnest(ARRAY['session_roster_verifications','attendance_fee_verifications']) t;
ROLLBACK;
