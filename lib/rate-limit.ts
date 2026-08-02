/**
 * lib/rate-limit.ts
 * In-memory rate limiter cho Next.js API Routes.
 * Giới hạn số lượng request từ cùng 1 IP trong khoảng thời gian nhất định.
 * Phù hợp cho Vercel Serverless (sẽ reset khi cold-start, nhưng đủ chặn spam cơ bản).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Dọn bộ nhớ mỗi 5 phút
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Kiểm tra rate limit cho một IP cụ thể.
 * @param ip - Địa chỉ IP của client
 * @param limit - Số request tối đa cho phép (mặc định: 50)
 * @param windowMs - Khoảng thời gian tính bằng ms (mặc định: 60000 = 1 phút)
 * @returns { success: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(
  ip: string,
  limit: number = 50,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const key = `rl:${ip}`;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    // Tạo entry mới
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;

  if (entry.count > limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Lấy IP từ Request headers (hỗ trợ Vercel, Cloudflare, proxy).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}
