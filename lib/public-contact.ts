/** Các kênh công khai do trung tâm cung cấp; không dùng liên hệ riêng của gia sư. */
export const publicZaloUrl = 'https://zalo.me/0917791599';
export const publicContactChannels = [
  { name: 'Zalo', label: '0917 791 599', url: publicZaloUrl },
  { name: 'Facebook', label: 'CSAT Tutor', url: 'https://www.facebook.com/csat.tutor' },
  { name: 'TikTok', label: '@csat.tutor', url: 'https://www.tiktok.com/@csat.tutor' },
] as const;

export const publicContactEmail = 'contact@csatoj.vn';
export const publicContactEmails = [publicContactEmail, 'csattutor@gmail.com'] as const;
