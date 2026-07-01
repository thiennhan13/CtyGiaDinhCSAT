/**
 * lib/format.ts
 * Thư viện tiện ích định dạng chuẩn cho toàn bộ hệ thống CSAT Tutor
 * Đảm bảo nguyên tắc DRY và nhất quán trong trải nghiệm người dùng.
 */

/**
 * Định dạng số tiền sang chuẩn tiền tệ Việt Nam (VNĐ), có kèm ký hiệu ₫
 * Ví dụ: formatVND(100000) => "100.000 ₫"
 */
export function formatVND(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (num === null || num === undefined || isNaN(num)) {
    return '0 ₫';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
}

/**
 * Định dạng số nguyên/số thực theo chuẩn Việt Nam (không kèm ký hiệu tiền tệ)
 * Ví dụ: formatNumber(100000) => "100.000"
 */
export function formatNumber(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('vi-VN').format(num);
}

/**
 * Định dạng chuỗi ngày tháng (ISO/SQL date string) sang chuẩn Việt Nam (dd/MM/yyyy)
 * Ví dụ: formatDateVN("2026-07-01") => "01/07/2026"
 */
export function formatDateVN(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '---';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if (isNaN(date.getTime())) return '---';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '---';
  }
}

/**
 * Dịch và chuẩn hóa cấu hình hiển thị cho các mã trạng thái trong hệ thống
 */
export function getStatusConfig(status: string | null | undefined): {
  label: string;
  badgeClass: string;
} {
  switch (status?.toLowerCase()) {
    // Trạng thái lớp học & học sinh
    case 'active':
    case 'đang học':
      return { label: 'Đang học', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'dropped':
    case 'nghỉ học':
      return { label: 'Đã nghỉ', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
    case 'archived':
      return { label: 'Đã lưu trữ', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };

    // Trạng thái buổi học (sessions)
    case 'scheduled':
      return { label: 'Sắp diễn ra', badgeClass: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'completed':
      return { label: 'Đã hoàn thành', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'cancelled':
      return { label: 'Đã hủy', badgeClass: 'bg-red-100 text-red-800 border-red-200' };

    // Trạng thái hóa đơn (payments)
    case 'paid':
      return { label: 'Đã thu', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'unpaid':
      return { label: 'Chưa thu', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };

    // Trạng thái điểm danh (attendance)
    case 'attended':
      return { label: 'Có mặt', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'absent':
      return { label: 'Vắng mặt', badgeClass: 'bg-red-100 text-red-800 border-red-200' };

    default:
      return { label: status || '---', badgeClass: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}
