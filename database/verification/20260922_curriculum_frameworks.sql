-- Read-only checks; output aggregate counts only.
BEGIN READ ONLY;
SELECT version FROM csat_internal.schema_migrations WHERE version IN ('20260911_17','20260922_20') ORDER BY version;
SELECT t.program,t.version,jsonb_array_length(t.stages) stage_count,
 (SELECT count(*) FROM jsonb_array_elements(t.stages) s CROSS JOIN LATERAL jsonb_array_elements(s->'lessons')) topic_count
FROM public.learning_defaults d JOIN public.learning_templates t USING(template_id) WHERE d.program IN ('basic','advanced');
SELECT csat_internal.class_program(c.class_type) program,c.status,count(*) classes,
 count(r.record_id) plans,count(*) FILTER(WHERE r.draft->>'template_id'=d.template_id::text) current_drafts,
 count(*) FILTER(WHERE r.published IS NOT NULL) published,
 count(*) FILTER(WHERE r.published IS NOT NULL AND r.published->>'template_id'=d.template_id::text) current_published
FROM public.classes c LEFT JOIN public.learning_records r ON r.class_id=c.class_id AND r.kind='class'
JOIN public.learning_defaults d ON d.program=csat_internal.class_program(c.class_type)
WHERE d.program IN ('basic','advanced') GROUP BY 1,2 ORDER BY 1,2;
SELECT count(*) snapshots FROM csat_internal.curriculum_migration_snapshots;
SELECT count(*) unexpected_changed_fields FROM csat_internal.curriculum_migration_snapshots
WHERE before_record<>'null'::jsonb AND (
 (before_record->'draft')-ARRAY['program','template_id','stage_index','curriculum'] IS DISTINCT FROM (after_record->'draft')-ARRAY['program','template_id','stage_index','curriculum'] OR
 (CASE WHEN jsonb_typeof(before_record->'published')='object' THEN (before_record->'published')-ARRAY['program','template_id','stage_index','curriculum'] ELSE before_record->'published' END) IS DISTINCT FROM (CASE WHEN jsonb_typeof(after_record->'published')='object' THEN (after_record->'published')-ARRAY['program','template_id','stage_index','curriculum'] ELSE after_record->'published' END));
ROLLBACK;
