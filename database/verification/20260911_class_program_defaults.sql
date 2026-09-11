-- Read-only verification after 20260911_17.
SELECT 'migration_17' AS check_name,
 EXISTS(SELECT 1 FROM csat_internal.schema_migrations WHERE version='20260911_17') AS ok;
SELECT c.class_type,count(*) AS classes,count(r.published) AS published,
 count(*) FILTER(WHERE r.published->>'program'=csat_internal.class_program(c.class_type)
  AND r.published->>'template_id'=d.template_id::text) AS uses_current_default
FROM public.classes c
LEFT JOIN public.learning_records r ON r.class_id=c.class_id AND r.kind='class'
LEFT JOIN public.learning_defaults d ON d.program=csat_internal.class_program(c.class_type)
GROUP BY c.class_type ORDER BY c.class_type;
SELECT 'valid_default_programs' AS check_name,NOT EXISTS(
 SELECT 1 FROM public.learning_defaults d JOIN public.learning_templates t USING(template_id)
 WHERE d.program<>t.program) AS ok;
SELECT 'no_duplicate_class_plans' AS check_name,NOT EXISTS(
 SELECT class_id FROM public.learning_records WHERE kind='class' GROUP BY class_id HAVING count(*)>1) AS ok;
SELECT 'private_mapping_function' AS check_name,
 NOT has_function_privilege('anon','csat_internal.class_program(text)','EXECUTE')
 AND NOT has_function_privilege('authenticated','csat_internal.class_program(text)','EXECUTE') AS ok;
SELECT 'learning_rpc_access' AS check_name,
 has_function_privilege('authenticated','public.create_class_with_learning(jsonb,uuid)','EXECUTE')
 AND NOT has_function_privilege('anon','public.create_class_with_learning(jsonb,uuid)','EXECUTE') AS ok;
