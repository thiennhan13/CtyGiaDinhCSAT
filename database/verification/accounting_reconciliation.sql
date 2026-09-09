-- Read-only historical evidence. Differences are observations, not proof of their cause.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
WITH observed AS (
 SELECT s.billing_period,s.class_id,a.student_id,sum(a.tuition_fee_snapshot) AS observed_amount,
  count(*) AS attended_rows,count(*) FILTER(WHERE a.tuition_fee_snapshot IS NULL) AS missing_prices
 FROM public.sessions s JOIN public.session_attendance a USING(session_id)
 WHERE s.billing_period IS NOT NULL AND a.status='attended'
 GROUP BY s.billing_period,s.class_id,a.student_id
), differences AS (
 SELECT p.payment_id,p.billing_period,p.class_id,p.student_id,p.status,p.amount AS original_invoice_amount,
  o.observed_amount,o.attended_rows,o.missing_prices
 FROM public.payments p LEFT JOIN observed o ON o.billing_period=p.billing_period AND o.class_id=p.class_id AND o.student_id=p.student_id
 WHERE p.class_id IS NULL OR p.student_id IS NULL OR p.amount IS DISTINCT FROM coalesce(o.observed_amount,0) OR o.missing_prices>0
), missing AS (
 SELECT o.* FROM observed o WHERE observed_amount>0 AND NOT EXISTS(
  SELECT 1 FROM public.payments p WHERE p.billing_period=o.billing_period AND p.class_id=o.class_id AND p.student_id=o.student_id)
)
SELECT jsonb_build_object(
 'invoice_vs_observed_attendance',coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM differences d),'[]'::jsonb),
 'billed_attendance_without_invoice',coalesce((SELECT jsonb_agg(to_jsonb(m)) FROM missing m),'[]'::jsonb),
 'duplicate_schedules',coalesce((SELECT jsonb_agg(to_jsonb(q)) FROM (
  SELECT class_id,date,start_time,end_time,array_agg(session_id ORDER BY session_id) AS session_ids,count(*)-1 AS extra_rows
  FROM public.sessions WHERE status<>'cancelled' GROUP BY class_id,date,start_time,end_time HAVING count(*)>1) q),'[]'::jsonb),
 'invalid_times',coalesce((SELECT jsonb_agg(jsonb_build_object('session_id',session_id,'billing_period',billing_period,'date',date,'start',start_time,'end',end_time))
  FROM public.sessions WHERE end_time<=start_time),'[]'::jsonb),
 'scheduled_in_archived_classes',coalesce((SELECT jsonb_agg(jsonb_build_object('class_id',s.class_id,'session_id',s.session_id,'date',s.date))
  FROM public.sessions s JOIN public.classes c USING(class_id) WHERE c.status='archived' AND s.status='scheduled'),'[]'::jsonb)
);
ROLLBACK;
