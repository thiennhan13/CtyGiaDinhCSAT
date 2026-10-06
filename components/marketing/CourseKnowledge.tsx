import curriculum from '@/lib/learning-curriculum-20260922.json';
import { type PublicCourseCode } from '@/lib/public-courses';
import { publicRoadmapContent, roadmapStageContent } from '@/lib/public-roadmap-content';
import './course-knowledge.css';

const topicLabels: Record<string, string> = {
  A01: 'Môi trường · I/O', A02: 'Kiểu dữ liệu · Toán tử', A03: 'Rẽ nhánh', A04: 'Vòng lặp', A05: 'Mảng 1 chiều', A06: 'Thao tác mảng', A07: 'Mảng 2 chiều', A08: 'Hàm', A09: 'Xâu ký tự',
  B01: 'Vét cạn', B02: 'Mảng thống kê', B03: 'Số chính phương', B04: 'Nguyên tố · Đếm ước', B05: 'Sàng Eratosthenes', B06: 'Euclid', B07: 'Thừa số nguyên tố', B08: 'Legendre', B09: 'Modulo · Lũy thừa nhanh · Đổi cơ số · Nhân Ấn Độ', B10: 'Vector', B11: 'Pair · Struct', B12: 'Map', B13: 'Sort · Comparator', B14: 'Chặt nhị phân', B15: 'Xử lý xâu · Palindrome',
  C01: 'Mảng cộng dồn', C02: 'Mảng hiệu', C03: 'Hai con trỏ · Cửa sổ trượt', C04: 'Vector · Pair · Unique', C05: 'Set · Map · Mảng đếm', C06: 'Queue · Deque · Stack', C07: 'Đệ quy · Merge sort', C08: 'Sinh tổ hợp', C09: 'Quay lui · Cắt nhánh', C10: 'Tham lam', C11: 'Chặt trên đáp án', C12: 'Hashing',
  D01: 'QHĐ nhập môn · Kadane', D02: 'QHĐ trên lưới', D03: 'Knapsack', D04: 'Chia tập', D05: 'LIS · Truy vết', D06: 'LCS · Edit Distance', D07: 'Trạng thái 2 chiều · Chia đoạn',
};

/** Ordered curriculum groups, never a mastery or automatic promotion indicator. */
export function CourseKnowledge({ code }: { code: PublicCourseCode }) {
  const content = publicRoadmapContent[code];
  const direction = content.development || content.pathway;
  const template = curriculum.find(item => item.program === (code === 'C' ? 'advanced' : 'basic'))!;
  const stages = code === 'E' || code === 'K' ? [] : template.stages.filter(stage => code === 'C' || stage.part === code);
  return <div className="course-knowledge" aria-label={stages.length ? `Các chặng kiến thức lớp ${code}` : code === 'E' ? 'Trọng tâm phát triển lớp E' : `Các bước tìm hiểu lớp ${code}`}>
    <ol className={`knowledge-${code.toLowerCase()}`}>{stages.length ? stages.map((stage, index) => <li key={stage.id}><span className="knowledge-index">0{index + 1}<span className="knowledge-range">{stage.lessons[0].code}–{stage.lessons.at(-1)!.code}</span></span><h3>{stage.title}</h3><ul className="knowledge-tags">{stage.lessons.map(lesson => <li key={lesson.code}>{topicLabels[lesson.code] || lesson.title}</li>)}</ul><p className="knowledge-skill"><strong>Tư duy rèn luyện</strong>{roadmapStageContent[stage.id].skills.join(' · ')}</p></li>) : direction.map((step, index) => <li key={step.title}><span className="knowledge-index">0{index + 1} / {step.label}</span><h3>{step.title}</h3><p>{step.description}</p></li>)}</ol>
  </div>;
}
