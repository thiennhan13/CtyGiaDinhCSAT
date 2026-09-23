import sharp from 'sharp';
import { MAX_AVATAR_BYTES } from './tutor-profile';

export async function normalizeTutorAvatar(file: File): Promise<Buffer> {
  if (!file.size || file.size > MAX_AVATAR_BYTES) throw new Error('Ảnh phải nhỏ hơn hoặc bằng 3 MB.');
  const formats: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!formats[file.type]) throw new Error('Chọn ảnh JPG, PNG hoặc WebP.');
  const source = Buffer.from(await file.arrayBuffer());
  try {
    const options = { limitInputPixels: 20_000_000, failOn: 'warning' as const };
    const metadata = await sharp(source, options).metadata();
    if (metadata.format !== formats[file.type] || (metadata.pages ?? 1) > 1) throw new Error('format');
    for (const quality of [82, 65, 45]) {
      const output = await sharp(source, options).rotate().resize(512, 512, { fit: 'cover', position: 'centre' }).webp({ quality }).toBuffer();
      if (output.length <= 200 * 1024) return output;
    }
  } catch { throw new Error('Ảnh không hợp lệ. Dùng ảnh tĩnh JPG, PNG hoặc WebP, tối đa 20 megapixel.'); }
  throw new Error('Ảnh quá phức tạp để nén. Vui lòng chọn ảnh khác.');
}
