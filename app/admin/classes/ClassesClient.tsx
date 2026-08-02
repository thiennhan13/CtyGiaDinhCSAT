'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { Search, Trash2, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { useAlert, useConfirm } from '@/components/ui/use-dialog';
import { updateClassStatus } from '@/features/classes/actions';

const STATUS_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Hoạt động' },
  { value: 'inactive', label: 'Ngừng hoạt động' },
];

const CLASS_TYPE_OPTIONS = [
  { value: 'Tất cả', label: 'Tất cả loại lớp' },
  { value: 'Lớp Cơ bản', label: 'Lớp Cơ bản' },
  { value: 'Lớp Nâng cao', label: 'Lớp Nâng cao' },
  { value: 'Lớp Luyện thi', label: 'Lớp Luyện thi' },
];

interface ClassesClientProps {
  initialClasses: any[];
  totalClasses: number;
  totalPages: number;
  currentPage: number;
  searchTerm: string;
  statusFilter: string;
  classTypeFilter: string;
}

export function ClassesClient({
  initialClasses,
  totalClasses,
  totalPages,
  currentPage: initialPage,
  searchTerm: initialSearch,
  statusFilter: initialStatus,
  classTypeFilter: initialType,
}: ClassesClientProps) {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>(initialClasses);
  
  // Search & Filter
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [classTypeFilter, setClassTypeFilter] = useState(initialType);
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const { alert: showAlert, AlertDialog } = useAlert();
  const { confirm, ConfirmDialog } = useConfirm();

  // Đồng bộ props với state khi data thay đổi (server re-render)
  useEffect(() => {
    setClasses(initialClasses);
    setCurrentPage(initialPage);
  }, [initialClasses, initialPage]);

  // Cập nhật URL parameters khi user thao tác
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (localSearch) params.set('search', localSearch);
    if (statusFilter !== 'Tất cả') params.set('status', statusFilter);
    if (classTypeFilter !== 'Tất cả') params.set('classType', classTypeFilter);
    
    router.replace(`/admin/classes?${params.toString()}`, { scroll: false });
  }, [currentPage, localSearch, statusFilter, classTypeFilter, router]);

  async function handleArchiveClass(classId: string) {
    const ok = await confirm({
      title: 'Dừng dạy lớp này?',
      description: 'Các lịch học sắp tới sẽ bị hủy và học sinh sẽ được đánh dấu đã nghỉ. Hành động này không thể hoàn tác.',
      confirmText: 'Dừng dạy',
      cancelText: 'Hủy bỏ',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const result = await updateClassStatus(classId, 'archived');
      if (!result.success) throw new Error(result.error);
      await showAlert({ title: 'Thành công', description: 'Đã dừng dạy lớp.', variant: 'success' });
      router.refresh();
    } catch (err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    }
  }

  async function handleDeleteClass(classId: string) {
    const ok = await confirm({
      title: 'Xóa vĩnh viễn lớp học?',
      description: (
        <span>
          <strong className="text-red-600">Đây là xóa cứng — không thể khôi phục.</strong>
          <br />
          Nếu chỉ muốn dừng dạy, hãy dùng nút <em>"Lưu trữ"</em> thay thế.
          <br />
          Chỉ xóa khi lớp bị tạo sai.
        </span>
      ),
      confirmText: 'Xóa vĩnh viễn',
      cancelText: 'Hủy bỏ',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hard_delete', class_id: classId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await showAlert({ title: 'Đã xóa', description: 'Lớp học đã được xóa vĩnh viễn.', variant: 'success' });
      router.refresh();
    } catch (err: any) {
      await showAlert({ title: 'Lỗi', description: err.message, variant: 'error' });
    }
  }


  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
    if (status === 'inactive') return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20';
    return 'bg-secondary text-foreground';
  };

  const translateStatus = (status: string) => {
    if (status === 'active') return 'Hoạt động';
    if (status === 'inactive') return 'Ngừng hoạt động';
    return status;
  };

  return (
    <div className="space-y-6">
      <AlertDialog />
      <ConfirmDialog />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Quản lý Lớp Học</h2>
        <Link href="/admin/classes/new">
          <Button>+ Thêm Lớp Mới</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6 p-0 border-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input 
                placeholder="Tìm theo tên..." 
                className="pl-8" 
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>
            
            <div className="w-full sm:w-[180px]">
              <Combobox
                options={STATUS_OPTIONS}
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val || 'Tất cả')}
                placeholder="Trạng thái"
                searchPlaceholder="Tìm trạng thái..."
              />
            </div>

            <div className="w-full sm:w-[200px]">
              <Combobox
                options={CLASS_TYPE_OPTIONS}
                value={classTypeFilter}
                onValueChange={(val) => setClassTypeFilter(val || 'Tất cả')}
                placeholder="Loại lớp"
                searchPlaceholder="Tìm loại lớp..."
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card overflow-x-auto pb-2">
            <Table>
              <TableHeader className="bg-secondary/50">
                <TableRow>
                  <TableHead className="w-[300px]">Tên Lớp</TableHead>
                  <TableHead>Loại Lớp</TableHead>
                  <TableHead>Gia Sư</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <p>Không tìm thấy lớp học nào phù hợp.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  classes.map(c => (
                    <TableRow 
                      key={c.class_id} 
                      className="hover:bg-secondary/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/classes/${c.class_id}`)}
                    >
                      <TableCell className="font-medium text-foreground">{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <Badge variant="outline">{c.class_type || 'Lớp Cơ bản'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{c.tutors?.name || '---'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColor(c.status)}>
                          {translateStatus(c.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                         <Link href={`/admin/classes/${c.class_id}`}>
                           <Button variant="outline" size="sm">Chi tiết</Button>
                         </Link>
                         {c.status !== 'inactive' && (
                           <Button variant="ghost" size="sm" onClick={() => handleArchiveClass(c.class_id)} title="Dừng dạy lớp này" className="text-amber-600 hover:text-amber-800 hover:bg-amber-500/10 dark:text-amber-400">
                             <Archive className="h-4 w-4" />
                           </Button>
                         )}
                         <Button variant="ghost" size="sm" onClick={() => handleDeleteClass(c.class_id)} title="Xóa cứng lớp này" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                           <Trash2 className="h-4 w-4" />
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center mt-4 p-4 border-t gap-4">
            <span className="text-sm text-muted-foreground">
              Hiển thị {classes.length} trên tổng {totalClasses} kết quả (Trang {currentPage} / {totalPages})
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Trước
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages || totalPages === 0} 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Sau
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
