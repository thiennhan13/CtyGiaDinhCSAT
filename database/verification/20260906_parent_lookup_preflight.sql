-- Run and save the result BEFORE migration03, then rerun immediately AFTER.
-- Counts/fingerprints must match if no concurrent admin edits occurred.
-- Compatible with both parent02 and phone-lookup column names. Read-only; no PII output.
WITH contacts AS (
  SELECT jsonb_build_object(
    'id',COALESCE(j->>'parent_id',j->>'auth_uid'),
    'name',j->>'display_name','phone',j->>'phone','active',j->'active',
    'created_at',j->'created_at','updated_at',j->'updated_at','updated_by',j->'updated_by') AS value
  FROM public.parent_accounts p CROSS JOIN LATERAL (SELECT to_jsonb(p) AS j) x
), links AS (
  SELECT jsonb_build_object(
    'id',COALESCE(j->>'parent_id',j->>'parent_auth_uid'),'student_id',j->>'student_id',
    'created_at',j->'created_at','created_by',j->'created_by') AS value
  FROM public.parent_student_links l CROSS JOIN LATERAL (SELECT to_jsonb(l) AS j) x
)
SELECT 'parent_contacts' AS data_set,count(*) AS row_count,
  md5(COALESCE(string_agg(value::text,E'\n' ORDER BY value::text),'')) AS fingerprint FROM contacts
UNION ALL
SELECT 'parent_student_links',count(*),md5(COALESCE(string_agg(value::text,E'\n' ORDER BY value::text),'')) FROM links;
