'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Plus, UserX, ExternalLink, PencilLine, FileText, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { useAlert } from '@/components/ui/use-dialog';

type Student = {
  student_id: string;
  name: string;
  date_of_birth: string | null;
  province: string | null;
  student_contact: string | null;
  parent_contact: string | null;
  parent_name: string | null;
  zalo_class_name: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
};

interface StudentsClientProps {
  initialStudents: Student[];
  totalStudents: number;
  totalPages: number;
  currentPage: number;
  searchTerm: string;
  statusFilter: string;
  feeFilter: string;
}

/** Hiển thị thông tin liên lạc: nếu là link thì render <a>, nếu là SĐT thì render text */
function ContactDisplay({ value, label }: { value: string | null; label: string }) {
  if (!value) return <span className="text-slate-400 text-sm">---</span>;
  const isLink = value.startsWith('http://') || value.startsWith('https://');
  if (isLink) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer"
        className="text-blue-600 hover:underline flex items-center gap-1 text-sm">
        <ExternalLink className="h-3 w-3 shrink-0" />
        <span className="truncate max-w-[160px]">{label}</span>
      </a>
    );
  }
  return (
    <span className="text-slate-700 text-sm flex items-center gap-1">
      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
      {value}
    </span>
  );
}

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

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(() => {
        router.push(pathname + '?' + createQueryString({ search: localSearch, page: '1' }));
      });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearch]);

  const handleStatusChange = (value: string | null) => {
    startTransition(() => {
      router.push(pathname + '?' + createQueryString({ status: value ?? 'Tất cả', page: '1' }));
    });
  };

  const handleFeeFilterChange = (value: string | null) => {
    startTransition(() => {
      router.push(pathname + '?' + createQueryString({ fee: value ?? 'Tất cả', page: '1' }));
    });
  };

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(pathname + '?' + createQueryString({ page: String(newPage) }));
    });
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Student>>({
    status: 'Đang học',
    notes: '',
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleInputChange = (field: keyof Student, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      status: 'Đang học',
      name: '',
      date_of_birth: null,
      province: '',
      student_contact: '',
      parent_contact: '',
      parent_name: '',
      zalo_class_name: '',
      notes: '',
    });
    setSelectedStudent(null);
  };

  const refreshPage = () => {
    startTransition(() => router.refresh());
  };

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', ...formData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsAddModalOpen(false);
      resetForm();
      refreshPage();
    } catch (err: any) {
      await showAlert({ title: 'Lỗi', description: 'Lỗi: ' + err.message, variant: 'error' });
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', student_id: selectedStudent.student_id, ...formData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsEditModalOpen(false);
      resetForm();
      refreshPage();
    } catch (err: any) {
      await showAlert({ title: 'Lỗi', description: 'Lỗi: ' + err.message, variant: 'error' });
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedStudent) return;
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', student_id: selectedStudent.student_id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setIsDeleteModalOpen(false);
      refreshPage();
    } catch (err: any) {
      await showAlert({ title: 'Lỗi', description: 'Lỗi: ' + err.message, variant: 'error' });
    }
  }

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name:                student.name,
      date_of_birth:       student.date_of_birth || null,
      province:            student.province || '',
      student_contact:     student.student_contact || '',
      parent_contact:      student.parent_contact || '',
      parent_name:         student.parent_name || '',
      zalo_class_name:     student.zalo_class_name || '',
      status:              student.status,
      notes:               student.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const statusColor = (status: string) => {
    if (status === 'Đang học') return 'bg-green-100 text-green-700 hover:bg-green-100';
    if (status === 'Đã nghỉ') return 'bg-red-100 text-red-700 hover:bg-red-100';
    if (status === 'Tạm dừng') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
  };

  const calcAge = (dob: string | null) => {
    if (!dob) return null;
    const today = new Date();
    const birth = new Date(dob);
    const age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    return m < 0 || (m === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;
  };

  return (
    <div className="space-y-6">
      <AlertDialog />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Học Sinh</h2>
          <p className="text-sm text-slate-500">Tổng số: {totalStudents} học sinh</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Thêm học sinh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6 p-0 border-0">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm theo tên, liên lạc, Tỉnh/Thành..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
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
                  onValueChange={(val) => handleStatusChange(val || 'Tất cả')}
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
                  onValueChange={(val) => handleFeeFilterChange(val || 'Tất cả')}
                  placeholder="Tình trạng học phí"
                  searchPlaceholder="Tìm..."
                />
              </div>
            </div>
          </div>

          <div className={`border rounded-lg overflow-x-auto transition-opacity ${isPending ? 'opacity-60' : ''}`}>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[220px]">Họ tên</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Phụ huynh</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Không tìm thấy học sinh nào</TableCell></TableRow>
                ) : (
                  initialStudents.map((s) => {
                    const age = calcAge(s.date_of_birth);
                    return (
                      <TableRow
                        key={s.student_id}
                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/students/${s.student_id}`)}
                      >
                        <TableCell>
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          <div className="text-xs text-slate-500">
                            {age != null ? `${age} tuổi` : ''}
                            {age != null && s.province ? ' • ' : ''}
                            {s.province || ''}
                          </div>
                          {s.zalo_class_name && (
                            <div className="text-xs text-indigo-600 mt-0.5">📌 {s.zalo_class_name}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <ContactDisplay value={s.student_contact} label="Liên lạc HS" />
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-slate-500 mb-0.5">{s.parent_name || ''}</div>
                          <ContactDisplay value={s.parent_contact} label="Liên lạc PH" />
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColor(s.status)}>{s.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/admin/students/${s.student_id}`); }} title="Chi tiết"><FileText className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(s); }} title="Chỉnh sửa"><PencilLine className="h-4 w-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedStudent(s); setIsDeleteModalOpen(true); }} title="Xóa"><UserX className="h-4 w-4 text-red-600" /></Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 p-4 border-t gap-4">
            <span className="text-sm text-slate-500">
              Hiển thị {initialStudents.length} trên tổng {totalStudents} kết quả (Trang {currentPage} / {totalPages})
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage <= 1 || isPending} onClick={() => handlePageChange(currentPage - 1)}>Trước</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages || isPending} onClick={() => handlePageChange(currentPage + 1)}>Sau</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======= Add Modal ======= */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm Học Sinh Mới</DialogTitle>
            <DialogDescription>Chỉ bắt buộc điền tên. Các thông tin còn lại có thể bổ sung sau.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Họ và tên học sinh <span className="text-red-500">*</span></Label>
              <Input id="add-name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} required placeholder="Nguyễn Văn A" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-dob">Ngày sinh</Label>
                <Input id="add-dob" type="date" value={formData.date_of_birth || ''} onChange={e => handleInputChange('date_of_birth', e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-province">Tỉnh thành đang học</Label>
                <Input id="add-province" value={formData.province || ''} onChange={e => handleInputChange('province', e.target.value)} placeholder="VD: Hà Nội" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-student-contact">Liên lạc học sinh</Label>
              <Input id="add-student-contact" value={formData.student_contact || ''} onChange={e => handleInputChange('student_contact', e.target.value)} placeholder="Link Facebook hoặc số Zalo" />
              <p className="text-xs text-slate-400">Link FB hoặc số Zalo đều được — ưu tiên cách đang dùng để liên lạc với trung tâm</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="add-parent-name">Họ tên phụ huynh</Label>
                <Input id="add-parent-name" value={formData.parent_name || ''} onChange={e => handleInputChange('parent_name', e.target.value)} placeholder="Nguyễn Văn B" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-parent-contact">Liên lạc phụ huynh</Label>
                <Input id="add-parent-contact" value={formData.parent_contact || ''} onChange={e => handleInputChange('parent_contact', e.target.value)} placeholder="Link Facebook hoặc số Zalo" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-zalo-class">Tên lớp trên nhóm Zalo</Label>
              <Input id="add-zalo-class" value={formData.zalo_class_name || ''} onChange={e => handleInputChange('zalo_class_name', e.target.value)} placeholder="VD: Cơ bản 1 - Cảnh Thọ" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-notes">Ghi chú</Label>
              <textarea
                id="add-notes"
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 min-h-[70px]"
                value={formData.notes || ''}
                onChange={e => handleInputChange('notes', e.target.value)}
                placeholder="Ghi chú về học sinh..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
              <Button type="submit">Lưu thông tin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======= Edit Modal ======= */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Học Sinh</DialogTitle>
            <DialogDescription>Cập nhật thông tin học sinh. Chỉ bắt buộc tên.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Họ và tên học sinh <span className="text-red-500">*</span></Label>
              <Input id="edit-name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Combobox
                options={[
                  { value: 'Đang học', label: 'Đang học' },
                  { value: 'Tạm dừng', label: 'Tạm dừng' },
                  { value: 'Đã nghỉ', label: 'Đã nghỉ' },
                ]}
                value={formData.status || 'Đang học'}
                onValueChange={(val) => val && handleInputChange('status', val)}
                placeholder="Chọn trạng thái"
                searchPlaceholder="Tìm trạng thái..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-dob">Ngày sinh</Label>
                <Input id="edit-dob" type="date" value={formData.date_of_birth || ''} onChange={e => handleInputChange('date_of_birth', e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-province">Tỉnh thành đang học</Label>
                <Input id="edit-province" value={formData.province || ''} onChange={e => handleInputChange('province', e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-student-contact">Liên lạc học sinh</Label>
              <Input id="edit-student-contact" value={formData.student_contact || ''} onChange={e => handleInputChange('student_contact', e.target.value)} placeholder="Link Facebook hoặc số Zalo" />
              <p className="text-xs text-slate-400">Link FB hoặc số Zalo đều được</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-parent-name">Họ tên phụ huynh</Label>
                <Input id="edit-parent-name" value={formData.parent_name || ''} onChange={e => handleInputChange('parent_name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parent-contact">Liên lạc phụ huynh</Label>
                <Input id="edit-parent-contact" value={formData.parent_contact || ''} onChange={e => handleInputChange('parent_contact', e.target.value)} placeholder="Link Facebook hoặc số Zalo" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-zalo-class">Tên lớp trên nhóm Zalo</Label>
              <Input id="edit-zalo-class" value={formData.zalo_class_name || ''} onChange={e => handleInputChange('zalo_class_name', e.target.value)} placeholder="VD: Cơ bản 1 - Cảnh Thọ" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Ghi chú</Label>
              <textarea
                id="edit-notes"
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 min-h-[70px]"
                value={formData.notes || ''}
                onChange={e => handleInputChange('notes', e.target.value)}
                placeholder="Ghi chú về học sinh..."
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
              <Button type="submit">Cập nhật</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======= Delete Modal ======= */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">CẢNH BÁO: XÓA HOÀN TOÀN (HARD DELETE)</DialogTitle>
            <DialogDescription className="space-y-2 mt-2 text-slate-800">
              <p>Đây là hành động <strong>XÓA CỨNG</strong> và <strong>KHÔNG PHẢI TẠM DỪNG (SOFT DELETE)</strong>.</p>
              <p>Hành động này sẽ xóa <strong>VĨNH VIỄN</strong> học sinh <strong className="text-slate-900">{selectedStudent?.name}</strong> cùng toàn bộ dữ liệu lịch sử điểm danh và học phí. Không thể khôi phục.</p>
              <p className="text-red-600 font-medium">Lưu ý: Chỉ sử dụng khi tạo sai dữ liệu. Nếu học sinh nghỉ học, hãy đổi trạng thái thay vì Xóa cứng.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Xác nhận Xóa Hoàn Toàn</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
