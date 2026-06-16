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
import { Search, Plus, UserX, ExternalLink, PencilLine, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

type Student = {
  student_id: string;
  name: string;
  age: number | null;
  province: string;
  contact_phone: string;
  contact_link: string;
  status: string;
  notes?: string;
  created_at: string;
  default_tuition_fee: number;
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

  // Local state chỉ dùng để debounce ô tìm kiếm
  const [localSearch, setLocalSearch] = useState(initialSearch);

  // Hàm tạo URL mới với params đã cập nhật
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

  // Debounce tìm kiếm: cập nhật URL sau 350ms
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

  // --- Modals (CRUD) ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Student>>({ status: 'Đang học', default_tuition_fee: 100000, notes: '' });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleInputChange = (field: keyof Student, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ status: 'Đang học', name: '', age: null, province: '', contact_phone: '', contact_link: '', default_tuition_fee: 100000, notes: '' });
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
      alert('Lỗi: ' + err.message);
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
      alert('Lỗi: ' + err.message);
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
      resetForm();
      refreshPage();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    }
  }

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name, age: student.age, province: student.province || '',
      contact_phone: student.contact_phone || '', contact_link: student.contact_link || '',
      status: student.status, notes: student.notes || '', default_tuition_fee: student.default_tuition_fee || 100000
    });
    setIsEditModalOpen(true);
  };

  const statusColor = (status: string) => {
    if (status === 'Đang học') return 'bg-green-100 text-green-700 hover:bg-green-100';
    if (status === 'Đã nghỉ') return 'bg-red-100 text-red-700 hover:bg-red-100';
    if (status === 'Tạm dừng') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
  };

  return (
    <div className="space-y-6">
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
                placeholder="Tìm theo tên, SĐT, Tỉnh/Thành..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className={`pl-9 ${isPending ? 'opacity-70' : ''}`}
              />
            </div>
            <div className="w-full sm:w-auto shrink-0 flex gap-2 flex-col sm:flex-row">
              <Select value={initialStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tất cả">Tất cả trạng thái</SelectItem>
                  <SelectItem value="Đang học">Đang học</SelectItem>
                  <SelectItem value="Tạm dừng">Tạm dừng</SelectItem>
                  <SelectItem value="Đã nghỉ">Đã nghỉ</SelectItem>
                </SelectContent>
              </Select>
              <Select value={initialFeeFilter} onValueChange={handleFeeFilterChange}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Tình trạng học phí" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tất cả">Tất cả tình trạng HP</SelectItem>
                  <SelectItem value="Chưa nộp học phí">Chưa nộp học phí</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className={`border rounded-lg overflow-x-auto transition-opacity ${isPending ? 'opacity-60' : ''}`}>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">Họ tên</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-slate-500">Không tìm thấy học sinh nào</TableCell></TableRow>
                ) : (
                  initialStudents.map((s) => (
                    <TableRow
                      key={s.student_id}
                      className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/students/${s.student_id}`)}
                    >
                      <TableCell>
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.age ? `${s.age} tuổi • ` : ''}{s.province}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{s.contact_phone || '-'}</div>
                        {s.contact_link && (
                          <a href={s.contact_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs mt-1">
                            <ExternalLink className="h-3 w-3" /> Link liên lạc
                          </a>
                        )}
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
                  ))
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

      {/* Add Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Thêm Học Sinh Mới</DialogTitle>
            <DialogDescription>Nhập đầy đủ thông tin học sinh vào mẫu dưới đây.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="name">Họ Tên <span className="text-red-500">*</span></Label><Input id="name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="age">Tuổi <span className="text-red-500">*</span></Label><Input id="age" type="number" value={formData.age || ''} onChange={e => handleInputChange('age', e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="province">Tỉnh thành <span className="text-red-500">*</span></Label><Input id="province" value={formData.province || ''} onChange={e => handleInputChange('province', e.target.value)} required /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="phone">SĐT liên lạc</Label><Input id="phone" value={formData.contact_phone || ''} onChange={e => handleInputChange('contact_phone', e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="fb">Link liên lạc (Có thể bỏ qua)</Label><Input id="fb" value={formData.contact_link || ''} onChange={e => handleInputChange('contact_link', e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="fee">Học phí mặc định (VND/Buổi) <span className="text-red-500">*</span></Label><Input id="fee" type="number" value={formData.default_tuition_fee || 0} onChange={e => handleInputChange('default_tuition_fee', e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="notes">Ghi chú</Label><textarea id="notes" className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 min-h-[80px]" value={formData.notes || ''} onChange={e => handleInputChange('notes', e.target.value)} placeholder="Ghi chú về học sinh..." /></div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
              <Button type="submit">Lưu thông tin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Chỉnh sửa Học Sinh</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="edit-name">Họ Tên</Label><Input id="edit-name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="edit-age">Tuổi</Label><Input id="edit-age" type="number" value={formData.age || ''} onChange={e => handleInputChange('age', e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="edit-province">Tỉnh thành</Label><Input id="edit-province" value={formData.province || ''} onChange={e => handleInputChange('province', e.target.value)} required /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="edit-phone">SĐT liên lạc</Label><Input id="edit-phone" value={formData.contact_phone || ''} onChange={e => handleInputChange('contact_phone', e.target.value)} /></div>
            <div className="space-y-2"><Label>Trạng thái</Label>
              <Select value={formData.status} onValueChange={(val) => val && handleInputChange('status', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Đang học">Đang học</SelectItem>
                  <SelectItem value="Tạm dừng">Tạm dừng</SelectItem>
                  <SelectItem value="Đã nghỉ">Đã nghỉ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="edit-fb">Link liên lạc</Label><Input id="edit-fb" value={formData.contact_link || ''} onChange={e => handleInputChange('contact_link', e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="edit-fee">Học phí mặc định (VND/Buổi) <span className="text-red-500">*</span></Label><Input id="edit-fee" type="number" value={formData.default_tuition_fee || 0} onChange={e => handleInputChange('default_tuition_fee', e.target.value)} required /></div>
            <div className="space-y-2"><Label htmlFor="edit-notes">Ghi chú</Label><textarea id="edit-notes" className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 min-h-[80px]" value={formData.notes || ''} onChange={e => handleInputChange('notes', e.target.value)} placeholder="Ghi chú về học sinh..." /></div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
              <Button type="submit">Cập nhật</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
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
