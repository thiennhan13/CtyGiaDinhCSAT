BEGIN READ ONLY;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260922_21') THEN RAISE EXCEPTION 'Missing migration 21'; END IF;
 IF has_function_privilege('anon','public.parent_learning_portal(text,uuid,text,integer)','EXECUTE') OR has_function_privilege('authenticated','public.parent_learning_portal(text,uuid,text,integer)','EXECUTE') THEN RAISE EXCEPTION 'Unexpected direct parent projection access'; END IF;
 IF has_function_privilege('anon','public.review_email_work(text,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Unexpected public email access'; END IF;
 IF position('tuition_amount' IN pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure))=0 OR position('corrections' IN pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure))=0 THEN RAISE EXCEPTION 'Incomplete parent projection'; END IF;
END $$;
SELECT version FROM csat_internal.schema_migrations WHERE version IN ('20260913_18','20260914_19','20260922_20','20260922_21') ORDER BY version;
SELECT kind,status,count(*) FROM public.review_email_outbox GROUP BY kind,status;
SELECT count(*) AS payments FROM public.payments;
SELECT count(*) AS billing_items FROM public.billing_items;
SELECT count(*) AS billing_adjustments FROM public.billing_adjustments;
SELECT count(*) AS review_corrections FROM public.review_corrections;
ROLLBACK;
