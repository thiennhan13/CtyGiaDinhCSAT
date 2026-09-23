import type { ParentLearningData } from '@/lib/parent-learning';

const directions = {
  basic: {
    name: 'Chương trình Cơ bản',
    milestones: [
      {
        label: 'Định hướng hiện tại',
        title: 'HSG Tỉnh lớp 9',
        content: 'Từ nền tảng C++ ở tầng A, con luyện cách diễn đạt lời giải thành chương trình. Tầng B mở rộng sang vét cạn, thống kê, số học, sắp xếp, tìm kiếm và xử lý xâu để có thêm cách tiếp cận bài toán.',
        next: 'Trọng tâm rèn luyện: đọc đúng yêu cầu, chọn cách giải phù hợp, tự kiểm tra kết quả và giải thích được ý tưởng.',
      },
      {
        label: 'Hướng phát triển tiếp theo',
        title: 'Chuyên Tin',
        content: 'Vận dụng phối hợp kiến thức Cơ bản vào các bài toán ôn thi Chuyên Tin; rèn cách phân tích dữ kiện, tổ chức lời giải và kiểm tra các trường hợp dễ bỏ sót.',
        next: 'Gia sư đối chiếu bài làm và mục tiêu trường chuyên để chọn nội dung ôn luyện, củng cố phần còn thiếu trước khi tăng độ khó.',
      },
    ],
  },
  advanced: {
    name: 'Chương trình Nâng cao',
    milestones: [
      {
        label: 'Định hướng hiện tại',
        title: 'HSG Tỉnh cấp THPT',
        content: 'Khung C + D kết nối kỹ thuật trên mảng, cấu trúc dữ liệu, đệ quy, chia để trị, quay lui, tham lam, tìm kiếm trên đáp án, băm và quy hoạch động. Con luyện chọn thuật toán theo đặc điểm bài toán và giới hạn dữ liệu.',
        next: 'Trọng tâm rèn luyện: so sánh các cách giải, giải thích tính đúng đắn, đánh giá độ phức tạp và cải thiện chương trình từ kết quả kiểm thử.',
      },
      {
        label: 'Hướng mở rộng · Bổ sung chương trình',
        title: 'HSG Quốc gia',
        content: 'Từ nền tảng Nâng cao, hướng tới việc phân tích bài toán sâu hơn, phối hợp nhiều kỹ thuật và rèn khả năng tự tìm lời giải. Gia sư cùng học sinh xem lại bài làm để xác định kiến thức cần củng cố và chuyên đề cần học tiếp.',
        next: 'Chương trình HSG Quốc gia sẽ được bổ sung và công bố riêng sau khi trung tâm duyệt. Khung C + D hiện tại là nền tảng để phát triển tiếp.',
      },
    ],
  },
} as const;

export function ParentDevelopment({ plans }: { plans: ParentLearningData['plans'] }) {
  // Only published class plans reach this view; never infer a goal from a class name or a student's grade.
  const groups = (['basic', 'advanced'] as const).map(program => ({
    program,
    classes: plans.filter(plan => plan.kind === 'class' && plan.body.program === program),
  })).filter(group => group.classes.length > 0);

  return <section id="development" className="parent-card" aria-labelledby="development-heading">
    <p className="parent-eyebrow mb-3 text-primary">TỪ NỀN TẢNG ĐẾN MỤC TIÊU</p>
    <h2 id="development-heading">Định hướng phát triển của con</h2>
    <p className="parent-development-intro">Mỗi chặng học mở thêm một hướng phát triển. Dưới đây là định hướng của chương trình lớp; mục tiêu riêng của con được trao đổi dựa trên bài làm, nhận xét của gia sư và mong muốn của gia đình.</p>
    {groups.map(({ program, classes }) => <div className="parent-development-program" key={program}>
      <h3>{directions[program].name}</h3>
      <p className="parent-development-classes">{classes.map(plan => plan.class_name).join(' · ')}</p>
      <ol className="parent-development-path">
        {directions[program].milestones.map(milestone => <li key={milestone.title}>
          <p className="parent-eyebrow text-primary">{milestone.label}</p>
          <h4>{milestone.title}</h4>
          <p>{milestone.content}</p>
          <p className="parent-development-next">{milestone.next}</p>
        </li>)}
      </ol>
    </div>)}
    {!groups.length && <p className="text-sm leading-7 text-muted-foreground">Gia sư và gia đình sẽ cùng xác nhận hướng phát triển sau khi chương trình lớp được công bố. Với lớp luyện thi tùy chỉnh, định hướng được trao đổi theo mục tiêu cụ thể.</p>}
    {groups.length > 0 && <p className="parent-development-note">Nội dung thực học theo các chặng và chủ đề đã chọn ở lộ trình phía trên. “Định hướng hiện tại” mô tả mục tiêu của chương trình, không xác nhận con đã đạt mức thi tương ứng. Gia sư sẽ điều chỉnh bước tiếp theo dựa trên việc học thực tế.</p>}
  </section>;
}
