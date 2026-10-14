export const CLASS_PROGRAMS = {
  A: { label: 'A · Nhập môn', program: 'basic', classType: 'Lớp A' },
  B: { label: 'B · Thi đấu cơ bản', program: 'basic', classType: 'Lớp B' },
  AB: { label: 'A+B · Cơ bản', program: 'basic', classType: 'Lớp Cơ bản' },
  C: { label: 'C · Nâng cao', program: 'advanced', classType: 'Lớp Nâng cao' },
  E: { label: 'E · Chủ lực', program: 'custom', classType: 'Lớp E' },
  PREVOI: { label: 'PreVOI', program: 'voi', classType: 'Lớp PreVOI' },
  K: { label: 'K · Kèm riêng / tùy chỉnh', program: 'custom', classType: 'Lớp K' },
} as const;
export type ClassProgramCode = keyof typeof CLASS_PROGRAMS;
export const classProgramOptions = Object.entries(CLASS_PROGRAMS).map(([value, item]) => ({ value, label: item.label }));
export function classProgramLabel(code: string | null | undefined, legacy = '') { return code && Object.hasOwn(CLASS_PROGRAMS, code) ? CLASS_PROGRAMS[code as ClassProgramCode].label : legacy; }
