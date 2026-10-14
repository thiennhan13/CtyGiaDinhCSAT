import type { MetadataRoute } from 'next';
import { publicPagePaths, publicUrl } from '@/lib/public-seo';
export default function sitemap():MetadataRoute.Sitemap {
 return publicPagePaths.map(path=>({url:publicUrl(path),changeFrequency:'monthly' as const,priority:path==='/'?1:0.8}));
}
