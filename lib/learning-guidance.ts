export const levels = { thcs: 'THCS', thpt: 'THPT', university: 'Đại học' } as const;
export const goals = { thcs: 'HSG cấp THCS', specialist: 'Chuyên Tin', province: 'HSG tỉnh cấp THPT', national: 'HSG Quốc gia', undecided: 'Chưa rõ, cần tư vấn' } as const;
export type Level = keyof typeof levels;
export type Goal = keyof typeof goals;
export function validLevel(value: unknown): Level | '' { return typeof value === 'string' && Object.hasOwn(levels, value) ? value as Level : ''; }
export function validGoal(value: unknown): Goal { return typeof value === 'string' && Object.hasOwn(goals, value) ? value as Goal : 'undecided'; }
export function recommendedProgram(level: string, goal: string) {
  if (level === 'university') return 'consultation';
  if (goal === 'national') return 'hsgqg';
  if (goal === 'province') return 'nang-cao';
  if (goal === 'thcs' || goal === 'specialist') return 'co-ban';
  return 'consultation';
}
export const programs = {
  'co-ban': {
    code: 'basic', name: 'Cơ bản', eyebrow: 'Bắt đầu từ nền tảng',
    summary: 'Từ những dòng C++ đầu tiên đến cách giải bài toán với dãy, số học và xâu.',
    audience: 'Học sinh bắt đầu học C++ hoặc muốn hệ thống lại kiến thức; xây dựng nền tảng để hướng tới HSG cấp THCS và Chuyên Tin.',
    prerequisite: 'Chưa cần biết lập trình. Khi tư vấn, CSAT sẽ trao đổi về kinh nghiệm học và mục tiêu để chọn điểm bắt đầu phù hợp.',
    next: 'Khi đã vận dụng được nền tảng, học sinh có thể tiếp tục chương trình Nâng cao. Nội dung ôn thi cụ thể cần đối chiếu với mục tiêu và yêu cầu từng kỳ thi.',
  },
  'nang-cao': {
    code: 'advanced', name: 'Nâng cao', eyebrow: 'Kết nối kiến thức, chọn cách giải',
    summary: 'Phối hợp cấu trúc dữ liệu và thuật toán để giải bài toán hiệu quả hơn.',
    audience: 'Học sinh đã có nền tảng C++ và muốn luyện giải thuật sâu hơn, hướng tới HSG tỉnh cấp THPT.',
    prerequisite: 'Cần sử dụng được điều kiện, vòng lặp, hàm, mảng và xâu; có kinh nghiệm tự viết và kiểm tra chương trình. Gia sư sẽ trao đổi thêm để xác định phần cần củng cố.',
    next: 'Sau chương trình, CSAT cùng học sinh nhìn lại bài làm và mục tiêu để chọn nội dung học tiếp. Định hướng HSG Quốc gia được tư vấn riêng.',
  },
} as const;
export type ProgramSlug = keyof typeof programs;

