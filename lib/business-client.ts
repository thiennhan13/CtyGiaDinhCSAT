// Retain the key after uncertain transport errors: a retry must not duplicate a write.
const pendingKeys = new Map<string, string>();
export async function postBusiness<T = Record<string, unknown>>(url: string, body: Record<string, unknown>): Promise<T> {
  const signature = JSON.stringify([url, body]);
  const requestId = pendingKeys.get(signature) ?? crypto.randomUUID();
  pendingKeys.set(signature, requestId);
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, requestId }) });
  const result = await response.json();
  if (!response.ok) {
    if (response.status < 500) pendingKeys.delete(signature);
    throw new Error(result.error ?? 'Không thể hoàn tất thao tác.');
  }
  pendingKeys.delete(signature);
  return result as T;
}
export function changeClass(action: string, classId: string, data: Record<string, unknown> = {}) {
  return postBusiness('/api/admin/classes', { action, class_id: classId, ...data });
}
