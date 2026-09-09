-- Read-only. Run while business writes are paused. Save this result outside Git.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
WITH blockers AS (
 SELECT 'missing_class_type' AS issue,count(*) AS affected FROM public.classes WHERE class_type IS NULL
 UNION ALL SELECT 'invalid_current_class_fee',count(*) FROM public.classes WHERE csat_fee_per_session IS NULL OR csat_fee_per_session<0
 UNION ALL SELECT 'invalid_current_student_fee',count(*) FROM public.class_students WHERE tuition_fee_per_session IS NULL OR tuition_fee_per_session<0
 UNION ALL SELECT 'invalid_payment_amount',count(*) FROM public.payments WHERE amount IS NULL OR amount<0
 UNION ALL SELECT 'review_missing_identity',count(*) FROM public.student_reviews WHERE student_id IS NULL OR tutor_id IS NULL OR class_id IS NULL OR month_year IS NULL
 UNION ALL SELECT 'duplicate_review_identity',count(*) FROM (SELECT 1 FROM public.student_reviews GROUP BY student_id,month_year,class_id HAVING count(*)>1) q
 UNION ALL SELECT 'tutor_missing_auth_user',count(*) FROM public.tutors t WHERE auth_uid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth.users u WHERE u.id=t.auth_uid)
), observations AS (
 SELECT 'duplicate_session_groups' AS issue,count(*) AS affected FROM (SELECT 1 FROM public.sessions WHERE status<>'cancelled' GROUP BY class_id,date,start_time,end_time HAVING count(*)>1) q
 UNION ALL SELECT 'invalid_session_times',count(*) FROM public.sessions WHERE end_time<=start_time
 UNION ALL SELECT 'scheduled_in_closed_class',count(*) FROM public.sessions s JOIN public.classes c USING(class_id) WHERE s.status='scheduled' AND c.status IN('inactive','archived')
 UNION ALL SELECT 'sessions_outside_class_dates',count(*) FROM public.sessions s JOIN public.classes c USING(class_id) WHERE s.date<c.start_date OR s.date>c.end_date
 UNION ALL SELECT 'payments_missing_links',count(*) FROM public.payments WHERE class_id IS NULL OR student_id IS NULL
 UNION ALL SELECT 'completed_missing_snapshots',count(*) FROM public.sessions WHERE status='completed' AND (tutor_id_snapshot IS NULL OR csat_fee_snapshot IS NULL)
 UNION ALL SELECT 'attendance_missing_fee',count(*) FROM public.session_attendance WHERE tuition_fee_snapshot IS NULL
)
SELECT jsonb_build_object('observed_at',clock_timestamp(),'migration_ledger_exists',to_regclass('csat_internal.schema_migrations') IS NOT NULL,
 'blockers',coalesce((SELECT jsonb_agg(to_jsonb(b)) FROM blockers b WHERE affected>0),'[]'::jsonb),
 'observations_keep_for_reconciliation',coalesce((SELECT jsonb_agg(to_jsonb(o)) FROM observations o WHERE affected>0),'[]'::jsonb),
 'fingerprints',jsonb_build_object(
  'classes',(SELECT jsonb_build_object('count',count(*),'md5',md5(coalesce(string_agg(to_jsonb(c)::text,'' ORDER BY class_id),''))) FROM public.classes c),
  'memberships',(SELECT jsonb_build_object('count',count(*),'md5',md5(coalesce(string_agg(to_jsonb(c)::text,'' ORDER BY class_id,student_id),''))) FROM public.class_students c),
  'sessions',(SELECT jsonb_build_object('count',count(*),'md5',md5(coalesce(string_agg(to_jsonb(s)::text,'' ORDER BY session_id),''))) FROM public.sessions s),
  'attendance',(SELECT jsonb_build_object('count',count(*),'md5',md5(coalesce(string_agg(to_jsonb(a)::text,'' ORDER BY attendance_id),''))) FROM public.session_attendance a),
  'payments',(SELECT jsonb_build_object('count',count(*),'md5',md5(coalesce(string_agg((to_jsonb(p)-'paid_at')::text,'' ORDER BY payment_id),''))) FROM public.payments p),
  'reviews',(SELECT jsonb_build_object('count',count(*),'md5',md5(coalesce(string_agg(to_jsonb(r)::text,'' ORDER BY review_id),''))) FROM public.student_reviews r)
 ));
ROLLBACK;
