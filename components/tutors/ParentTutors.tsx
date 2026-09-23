import type { ParentLearningData } from '@/lib/parent-learning';
import { avatarUrl } from '@/lib/tutor-profile';
import { TutorProfileCard } from './TutorProfileCard';
export function ParentTutors({ tutors }: { tutors: ParentLearningData['tutors'] }) {
  const groups = new Map<string, { tutor: ParentLearningData['tutors'][number]; classes: string[] }>();
  tutors.forEach((t, index) => {
    const key = t.tutor_id || `legacy-${index}`;
    const existing = groups.get(key);
    if (existing) { if (!existing.classes.includes(t.class_name)) existing.classes.push(t.class_name); }
    else groups.set(key, { tutor: t, classes: [t.class_name] });
  });
  return <div className="mb-6 grid gap-4">{Array.from(groups, ([key, { tutor: t, classes }]) => <TutorProfileCard key={key} classes={classes} profile={{
    name: t.name || 'Chưa phân gia sư', introduction: t.introduction || '', background: t.background || '',
    major: t.major || '', university: t.university || '', achievements: t.achievements || '', avatar_url: avatarUrl(t.avatar_path),
  }} />)}</div>;
}
