export interface BillingAttendance {
  attendance_id: string; item_id: string | null; student_id: string; student_name: string;
  status: 'attended' | 'absent'; fee: number | null; amount: number | null; original_amount: number | null;
}
export interface BillingSession {
  session_id: string; class_id: string; class_name: string; tutor_id: string; tutor_name: string;
  date: string; start_time: string; end_time: string; csat_rate: number | null;
  tuition: number; csat: number; net: number; attendance: BillingAttendance[];
}
export interface BillingPayment {
  payment_id: string; class_id: string | null; student_id: string | null; billing_period: string; amount: number;
  status: 'paid' | 'unpaid'; paid_at: string | null; balance: number; adjustment_amount: number;
  students: { name: string | null }; classes: { name: string | null };
}
export interface BillingReport {
  sessions: BillingSession[]; previewToken: string; totalStudentTuition: number; totalCsatRevenue: number; totalTutorSalary: number;
  period?: { period_id: string; label: string; source: 'legacy' | 'ledger' } | null; payments?: BillingPayment[]; originalInvoiceTotal?: number;
}
const sum = (values: number[]) => values.reduce((total, n) => total + Math.round(n * 100), 0) / 100;
export function billingPresentation(report: BillingReport) {
  const tutors = new Map<string, BillingSession[]>();
  const invoices = new Map<string, { student_id: string; class_id: string; student_name: string; class_name: string; session_count: number; total_amount: number; has_zero_fee: boolean }>();
  for (const s of report.sessions) {
    tutors.set(s.tutor_id, [...(tutors.get(s.tutor_id) ?? []), s]);
    for (const a of s.attendance.filter(a => a.status === 'attended')) {
      const key = a.student_id + '|' + s.class_id;
      const row = invoices.get(key) ?? { student_id: a.student_id, class_id: s.class_id, student_name: a.student_name, class_name: s.class_name, session_count: 0, total_amount: 0, has_zero_fee: false };
      row.session_count++; row.total_amount = sum([row.total_amount, a.amount ?? 0]); row.has_zero_fee ||= a.fee === 0;
      invoices.set(key, row);
    }
  }
  const tutorSalaryDetail = [...tutors].map(([tutor_id, sessions]) => {
    const classes = [...new Set(sessions.map(s => s.class_id))].map(class_id => {
      const rows = sessions.filter(s => s.class_id === class_id);
      return { class_id, class_name: rows[0].class_name, session_count: rows.length, tuition: sum(rows.map(s => s.tuition)),
        csat: sum(rows.map(s => s.csat)), salary: sum(rows.map(s => s.net)),
        sessions: rows.map(s => ({ ...s, attended_count: s.attendance.filter(a => a.status === 'attended').length })) };
    });
    return { tutor_id, name: sessions[0].tutor_name, salary: sum(sessions.map(s => s.net)), csat_deducted: sum(sessions.map(s => s.csat)),
      tuition_collected: sum(sessions.map(s => s.tuition)), classes };
  });
  const adjustmentTotal = sum((report.payments ?? []).map(p => p.adjustment_amount));
  return { ...report, totalStudentTuition: report.period ? (report.originalInvoiceTotal ?? 0) + adjustmentTotal : report.totalStudentTuition,
    snapshotTuitionTotal: report.totalStudentTuition, adjustmentTotal, totalCenterRevenue: report.totalCsatRevenue,
    tutorSalaryDetail, tutorSalaries: tutorSalaryDetail, studentInvoicePreview: [...invoices.values()],
    zeroFeeAttendanceIds: report.sessions.flatMap(s => s.attendance.filter(a => a.status === 'attended' && a.fee === 0).map(a => a.attendance_id)) };
}
