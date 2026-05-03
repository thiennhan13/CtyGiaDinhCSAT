'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { Search, Plus, UserX, ExternalLink, PencilLine, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Student = {
  student_id: string;
  name: string;
  age: number | null;
  province: string;
  parent_phone: string;
  facebook_link: string;
  status: string;
  is_deleted: boolean;
  created_at: string;
  default_tuition_fee: number;
  payments?: { amount: number; status: string; billing_period: string }[];
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [viewMode, setViewMode] = useState<'current' | 'old'>('current');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Form Data
  const [formData, setFormData] = useState<Partial<Student>>({ status: 'Đang học', default_tuition_fee: 100000 });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Stats
  const [totalStudents, setTotalStudents] = useState(0);

  const supabase = createClient();

  async function fetchStudents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*, payments(amount, status, billing_period)')
      .order('name', { ascending: true }); // Base order
    
    if (!error && data) {
      setStudents(data);
      setTotalStudents(data.filter(s => !s.is_deleted).length);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Form changes
  const handleInputChange = (field: keyof Student, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ status: 'Đang học', name: '', age: null, province: '', parent_phone: '', facebook_link: '', default_tuition_fee: 100000 });
    setSelectedStudent(null);
  };

  // Actions
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
      fetchStudents();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
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
      fetchStudents();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
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
      fetchStudents();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  // Filter & Sort Logic
  const filteredStudents = useMemo(() => {
    let result = students;

    if (viewMode === 'current') {
      result = result.filter(s => !s.is_deleted);
    } else {
      result = result.filter(s => s.is_deleted);
    }
    
    if (statusFilter !== 'Tất cả') {
      result = result.filter(s => s.status === statusFilter);
    }
    
    if (searchTerm) {
      const lowerQuery = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.name?.toLowerCase().includes(lowerQuery) || 
        s.parent_phone?.includes(lowerQuery) ||
        s.province?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Auto sort Vietnamese names
    return result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [students, searchTerm, statusFilter, viewMode]);

  const openEdit = (student: Student) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name,
      age: student.age,
      province: student.province || '',
      parent_phone: student.parent_phone || '',
      facebook_link: student.facebook_link || '',
      status: student.status,
      default_tuition_fee: student.default_tuition_fee || 100000
    });
    setIsEditModalOpen(true);
  };

  const openDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteModalOpen(true);
  };
  
  const openDetail = (student: Student) => {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  };

  const statusColor = (status: string) => {
    if (status === 'Đang học') return 'bg-green-100 text-green-700 hover:bg-green-100';
    if (status === 'Đã nghỉ') return 'bg-red-100 text-red-700 hover:bg-red-100';
    if (status === 'Tạm dừng') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
  }

  const calculateUnpaidTuition = (student: Student) => {
    if (!student.payments) return 0;
    return student.payments.filter(p => p.status === 'unpaid').reduce((sum, p) => sum + Number(p.amount), 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Học Sinh</h2>
          <p className="text-sm text-slate-500">Tổng số: {totalStudents} học sinh hiện tại đang theo học</p>
        </div>
        <Button onClick={() => { resetForm(); setIsAddModalOpen(true); }} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Thêm học sinh
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-4 md:p-6 p-0 border-0">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex bg-slate-100 p-1 rounded-md shrink-0">
              <button 
                className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${viewMode === 'current' ? 'bg-white shadow pointer-events-none' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setViewMode('current')}
              >
                Học sinh hiện tại
              </button>
              <button 
                className={`px-4 py-2 text-sm font-medium rounded-sm transition-colors ${viewMode === 'old' ? 'bg-white shadow pointer-events-none' : 'text-slate-600 hover:text-slate-900'}`}
                onClick={() => setViewMode('old')}
              >
                Học sinh cũ/xoá
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Tìm theo tên, SĐT phụ huynh, Tỉnh/Thành..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-48 shrink-0">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'Tất cả')}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tất cả">Tất cả trạng thái</SelectItem>
                  <SelectItem value="Đang học">Đang học</SelectItem>
                  <SelectItem value="Tạm dừng">Tạm dừng</SelectItem>
                  <SelectItem value="Đã nghỉ">Đã nghỉ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">Họ tên</TableHead>
                  <TableHead>Liên hệ</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Học phí</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Đang tải dữ liệu...</TableCell></TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Không tìm thấy học sinh nào</TableCell></TableRow>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const unpaidAmount = calculateUnpaidTuition(s);
                    return (
                    <TableRow key={s.student_id} className="group">
                      <TableCell>
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500">{s.age ? `${s.age} tuổi • ` : ''}{s.province}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{s.parent_phone || '-'}</div>
                        {s.facebook_link && (
                          <a href={s.facebook_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs mt-1">
                            <ExternalLink className="h-3 w-3" /> FB Link
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColor(s.status)}>{s.status}</Badge>
                      </TableCell>
                      <TableCell>
                         {unpaidAmount > 0 ? (
                            <div className="text-red-600 font-semibold text-sm">
                              Thiếu: {new Intl.NumberFormat('vi-VN').format(unpaidAmount)}đ
                            </div>
                         ) : (
                            <div className="text-emerald-600 font-medium text-sm">
                              Đã nộp đủ
                            </div>
                         )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => openDetail(s)} title="Chi tiết"><FileText className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Chỉnh sửa"><PencilLine className="h-4 w-4 text-blue-600" /></Button>
                        {viewMode === 'current' && (
                          <Button variant="ghost" size="icon" onClick={() => openDelete(s)} title="Xóa"><UserX className="h-4 w-4 text-red-600" /></Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )})
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Thêm Học Sinh Mới */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Thêm Học Sinh Mới</DialogTitle>
            <DialogDescription>Nhập đầy đủ thông tin học sinh vào mẫu dưới đây.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Họ Tên <span className="text-red-500">*</span></Label>
              <Input id="name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Tuổi <span className="text-red-500">*</span></Label>
                <Input id="age" type="number" value={formData.age || ''} onChange={e => handleInputChange('age', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Tỉnh thành <span className="text-red-500">*</span></Label>
                <Input id="province" value={formData.province || ''} onChange={e => handleInputChange('province', e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">SĐT Phụ huynh <span className="text-red-500">*</span></Label>
              <Input id="phone" value={formData.parent_phone || ''} onChange={e => handleInputChange('parent_phone', e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fb">Link Facebook (Có thể bỏ qua)</Label>
              <Input id="fb" value={formData.facebook_link || ''} onChange={e => handleInputChange('facebook_link', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee">Học phí mặc định (VND/Buổi) <span className="text-red-500">*</span></Label>
              <Input id="fee" type="number" value={formData.default_tuition_fee || 0} onChange={e => handleInputChange('default_tuition_fee', e.target.value)} required />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Hủy</Button>
              <Button type="submit">Lưu thông tin</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sửa Học Sinh */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa Học Sinh</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Họ Tên</Label>
              <Input id="edit-name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-age">Tuổi</Label>
                <Input id="edit-age" type="number" value={formData.age || ''} onChange={e => handleInputChange('age', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-province">Tỉnh thành</Label>
                <Input id="edit-province" value={formData.province || ''} onChange={e => handleInputChange('province', e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">SĐT Phụ huynh</Label>
              <Input id="edit-phone" value={formData.parent_phone || ''} onChange={e => handleInputChange('parent_phone', e.target.value)} required />
            </div>
            <div className="space-y-2">
               <Label>Trạng thái</Label>
               <Select value={formData.status} onValueChange={(val) => val && handleInputChange('status', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Đang học">Đang học</SelectItem>
                    <SelectItem value="Tạm dừng">Tạm dừng</SelectItem>
                    <SelectItem value="Đã nghỉ">Đã nghỉ</SelectItem>
                  </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fb">Link Facebook</Label>
              <Input id="edit-fb" value={formData.facebook_link || ''} onChange={e => handleInputChange('facebook_link', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fee">Học phí mặc định (VND/Buổi) <span className="text-red-500">*</span></Label>
              <Input id="edit-fee" type="number" value={formData.default_tuition_fee || 0} onChange={e => handleInputChange('default_tuition_fee', e.target.value)} required />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
              <Button type="submit">Cập nhật</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Xóa cứng / Xóa mềm Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận Xóa</DialogTitle>
            <DialogDescription>
              Hành động này sẽ xóa học sinh <strong className="text-slate-900">{selectedStudent?.name}</strong> khỏi danh sách hiện tại và chuyển vào danh sách học sinh cũ.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
             <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Hủy</Button>
             <Button variant="destructive" onClick={handleDeleteConfirm}>Xác nhận Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chi tiết học sinh */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
         <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Hồ sơ Học Sinh</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm bg-slate-50 p-4 rounded-lg">
                 <div><span className="text-slate-500 block mb-1">Họ tên:</span><span className="font-semibold">{selectedStudent.name}</span></div>
                 <div><span className="text-slate-500 block mb-1">Trạng thái:</span><Badge variant="secondary" className={statusColor(selectedStudent.status)}>{selectedStudent.status}</Badge></div>
                 <div><span className="text-slate-500 block mb-1">Tuổi:</span><span className="font-medium">{selectedStudent.age || '-'}</span></div>
                 <div><span className="text-slate-500 block mb-1">Tỉnh thành:</span><span className="font-medium">{selectedStudent.province || '-'}</span></div>
                 <div><span className="text-slate-500 block mb-1">SĐT Phụ huynh:</span><span className="font-medium">{selectedStudent.parent_phone || '-'}</span></div>
                 <div><span className="text-slate-500 block mb-1">Học phí mặc định:</span><span className="font-medium">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedStudent.default_tuition_fee || 100000)}/Buổi</span></div>
                 <div>
                   <span className="text-slate-500 block mb-1">Facebook:</span>
                   {selectedStudent.facebook_link ? <a href={selectedStudent.facebook_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Liên kết ngoài &nearr;</a> : '-'}
                 </div>
              </div>

              <div className="mt-4">
                 <div className={`p-3 rounded-lg border-l-4 font-medium mb-4 ${calculateUnpaidTuition(selectedStudent) > 0 ? 'bg-red-50 border-red-500 text-red-800' : 'bg-emerald-50 border-emerald-500 text-emerald-800'}`}>
                    Tình trạng học phí: {calculateUnpaidTuition(selectedStudent) > 0 
                      ? `Còn nợ ${new Intl.NumberFormat('vi-VN').format(calculateUnpaidTuition(selectedStudent))}đ`
                      : 'Đã hoàn thành các khoản thu'
                    }
                 </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 text-sm">Các lớp đang tham gia:</h4>
                <div className="text-sm text-slate-500 italic p-4 border rounded border-dashed text-center">
                  Cập nhật danh sách từ module `class_students`.
                </div>
              </div>
            </div>
          )}
         </DialogContent>
      </Dialog>
    </div>
  );
}

