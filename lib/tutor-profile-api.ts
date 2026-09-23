import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { businessSession, businessError } from './business-api';
import { createAdminClient } from './supabase/service';
import { AVATAR_BUCKET, DEFAULT_TUTOR_BACKGROUND, avatarUrl, profileSchema } from './tutor-profile';
import { normalizeTutorAvatar } from './tutor-avatar';

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function authorize(tutorId?: string, request?: Request) {
  const session = await businessSession(!!tutorId, request);
  if (session.response) return session;
  if (tutorId && !z.string().uuid().safeParse(tutorId).success) return { response: json({ error: 'Gia sư không hợp lệ.' }, 422) };
  let query = session.supabase.from('tutors').select('tutor_id,name').not('is_deleted', 'is', true);
  query = tutorId ? query.eq('tutor_id', tutorId) : query.eq('auth_uid', session.user.id).eq('status', 'active');
  const { data: tutor, error } = await query.maybeSingle();
  if (error) return { response: businessError(error) };
  if (!tutor) return { response: json({ error: 'Không có quyền truy cập hồ sơ gia sư này.' }, 403) };
  return { ...session, tutor };
}
function schemaError(error: { code?: string }) {
  return ['42703', '42P01', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error.code || '')
    ? json({ error: 'Hồ sơ gia sư đang chờ cập nhật database. Vui lòng thử lại sau.' }, 503) : businessError(error);
}
export async function getTutorProfile(tutorId?: string) {
  try {
    const access = await authorize(tutorId); if (access.response) return access.response;
    const { data, error } = await access.supabase.from('tutor_public_profiles')
      .select('tutor_id,introduction,background,major,university,achievements,avatar_path,revision,updated_at').eq('tutor_id', access.tutor.tutor_id).maybeSingle();
    if (error) return schemaError(error);
    const profile = data ?? { tutor_id: access.tutor.tutor_id, introduction: '', background: DEFAULT_TUTOR_BACKGROUND, major: '', university: '', achievements: '', avatar_path: null, revision: 0 };
    return json({ profile: { ...profile, name: access.tutor.name, avatar_url: avatarUrl(profile.avatar_path) } });
  } catch { return json({ error: 'Không tải được hồ sơ. Vui lòng thử lại.' }, 500); }
}

// Deletion is claimed in SQL, so a pending concurrent publication cannot lose its image.
export async function cleanupTutorAvatar(path: string) {
  const service = createAdminClient();
  const claim = await service.rpc('claim_tutor_avatar_cleanup', { p_path: path });
  if (claim.error || !claim.data) return false;
  const removed = await service.storage.from(AVATAR_BUCKET).remove([path]);
  if (removed.error) return false;
  const deleted = await service.from('tutor_avatar_assets').delete().eq('path', path).eq('state', 'deleting');
  return !deleted.error;
}

export async function saveTutorProfile(request: Request, tutorId?: string) {
  try {
    const access = await authorize(tutorId, request); if (access.response) return access.response;
    if (Number(request.headers.get('content-length') || 0) > 3 * 1024 * 1024 + 64 * 1024) return json({ error: 'Ảnh tối đa 3 MB.' }, 413);
    const form = await request.formData().catch(() => null);
    let input: unknown; try { input = JSON.parse(String(form?.get('profile') ?? '')); } catch { return json({ error: 'Dữ liệu hồ sơ không hợp lệ.' }, 422); }
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return json({ error: 'Kiểm tra các trường và giới hạn ký tự của hồ sơ.' }, 422);
    const data = parsed.data;
    if (!tutorId && data.background !== undefined) return json({ error: 'Chỉ admin được sửa thông tin nền.' }, 403);
    const current = await access.supabase.from('tutor_public_profiles').select('revision').eq('tutor_id', access.tutor.tutor_id).maybeSingle();
    if (current.error) return schemaError(current.error);
    if ((current.data?.revision ?? 0) !== data.revision) return json({ error: 'Hồ sơ đã thay đổi. Tải bản mới để đối chiếu; nội dung đang nhập vẫn được giữ.' }, 409);
    const file = form?.get('avatar');
    if (data.avatar_action !== 'replace' && file instanceof File && file.size) return json({ error: 'Thao tác ảnh không hợp lệ.' }, 422);
    let newPath: string | undefined;
    if (data.avatar_action === 'replace') {
      if (!(file instanceof File)) return json({ error: 'Chọn ảnh trước khi lưu.' }, 422);
      let image: Buffer;
      try { image = await normalizeTutorAvatar(file); } catch (e) { return json({ error: (e as Error).message }, 422); }
      const service = createAdminClient();
      newPath = `${access.tutor.tutor_id}/${randomUUID()}.webp`;
      const registered = await service.from('tutor_avatar_assets').insert({ path: newPath, tutor_id: access.tutor.tutor_id });
      if (registered.error) return schemaError(registered.error);
      const uploaded = await service.storage.from(AVATAR_BUCKET).upload(newPath, image, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
      if (uploaded.error) return json({ error: 'Chưa tải được ảnh lên kho lưu trữ. Hồ sơ và ảnh cũ được giữ nguyên.' }, 503);
      const ready = await service.from('tutor_avatar_assets').update({ state: 'ready' }).eq('path', newPath).eq('state', 'pending').select('path').single();
      if (ready.error) return json({ error: 'Chưa xác nhận được ảnh. Hồ sơ cũ được giữ nguyên; vui lòng thử lại.' }, 503);
    }
    const { revision, ...fields } = data;
    const result = await access.supabase.rpc('save_tutor_profile', {
      p_tutor_id: access.tutor.tutor_id, p_revision: revision,
      p_data: { ...fields, ...(newPath ? { avatar_path: newPath } : {}) },
    });
    // An uncertain response must never delete an image that may have been committed.
    // Unattached uploads remain in the registry for safe cleanup after 24 hours.
    if (result.error) return schemaError(result.error);
    const { previous_avatar_path: previous, ...profile } = result.data;
    if (previous && previous !== profile.avatar_path) {
      try { await cleanupTutorAvatar(previous); } catch { /* Registry preserves the cleanup task. */ }
    }
    return json({ profile: { ...profile, avatar_url: avatarUrl(profile.avatar_path) } });
  } catch { return json({ error: 'Chưa xác nhận được kết quả lưu. Nội dung đang nhập được giữ lại; tải bản mới để kiểm tra trước khi lưu lại.' }, 500); }
}
