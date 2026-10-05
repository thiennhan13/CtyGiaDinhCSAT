import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { PublicShell } from '@/components/marketing/PublicShell';
import { CodeIcon, Reveal } from '@/components/marketing/PublicMotion';
import { publicPosts } from '@/lib/public-posts';
import '@/components/marketing/posts.css';

export const metadata: Metadata = {
  title: 'Góc học Tin — CSAT',
  description: 'Tìm hiểu chương trình học, cách luyện bài và đội ngũ gia sư chuyên Phan tại CSAT.',
  alternates: { canonical: 'https://portal.csatoj.vn/bai-dang' },
};

export default function PostsPage() {
  return <PublicShell><div className="posts-page wrap">
    <header className="posts-heading"><p className="eyebrow">CSAT · Góc học Tin</p><h1>Chuyện học.<br /><span>Cách nghĩ.</span></h1><p>Cùng tìm hiểu việc học lập trình, cách luyện bài và những người đồng hành tại CSAT.</p><CodeIcon name="terminal" className="posts-heading-icon" /></header>
    <section className="posts-grid" aria-label="Bài đăng CSAT">{publicPosts.map((post, index) => <Reveal key={post.slug} className="post-card" variant="rise" delay={index * 90}>
      <Link href={`/bai-dang/${post.slug}`} className="post-card-link"><div className="post-card-image"><Image src={post.image} alt={post.imageAlt} width={960} height={720} sizes="(max-width:680px) 90vw, (max-width:1100px) 45vw, 30vw" /></div><div className="post-card-copy"><p className="eyebrow">{post.category}</p><h2>{post.title}</h2><p>{post.excerpt}</p><span className="post-read">Đọc bài <ArrowUpRight size={20} aria-hidden="true" /></span></div></Link>
    </Reveal>)}</section>
  </div></PublicShell>;
}
