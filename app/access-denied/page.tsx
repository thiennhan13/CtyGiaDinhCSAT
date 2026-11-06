import { publicPrivateRobots } from '@/lib/public-seo';
export const metadata = { robots: publicPrivateRobots };
export default function AccessDenied() {
  return <main className="mx-auto max-w-lg space-y-5 p-8"><h1 className="text-2xl font-bold">Chưa có quyền truy cập</h1><p>Vui lòng liên hệ CSAT để kiểm tra quyền của tài khoản hoặc đăng nhập bằng tài khoản khác.</p><form action="/api/auth/signout" method="post"><button className="csat-btn" type="submit">Đăng xuất</button></form></main>;
}
