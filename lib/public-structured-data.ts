import { publicCourses, type PublicCourseCode } from '@/lib/public-courses';
import { publicContactChannels, publicContactEmail } from '@/lib/public-contact';
import type { PublicPost } from '@/lib/public-posts';
import { publicCourseDescriptions, publicLogo, publicSiteName, publicUrl } from '@/lib/public-seo';

export function publicOrganization() {
  return {
    '@type': 'EducationalOrganization', '@id': publicUrl('/#organization'),
    name: publicSiteName, url: publicUrl(), logo: publicUrl(publicLogo), email: publicContactEmail,
    sameAs: publicContactChannels.filter(channel => channel.name !== 'Zalo').map(channel => channel.url),
  };
}

export function homeStructuredData() {
  return { '@context': 'https://schema.org', '@graph': [publicOrganization(), {
    '@type': 'WebSite', '@id': publicUrl('/#website'), name: publicSiteName, url: publicUrl(),
    inLanguage: 'vi-VN', publisher: { '@id': publicUrl('/#organization') },
  }] };
}

function courseEntity(code: PublicCourseCode) {
  const course = publicCourses.find(item => item.code === code)!;
  const url = publicUrl(`/lo-trinh/${code.toLowerCase()}`);
  return {
    '@type': ['A', 'B', 'C'].includes(code) ? 'Course' : 'WebPage', '@id': `${url}#course`, url,
    name: `Lớp ${code} — ${course.name}`, description: publicCourseDescriptions[code],
    ...(['A', 'B', 'C'].includes(code) ? { provider: publicOrganization() } : { inLanguage: 'vi-VN' }),
  };
}

export function courseListStructuredData() {
  const courses = publicCourses.filter(course => ['A', 'B', 'C'].includes(course.code));
  return { '@context': 'https://schema.org', '@graph': [
    ...courses.map(course => courseEntity(course.code)),
    { '@type': 'ItemList', itemListElement: courses.map((course, index) => ({
      '@type': 'ListItem', position: index + 1, url: publicUrl(`/lo-trinh/${course.code.toLowerCase()}`),
    })) },
  ] };
}

export function courseStructuredData(code: PublicCourseCode) {
  return { '@context': 'https://schema.org', '@graph': [courseEntity(code), {
    '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Giới thiệu', item: publicUrl() },
      { '@type': 'ListItem', position: 2, name: 'Lộ trình học tập', item: publicUrl('/lo-trinh') },
      { '@type': 'ListItem', position: 3, name: code, item: publicUrl(`/lo-trinh/${code.toLowerCase()}`) },
    ],
  }] };
}

export function postStructuredData(post: PublicPost) {
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    '@id': publicUrl(`/bai-dang/${post.slug}#article`), mainEntityOfPage: publicUrl(`/bai-dang/${post.slug}`),
    headline: post.title, description: post.excerpt, image: publicUrl(post.image), inLanguage: 'vi-VN',
    author: publicOrganization(), publisher: publicOrganization(),
  };
}

/** Escape HTML-sensitive characters before embedding authored data in a script element. */
export function structuredDataJson(data: Record<string, unknown>) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
