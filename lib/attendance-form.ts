export interface AttendanceStudent { student_id: string; name: string; }
type StudentJoin = AttendanceStudent | AttendanceStudent[] | null;
export interface EnrollmentRow { students: StudentJoin; }
export interface ExistingAttendanceRow {
  student_id: string; status: 'attended' | 'absent'; notes: string | null; students: StudentJoin;
}
export interface AttendanceEntry { status: 'attended' | 'absent' | null; notes: string; }
export type AttendanceForm = Record<string, AttendanceEntry>;

const studentFromJoin = (join: StudentJoin) => Array.isArray(join) ? join[0] : join;

/** Keep historical records, even after a student has left the active roster. */
export function buildAttendanceForm(enrollments: EnrollmentRow[], existing: ExistingAttendanceRow[]) {
  const students = new Map<string, AttendanceStudent>();
  const attendance: AttendanceForm = {};
  for (const row of enrollments) {
    const student = studentFromJoin(row.students);
    if (student) students.set(student.student_id, student);
  }
  for (const row of existing) {
    if (row.status !== 'attended' && row.status !== 'absent') throw new Error('Trạng thái điểm danh đã lưu không hợp lệ. Vui lòng liên hệ CSAT.');
    const student = studentFromJoin(row.students);
    if (!students.has(row.student_id)) students.set(row.student_id,
      { student_id: row.student_id, name: student?.name || 'Học sinh không còn hiển thị hồ sơ' });
    attendance[row.student_id] = { status: row.status, notes: row.notes || '' };
  }
  for (const id of students.keys()) attendance[id] ??= { status: null, notes: '' };
  return { students: [...students.values()], attendance };
}

/** Unknown is a form state only: never send it as an attendance or tuition record. */
export function buildAttendancePayload(sessionId: string, students: AttendanceStudent[], attendance: AttendanceForm) {
  const rows: Array<{ session_id: string; student_id: string; status: 'attended' | 'absent'; notes: string }> = [];
  for (const student of students) {
    const entry = attendance[student.student_id];
    if (!entry || entry.status === null) {
      if (entry?.notes.trim()) throw new Error(`Hãy chọn Có mặt hoặc Vắng mặt cho ${student.name} trước khi lưu ghi chú.`);
      continue;
    }
    if (entry.status !== 'attended' && entry.status !== 'absent') throw new Error('Trạng thái điểm danh không hợp lệ.');
    rows.push({ session_id: sessionId, student_id: student.student_id, status: entry.status, notes: entry.notes });
  }
  if (!rows.length) throw new Error('Hãy chọn Có mặt hoặc Vắng mặt cho ít nhất một học sinh trước khi lưu.');
  return rows;
}
