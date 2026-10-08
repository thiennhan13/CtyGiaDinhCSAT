import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { readLookupHash } from '@/lib/parent-lookup';
import { createAdminClient } from '@/lib/supabase/service';
import { monthSchema } from '@/lib/learning';
import type { ParentLearningData } from '@/lib/parent-learning';
import { accessibleParentTopic, parentTopicHref, parentTopicReturnHref } from '@/lib/parent-topics';
import { readParentTopicDocument } from '@/lib/parent-topic-document';
import { ParentShell } from '@/components/learning/ParentShell';
import { ParentTopicDocument } from '@/components/learning/ParentTopicDocument';
import '@/components/learning/parent-topics.css';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata: Metadata = { title: 'Chuyên đề học tập | CSAT', robots: { index: false, follow: false, nocache: true } };
const contextSchema = z.object({ student: z.string().uuid(), class: z.string().uuid(), month: monthSchema.optional(), page: z.coerce.number().int().min(0).max(10000).default(0) });

export default async function ParentTopicPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const hash = await readLookupHash();
  if (!hash) redirect('/login');
  const context = contextSchema.safeParse(await searchParams);
  if (!context.success) notFound();
  const { data, error } = await createAdminClient().rpc('parent_learning_portal', { p_token_hash: hash, p_student_id: context.data.student, p_month: context.data.month ?? null, p_review_page: context.data.page });
  if (error) return <ParentShell navigationEnabled={false}><div className="parent-card"><h1 className="text-2xl font-bold">Chuyên đề học tập</h1><p className="my-4" role="status">{error.code === '42501' ? 'Phiên tra cứu đã hết hạn hoặc học sinh không còn được liên kết. Vui lòng đăng nhập lại.' : 'Chưa tải được chuyên đề. Vui lòng thử lại sau hoặc liên hệ CSAT.'}</p><Link href="/login" className="csat-btn">Về trang liên lạc</Link></div></ParentShell>;
  const portal = data as ParentLearningData;
  if (portal?.student?.student_id !== context.data.student) notFound();
  const access = accessibleParentTopic(portal, context.data.class, (await params).slug);
  if (!access) notFound();
  const { article, plan, series } = access;
  const navigation = { student: context.data.student, classId: context.data.class, month: portal.month, page: portal.reviewPage };
  const index = series.findIndex(item => item.slug === article.slug);
  const markdown = await readParentTopicDocument(article.slug);
  return <ParentShell navigationEnabled={false} article><article className="parent-topic-page">
    <Link className="parent-topic-back print:hidden" href={parentTopicReturnHref(navigation)}><ArrowLeft size={18} aria-hidden="true"/>Về lộ trình học tập</Link>
    <header className="parent-topic-header"><div className="parent-topic-meta"><span><BookOpen size={16} aria-hidden="true"/>{article.topicCode} · {article.topicCode[0] === 'A' ? 'Nhập môn A' : article.topicCode[0] === 'B' ? 'Cơ bản B' : 'Nâng cao C'}</span><span>{plan.class_name}</span>{series.length > 1 && <span>Bài {index + 1}/{series.length}</span>}</div><h1>{article.title}</h1><p>{article.excerpt}</p></header>
    {series.length > 1 && <nav className="parent-topic-series print:hidden" aria-label="Các bài trong chuyên đề"><p>CÙNG MỘT CHUYÊN ĐỀ</p><ol>{series.map(item => <li key={item.slug}><Link href={parentTopicHref(item.slug, navigation)} aria-current={item.slug === article.slug ? 'page' : undefined}><span>{String(item.order).padStart(2, '0')}</span>{item.title}</Link></li>)}</ol></nav>}
    <ParentTopicDocument markdown={markdown}/>
    <nav className="parent-topic-pagination print:hidden" aria-label="Điều hướng bài viết">{series[index - 1] && <Link href={parentTopicHref(series[index - 1].slug, navigation)}><ArrowLeft size={18} aria-hidden="true"/><span>Bài trước<strong>{series[index - 1].title}</strong></span></Link>}{series[index + 1] && <Link href={parentTopicHref(series[index + 1].slug, navigation)}><span>Bài tiếp theo<strong>{series[index + 1].title}</strong></span><ArrowRight size={18} aria-hidden="true"/></Link>}</nav>
  </article></ParentShell>;
}
