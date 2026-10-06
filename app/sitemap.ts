import type { MetadataRoute } from 'next';
import { publicPosts } from '@/lib/public-posts';
export default function sitemap():MetadataRoute.Sitemap {
 return ['', '/hoc-lieu-mien-phi', '/thanh-tich', '/gia-su', '/bai-dang', ...publicPosts.map(post => `/bai-dang/${post.slug}`), '/dang-ky-hoc', '/lo-trinh', '/lo-trinh/a', '/lo-trinh/b', '/lo-trinh/c', '/lo-trinh/e', '/lo-trinh/k'].map(path=>({url:`https://portal.csatoj.vn${path}`,changeFrequency:'monthly' as const,priority:path===''?1:0.8}));
}
