// Exercise the actual export handlers with synthetic data and the installed writer.
// Capture downloads in memory; round-trip XLSX bytes to verify types and contents.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');

function exportHandler(file, name, state, importFails = false) {
  const source = ts.createSourceFile(file, fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) expression = node.initializer.getText(source);
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) expression = node.getText(source);
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(expression, 'Export handler exists');
  const output = [], errors = [];
  const context = {
    ...state, output, errors, exports: {},
    formatVND: amount => amount.toLocaleString('vi-VN') + ' ₫',
    format: () => '15-10-2026',
    alert: message => errors.push(message), showAlert: async message => errors.push(message),
    require: name => {
      assert.equal(name, 'xlsx');
      if (importFails) throw Error('Synthetic chunk download failure');
      return { ...XLSX, writeFile: (workbook, filename) => output.push({ filename, workbook: XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' }) }) };
    },
  };
  const compiled = ts.transpileModule('exports.run = ' + expression, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(compiled, context, { filename: file });
  return { run: context.exports.run, output, errors };
}
const rows = (book, index = 0) => XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[index]], { header: 1 });

test('class export preserves Vietnamese labels, numeric fees and cancelled sessions', async () => {
  const handler = exportHandler('app/admin/classes/[id]/page.tsx', 'handleExportReport', {
    classInfo: { name: 'Lớp thử', tutors: { name: 'Gia sư thử' } },
    studentsInClass: [{ student_id: 'fixture-001', students: { name: 'Học sinh thử' }, tuition_fee_per_session: 150000, status: 'active' }],
    classSessions: [{ date: '2026-10-01', start_time: '18:00:00', end_time: '20:00:00', csat_fee_snapshot: 0, status: 'cancelled' }],
  });
  await handler.run(); assert.deepEqual(handler.errors, []);
  const book = handler.output[0].workbook;
  assert.deepEqual(book.SheetNames, ['Danh sách học sinh', 'Lịch sử buổi học']);
  assert.deepEqual(rows(book)[1], ['fixture', 'Học sinh thử', 150000, 'Đang học']);
  assert.deepEqual(rows(book, 1)[1], ['2026-10-01', '18:00 - 20:00', 'Gia sư thử', 0, 'Đã hủy']);
});

test('tuition exports retain preview averages, adjustments and refund balances', async () => {
  const state = { viewMode: 'preview', startDate: '2026-10-01', endDate: '2026-10-31', selectedHistoricalPeriod: '2026-10', stats: { studentInvoicePreview: [{ student_name: 'Học sinh thử', class_name: 'C', session_count: 2, total_amount: 300000 }] }, sessionCountMap: { 's|c': 2 }, payments: [{ student_id: 's', class_id: 'c', students: { name: 'Học sinh thử' }, classes: { name: 'C' }, amount: 300000, adjustment_amount: -50000, balance: -20000 }] };
  for (const mode of ['preview', 'historical']) {
    const handler = exportHandler('features/billing/components/StudentTuitionTable.tsx', 'exportCustomerPayments', { ...state, viewMode: mode });
    await handler.run(); assert.deepEqual(handler.errors, []);
    const row = rows(handler.output[0].workbook)[1];
    if (mode === 'preview') assert.deepEqual(row.slice(2, 5), [2, 300000, 150000]);
    else assert.deepEqual(row.slice(2, 8), [2, 300000, -50000, -20000, 125000, 'Cần hoàn']);
  }
});

test('salary exports preserve totals and disambiguate duplicate tutor sheet names', async () => {
  const cls = { class_id: 'c', class_name: 'C', session_count: 1, tuition: 300000, csat: 50000, sessions: [{ date: '2026-10-01', attended_count: 2, tuition: 300000, csat: 50000, net: 250000 }] };
  const tutor = { name: 'Gia sư thử', salary: 250000, tuition_collected: 300000, csat_deducted: 50000, classes: [cls] };
  const admin = exportHandler('features/billing/components/TutorSalaryTable.tsx', 'exportTutorSalaries', { selectedHistoricalPeriod: '2026-10', stats: { tutorSalaryDetail: [tutor, tutor] } });
  await admin.run(); assert.deepEqual(admin.errors, []);
  const book = admin.output[0].workbook;
  assert.equal(book.SheetNames.length, 3); assert.equal(new Set(book.SheetNames).size, 3);
  assert.deepEqual(rows(book)[1].slice(1), [1, 300000, 50000, 250000]);
  const own = exportHandler('app/tutor/salary/page.tsx', 'exportExcel', { tutorInfo: tutor, selectedPeriod: '2026-10', salaryData: { sessions: 1, tuition: 300000, csat: 50000, net: 250000, classSummary: [cls] }, sessionDetails: [{ ...cls.sessions[0], classId: 'c', className: 'C', attendedCount: 2, start_time: '18:00', end_time: '20:00' }] });
  await own.run(); assert.deepEqual(own.errors, []);
  assert.deepEqual(rows(own.output[0].workbook).at(-1), ['TỔNG KỲ 2026-10', '', 1, 300000, 50000, 250000]);
});

test('failed lazy download reports an error without producing a workbook', async () => {
  const handler = exportHandler('app/admin/classes/[id]/page.tsx', 'handleExportReport', { classInfo: { name: 'Fixture' } }, true);
  await handler.run(); assert.equal(handler.output.length, 0); assert.equal(handler.errors.length, 1);
});
