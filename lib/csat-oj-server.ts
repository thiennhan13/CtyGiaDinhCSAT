import 'server-only';
import { z } from 'zod';

export class OJError extends Error {
  constructor(public readonly code: string, public readonly status = 503) { super(code); }
}
export function ojConfig() {
  if (process.env.CSAT_OJ_ENABLED !== 'true') throw new OJError('not_configured');
  const instance = z.uuid().safeParse(process.env.CSAT_OJ_INSTANCE_ID);
  let origin: URL;
  try { origin = new URL(process.env.CSAT_OJ_ORIGIN ?? ''); } catch { throw new OJError('not_configured'); }
  const read = process.env.CSAT_OJ_READ_KEY ?? '', manage = process.env.CSAT_OJ_MANAGE_KEY ?? '';
  if (!instance.success || origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password
    || read.length < 32 || manage.length < 32 || read.length > 512 || manage.length > 512 || read === manage) throw new OJError('not_configured');
  return { origin: origin.origin, instance: instance.data, read, manage };
}
export async function ojRequest<T>(path: string, schema: z.ZodType<T>, manage = false, body?: unknown, method?: 'PUT' | 'POST') {
  const config = ojConfig();
  let response: Response;
  try {
    response = await fetch(config.origin + '/api/csat/v2/' + path, {
      method: body === undefined ? 'GET' : method ?? 'PUT', body: body === undefined ? undefined : JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', 'X-CSAT-Portal-Key': manage ? config.manage : config.read,
        'X-CSAT-OJ-Instance': config.instance }, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
  } catch { throw new OJError('unreachable'); }
  let raw: unknown;
  try { raw = await response.json(); } catch { throw new OJError('invalid_response'); }
  if (!response.ok) {
    const error = z.object({ error: z.string().regex(/^[a-z_]{1,80}$/) }).safeParse(raw);
    throw new OJError(error.success ? error.data.error : 'upstream_error', response.status);
  }
  const parsed = z.object({ api_version: z.literal('csat-portal-v2'), instance_id: z.literal(config.instance),
    as_of: z.iso.datetime({ offset: true }), data: schema }).safeParse(raw);
  if (!parsed.success) throw new OJError('invalid_response');
  return parsed.data;
}
export const ojMessages: Record<string, string> = {
  not_configured: 'Kết nối CSATOJ chưa được bật.', unreachable: 'Chưa kết nối được CSATOJ. Thử đồng bộ lại.',
  source_mismatch: 'Nguồn CSATOJ không khớp cấu hình.', revision_conflict: 'Phiên bản hai hệ thống khác nhau; cần đối soát trước khi tiếp tục.',
  student_not_in_organization: 'Có học sinh chưa tham gia tổ chức của lớp trên OJ.',
  binding_conflict: 'Tài khoản hoặc tổ chức đã được liên kết với hồ sơ khác.',
  contest_outside_class: 'Contest không thuộc tổ chức của lớp.', account_unavailable: 'Tài khoản OJ không còn hoạt động.',
  organization_unavailable: 'Tổ chức chưa được cấp quyền kết nối.', rate_limited: 'CSATOJ đang giới hạn tần suất. Vui lòng chờ rồi thử lại.',
  grant_revoked: 'Quyền đọc tài khoản đã bị thu hồi. Vui lòng liên hệ CSAT.', grant_revision_mismatch: 'Phiên liên kết OJ đã thay đổi. Cần admin đối soát lại.',
  link_unavailable: 'Liên kết đã thay đổi hoặc chưa sẵn sàng.', not_found: 'Không tìm thấy dữ liệu trên CSATOJ.',
};
export function ojMessage(error: unknown) {
  return error instanceof OJError ? ojMessages[error.code] ?? 'Không thể đồng bộ với CSATOJ. Vui lòng kiểm tra lại.' : 'Không thể hoàn tất kết nối CSATOJ.';
}
