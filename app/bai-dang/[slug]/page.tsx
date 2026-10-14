import type { Metadata } from 'next';
import { publicPageMetadata } from '@/lib/public-seo';
import { postStructuredData } from '@/lib/public-structured-data';
import { PublicStructuredData } from '@/components/marketing/PublicStructuredData';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { PublicShell } from '@/components/marketing/PublicShell';
import { getPublicPost, publicPosts } from '@/lib/public-posts';
import '@/components/marketing/posts.css';

export function generateStaticParams() { return publicPosts.map(post => ({ slug: post.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPublicPost((await params).slug);
  if (!post) notFound();
  return publicPageMetadata({ path: `/bai-dang/${post.slug}`, title: `${post.title} — CSAT`, description: post.excerpt, type: 'article' });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPublicPost((await params).slug);
  if (!post) notFound();
  return <PublicShell><PublicStructuredData data={postStructuredData(post)} /><div className="posts-page post-detail-wrap wrap"><Link className="text-link post-back" href="/bai-dang"><ArrowLeft size={18} aria-hidden="true" />Góc học Tin</Link>
    <article className="post-detail"><header className="post-author"><Image src="/icon/csat-logo-compact.svg" alt="CSAT" width={91} height={40} /><div><strong>CSAT Tutor</strong><p>{post.category}</p></div></header>
      <div className="post-detail-copy"><h1>{post.title}</h1>{post.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
      <div className="post-detail-image"><Image src={post.image} alt={post.imageAlt} width={960} height={720} sizes="(max-width:900px) 90vw, 800px" priority /></div>
      <footer className="post-detail-footer"><Link className="text-link" href={post.link.href}>{post.link.label}<ArrowUpRight size={20} aria-hidden="true" /></Link></footer>
    </article>
    <section className="post-related" aria-labelledby="related-title"><h2 id="related-title">Tìm hiểu thêm</h2><ul>{post.relatedLinks.map(link => <li key={link.href}><Link className="text-link" href={link.href}>{link.label}<ArrowUpRight size={18} aria-hidden="true" /></Link></li>)}</ul></section>
  </div></PublicShell>;
}
