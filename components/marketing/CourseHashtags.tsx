import { publicCourseHashtags, type PublicCourseCode } from '@/lib/public-courses';
import './course-hashtags.css';

export function CourseHashtags({ code }: { code: PublicCourseCode }) {
  const tags = publicCourseHashtags[code];
  if (!tags) return null;
  return <ul className="rm-course-hashtags" aria-label={`Đặc trưng lớp ${code}`}>
    {tags.map(tag => <li key={tag}>{tag}</li>)}
  </ul>;
}
