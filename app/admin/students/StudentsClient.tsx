'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, UserX, ExternalLink, PencilLine, FileText, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { useAlert } from '@/components/ui/use-dialog';
import { createStudent, updateStudent, deleteStudent } from '@/features/students/actions';
import type { Student } from '@/types/database';

// ─── Sub-Components ────────────────────────────────────────────────────────────

/** Hiển thị thông tin liên lạc: nếu là link thì render <a>, nếu là SĐT thì render text */
function ContactDisplay({ value, label }: { value: string | null; label: string }) {
  if (!value) return <span className="text-muted-foreground/50 text-sm">---</span>;
  const isLink = value.startsWith('http://') || value.startsWith('https://');
  if (isLink) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center gap-1 text-sm">
        <ExternalLink className="h-3 w-3 shrink-0" />
        <span className="truncate max-w-[160px]">{label}</span>
      </a>
    );
  }
  return (
    <span className="text-foreground text-sm flex items-center gap-1">
      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
      {value}
    </span>
  );
}

/** Tính tuổi từ ngày sinh (ISO string) */
function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  const age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  return m < 0 || (m === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;
}

/** CSS class cho Badge trạng thái học sinh */
function statusBadgeClass(status: string): string {
  if (status === 'Đang học')  return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
  if (status === 'Đã nghỉ')   return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20';
  if (status === 'Tạm dừng')  return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
  return 'bg-secondary text-foreground';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentsClientProps {
  initialStudents: Student[];
  totalStudents: number;
  totalPages: number;
  currentPage: number;
  searchTerm: string;
  statusFilter: string;
  feeFilter: string;
}

type FormData = Partial<Pick<Student,
  'name' | 'date_of_birth' | 'province' | 'student_contact' |
  'parent_contact' | 'parent_name' | 'zalo_class_name' | 'status' | 'notes'
>>;

const EMPTY_FORM: FormData = {
  status: 'Đang học',
  name: '',
  date_of_birth: null,
  province: '',
  student_contact: '',
  parent_contact: '',
  parent_name: '',
  zalo_class_name: '',
  notes: '',
};

// ─── StudentFormFields ─────────────────────────────────────────────────────────
// Dùng lại cho cả Add và Edit modal để tránh lặp code

function StudentFormFields({
  formData,
  onChange,
  showStatus = false,
}: {
  formData: FormData;
  onChange: (field: keyof FormData, value: unknown) => void;
  showStatus?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="f-name">Họ và tên học sinh <span className="text-destructive">*</span></Label>
        <Input id="f-name" value={formData.name ?? ''} onChange={e => onChange('name', e.target.value)} required placeholder="Nguyễn Văn A" />
      </div>

      {showStatus && (
        <div className="space-y-2">
          <Label>Trạng thái</Label>
          <Combobox
            options={[
              { value: 'Đang học', label: 'Đang học' },
              { value: 'Tạm dừng', label: 'Tạm dừng' },
              { value: 'Đã nghỉ', label: 'Đã nghỉ' },
            ]}
            value={formData.status ?? 'Đang học'}
            onValueChange={val => val && onChange('status', val)}
            placeholder="Chọn trạng thái"
            searchPlaceholder="Tìm trạng thái..."
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="f-dob">Ngày sinh</Label>
          <Input id="f-dob" type="date" value={formData.date_of_birth ?? ''} onChange={e => onChange('date_of_birth', e.target.value || null)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-province">Tỉnh thành đang học</Label>
          <Input id="f-province" value={formData.province ?? ''} onChange={e => onChange('province', e.target.value)} placeholder="VD: Hà Nội" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-student-contact">Liên lạc học sinh</Label>
        <Input id="f-student-contact" value={formData.student_contact ?? ''} onChange={e => onChange('student_contact', e.target.value)} placeholder="Link Facebook hoặc số Zalo" />
        <p className="text-xs text-muted-foreground/70">Link FB hoặc số Zalo đều được — ưu tiên cách đang dùng để liên lạc với trung tâm</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="f-parent-name">Họ tên phụ huynh</Label>
          <Input id="f-parent-name" value={formData.parent_name ?? ''} onChange={e => onChange('parent_name', e.target.value)} placeholder="Nguyễn Văn B" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-parent-contact">Liên lạc phụ huynh</Label>
          <Input id="f-parent-contact" value={formData.parent_contact ?? ''} onChange={e => onChange('parent_contact', e.target.value)} placeholder="Link Facebook hoặc số Zalo" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-zalo-class">Tên lớp trên nhóm Zalo</Label>
        <Input id="f-zalo-class" value={formData.zalo_class_name ?? ''} onChange={e => onChange('zalo_class_name', e.target.value)} placeholder="VD: Cơ bản 1 - Cảnh Thọ" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-notes">Ghi chú</Label>
        <textarea
          id="f-notes"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[70px]"
          value={formData.notes ?? ''}
          onChange={e => onChange('notes', e.target.value)}
          placeholder="Ghi chú về học sinh..."
        />
      </div>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function StudentsClient({
  initialStudents,
  totalStudents,
  totalPages,
  currentPage,
  searchTerm: initialSearch,
  statusFilter: initialStatus,
  feeFilter: initialFeeFilter,
}: StudentsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { alert: showAlert, AlertDialog } = useAlert();

  const [localSearch, setLocalSearch] = useState(initialSearch);

  // Modal state
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ─── URL helpers ─────────────────────────────────────────────────────────────

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      return params.toString();
    },
    [searchParams]
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        router.push(pathname + '?' + createQueryString({ search: localSearch, page: '1' }));
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (updates: Record<string, string>) => {
    startTransition(() => {
      router.push(pathname + '?' + createQueryString({ ...updates, page: '1' }));
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(pathname + '?' + createQueryString({ page: String(newPage) }));
    });
  };

  // ─── Form helpers ─────────────────────────────────────────────────────────────

  const handleFieldChange = (field: keyof FormData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setSelectedStudent(null);
    setModal('add');
  };

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name:            student.name,
      date_of_birth:   student.date_of_birth,
      province:        student.province ?? '',
      student_contact: student.student_contact ?? '',
      parent_contact:  student.parent_contact ?? '',
      parent_name:     student.parent_name ?? '',
      zalo_class_name: student.zalo_class_name ?? '',
      status:          student.status,
      notes:           student.notes ?? '',
    });
    setModal('edit');
  };

  const openDelete = (student: Student) => {
    setSelectedStudent(student);
    setModal('delete');
  };

  // ─── Server Action handlers ───────────────────────────────────────────────────

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    setSubmitting(true);
    try {
      const result = await createStudent({
        name:            formData.name.trim(),
        status:          formData.status ?? 'Đang học',
        date_of_birth:   formData.date_of_birth ?? null,
        old_age:         null,
        province:        formData.province ?? null,
        student_contact: formData.student_contact ?? null,
        parent_contact:  formData.parent_contact ?? null,
        parent_name:     formData.parent_name ?? null,
        zalo_class_name: formData.zalo_class_name ?? null,
        notes:           formData.notes ?? null,
      });
      if (!result.success) throw new Error(result.error);
      setModal(null);
      startTransition(() => router.refresh());
    } catch (err) {
      await showAlert({ title: 'Lỗi', description: err instanceof Error ? err.message : 'Lỗi không xác định', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      const result = await updateStudent(selectedStudent.student_id, {
        name:            formData.name?.trim(),
        status:          formData.status,
        date_of_birth:   formData.date_of_birth ?? null,
        province:        formData.province ?? null,
        student_contact: formData.student_contact ?? null,
        parent_contact:  formData.parent_contact ?? null,
        parent_name:     formData.parent_name ?? null,
        zalo_class_name: formData.zalo_class_name ?? null,
        notes:           formData.notes ?? null,
      });
      if (!result.success) throw new Error(result.error);
      setModal(null);
      startTransition(() => router.refresh());
    } catch (err) {
      await showAlert({ title: 'Lỗi', description: err instanceof Error ? err.message : 'Lỗi không xác định', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      const result = await deleteStudent(selectedStudent.student_id);
      if (!result.success) throw new Error(result.error);
      setModal(null);
      startTransition(() => router.refresh());
    } catch (err) {
      await showAlert({ title: 'Lỗi', description: err instanceof Error ? err.message : 'Lỗi không xác định', variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <AlertDialog />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Quản lý Học Sinh</h2>
          <p className="text-sm text-muted-foreground">Tổng số: {totalStudents} học sinh</p>
        </div>
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Thêm học sinh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6 p-0 border-0">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, liên lạc, Tỉnh/Thành..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                className={`pl-9 ${isPending ? 'opacity-70' : ''}`}
              />
            </div>
            <div className="w-full sm:w-auto shrink-0 flex gap-2 flex-col sm:flex-row">
              <div className="w-full sm:w-40">
                <Combobox
                  options={[
                    { value: 'Tất cả', label: 'Tất cả trạng thái' },
                    { value: 'Đang học', label: 'Đang học' },
                    { value: 'Tạm dừng', label: 'Tạm dừng' },
                    { value: 'Đã nghỉ', label: 'Đã nghỉ' },
                  ]}
                  value={initialStatus}
                  onValueChange={val => navigate({ status: val ?? 'Tất cả' })}
                  placeholder="Trạng thái"
                  searchPlaceholder="Tìm trạng thái..."
                />
              </div>
              <div className="w-full sm:w-48">
                <Combobox
                  options={[
                    { value: 'Tất cả', label: 'Tất cả tình trạng HP' },
                    { value: 'Chưa nộp học phí', label: 'Chưa nộp học phí' },
                  ]}
                  value={initialFeeFilter}
                  onValueChange={val => navigate({ fee: val ?? 'Tất cả' })}
                  placeholder="Tình trạng học phí"
                  searchPlaceholder="Tìm..."
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className={`border border-border rounded-lg overflow-x-auto pb-2 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Họ tên</TableHead>
                  <TableHead>Liên lạc học sinh</TableHead>
                  <TableHead>Liên lạc phụ huynh</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Không tìm thấy học sinh nào
                    </TableCell>
                  </TableRow>
                ) : (
                  initialStudents.map(s => {
                    const age = calcAge(s.date_of_birth);
                    return (
                      <TableRow
                        key={s.student_id}
                        className="group hover:bg-secondary/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/students/${s.student_id}`)}
                      >
                        <TableCell>
                          <div className="font-semibold text-foreground">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {age != null ? `${age} tuổi` : ''}
                            {age != null && s.province ? ' • ' : ''}
                            {s.province ?? ''}
                          </div>
                          {s.zalo_class_name && (
                            <div className="text-xs text-primary mt-0.5">📌 {s.zalo_class_name}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ContactDisplay value={s.student_contact} label="Liên lạc HS" />
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground mb-0.5">{s.parent_name ?? ''}</div>
                          <ContactDisplay value={s.parent_contact} label="Liên lạc PH" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusBadgeClass(s.status)}>{s.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); router.push(`/admin/students/${s.student_id}`); }} title="Chi tiết">
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(s); }} title="Chỉnh sửa">
                            <PencilLine className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openDelete(s); }} title="Xóa">
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 p-4 border-t gap-4">
            <span className="text-sm text-muted-foreground">
              Hiển thị {initialStudents.length} trên tổng {totalStudents} kết quả (Trang {currentPage} / {totalPages})
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1 || isPending} onClick={() => handlePageChange(currentPage - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isPending} onClick={() => handlePageChange(currentPage + 1)}>Sau</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Modal */}
      <Dialog open={modal === 'add'} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm Học Sinh Mới</DialogTitle>
            <DialogDescription>Chỉ bắt buộc điền tên. Các thông tin còn lại có thể bổ sung sau.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <StudentFormFields formData={formData} onChange={handleFieldChange} showStatus={false} />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>Hủy</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Đang lưu...' : 'Lưu thông tin'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={modal === 'edit'} onOpenChange={open => !open && setModal(null)}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Học Sinh</DialogTitle>
            <DialogDescription>Cập nhật thông tin học sinh. Chỉ bắt buộc tên.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <StudentFormFields formData={formData} onChange={handleFieldChange} showStatus={true} />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModal(null)}>Hủy</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Đang cập nhật...' : 'Cập nhật'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={modal === 'delete'} onOpenChange={open => !open && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">CẢNH BÁO: XÓA HOÀN TOÀN (HARD DELETE)</DialogTitle>
            <DialogDescription className="space-y-2 mt-2 text-foreground">
              <p>Đây là hành động <strong>XÓA CỨNG</strong> và <strong>KHÔNG PHẢI TẠM DỪNG (SOFT DELETE)</strong>.</p>
              <p>Hành động này sẽ xóa <strong>VĨNH VIỄN</strong> học sinh <strong className="text-foreground">{selectedStudent?.name}</strong> cùng toàn bộ dữ liệu lịch sử điểm danh và học phí. Không thể khôi phục.</p>
              <p className="text-destructive font-medium">Lưu ý: Chỉ sử dụng khi tạo sai dữ liệu. Nếu học sinh nghỉ học, hãy đổi trạng thái thay vì Xóa cứng.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setModal(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={submitting}>
              {submitting ? 'Đang xóa...' : 'Xác nhận Xóa Hoàn Toàn'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
