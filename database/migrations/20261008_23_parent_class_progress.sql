-- Read-only class pacing aggregate. No student mastery, history or curriculum writes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
DO $$ BEGIN
 -- Only the published curriculum from 20 is required. Optional fee/profile
 -- projections from 21/22 are preserved when present, and can be added later.
 IF NOT EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260922_20') THEN RAISE EXCEPTION 'Apply migration 20 first'; END IF;
 IF EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20261008_23') THEN RAISE EXCEPTION 'Migration 23 already applied'; END IF;
END $$;

-- Extend the existing validated projection rather than replacing its financial,
-- review-correction and tutor-profile fields from migrations 15, 21 and 22.
DO $$ DECLARE definition text; anchor text:=$anchor$'month',p_month,$anchor$;
 replacement text:=$replacement$'month',p_month,
 'class_progress',coalesce((SELECT jsonb_agg(jsonb_build_object(
   'class_id',r.class_id,
   'completed_sessions',(SELECT count(*) FROM public.sessions s
     WHERE s.class_id=r.class_id AND s.status='completed'
       AND s.end_time>s.start_time
       AND (s.date+s.end_time) AT TIME ZONE 'Asia/Ho_Chi_Minh'<=now()),
   'as_of',now()) ORDER BY r.class_id)
  FROM public.learning_records r
  WHERE r.kind='class' AND r.published IS NOT NULL
   AND EXISTS(SELECT 1 FROM public.class_students cs
     WHERE cs.class_id=r.class_id AND cs.student_id=sid AND cs.status='active')),'[]'::jsonb),$replacement$;
BEGIN
 definition:=pg_get_functiondef('public.parent_learning_portal(text,uuid,text,integer)'::regprocedure);
 IF (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1
    OR position($check$'class_progress'$check$ IN definition)>0 THEN
  RAISE EXCEPTION 'Unexpected parent projection; review before migrating';
 END IF;
 EXECUTE replace(definition,anchor,replacement);
END $$;
REVOKE ALL ON FUNCTION public.parent_learning_portal(text,uuid,text,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.parent_learning_portal(text,uuid,text,integer) TO service_role;
INSERT INTO csat_internal.schema_migrations(version) VALUES('20261008_23');
NOTIFY pgrst,'reload schema';
COMMIT;
