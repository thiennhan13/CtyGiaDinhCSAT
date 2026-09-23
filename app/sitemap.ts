import type { MetadataRoute } from 'next';
export default function sitemap():MetadataRoute.Sitemap {
 return ['', '/lo-trinh', '/lo-trinh/co-ban', '/lo-trinh/nang-cao', '/lo-trinh/hsgqg'].map(path=>({url:`https://portal.csatoj.vn${path}`,changeFrequency:'monthly' as const,priority:path===''?1:0.8}));
}
