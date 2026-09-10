-- Read-only verification after upgrade-learning-portal.sql.
BEGIN READ ONLY;
SELECT version,applied_at FROM csat_internal.schema_migrations WHERE version LIKE '20260910_%' ORDER BY version;
SELECT program,version,title,jsonb_array_length(stages) AS stage_count FROM public.learning_templates ORDER BY program,version;
SELECT d.program,t.version,t.title FROM public.learning_defaults d JOIN public.learning_templates t USING(template_id);
SELECT c.relname,c.relrowsecurity,
 has_table_privilege('anon',c.oid,'SELECT') AS anon_read,
 has_table_privilege('authenticated',c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') AS direct_write
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relname IN ('learning_templates','learning_defaults','learning_records','learning_history','parent_portal_settings','tutor_public_profiles','review_email_runs','review_email_outbox','review_corrections')
 ORDER BY c.relname;
SELECT email_enabled,cardinality(admin_emails) AS admin_recipient_count,contact_url<>'' AS contact_configured FROM public.parent_portal_settings;
SELECT count(*) AS invoice_count,
 count(*) FILTER(WHERE student_id IS NULL OR class_id IS NULL) AS historical_invoices_without_full_links FROM public.payments;
SELECT kind,count(*) AS records,count(*) FILTER(WHERE published IS NOT NULL) AS published FROM public.learning_records GROUP BY kind;
COMMIT;
