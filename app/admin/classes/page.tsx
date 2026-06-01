'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';
import { Search, Trash2, Archive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tất cả');
  const [classTypeFilter, setClassTypeFilter] = useState('Tất cả');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClasses, setTotalClasses] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const supabase = createClient();

  async function fetchData() {
    setLoading(true);
    let query = supabase.from('classes').select('*, tutors(name)', { count: 'exact' });

    if (statusFilter !== 'Tất cả') {
      query = query.eq('status', statusFilter);
    }
    
    if (classTypeFilter !== 'Tất cả') {
      query = query.eq('class_type', classTypeFilter);
    }
    
    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .order('class_id', { ascending: true })
      .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);
    
    if (!error && data) {
      setClasses(data);
      setTotalClasses(count || 0);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE) || 1);
    }
    setLoading(false);
  }

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, classTypeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, statusFilter, classTypeFilter]);

  async function handleArchiveClass(classId: string) {
    if (!confirm('Bạn có chắc chắn muốn ngừng dạy lớp này? Các lịch học sắp tới sẽ bị hủy và học sinh sẽ được đánh dấu đã nghỉ.')) return;
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', class_id: classId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Đã ngừng dạy lớp thành công!');
      fetchData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  async function handleDeleteClass(classId: string) {
    if (!confirm('CẢNH BÁO: ĐÂY LÀ HÀNH ĐỘNG XÓA HOÀN TOÀN (HARD DELETE) KHÔNG THỂ KHÔI PHỤC.\n\nBạn có chắc chắn muốn xóa lớp này VĨNH VIỄN không?\nNếu bạn chỉ muốn dừng dạy lớp này, VUI LÒNG HỦY THAO TÁC NÀY và dùng nút "Dừng Dạy lớp này" (Icon Lưu trữ).\n\nViệc xóa cứng chỉ nên dùng khi lớp bị tạo sai.')) return;
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hard_delete', class_id: classId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Đã xóa lớp thành công!');
      fetchData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }


  const statusColor = (status: string) => {
    if (status === 'active') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    if (status === 'inactive') return 'bg-rose-100 text-rose-700 hover:bg-rose-100';
    return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
  };

  const translateStatus = (status: string) => {
    if (status === 'active') return 'Hoạt động';
    if (status === 'inactive') return 'Ngừng hoạt động';
    return status;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Quản lý Lớp Học</h2>
        <Link href="/admin/classes/new">
          <Button>+ Thêm Lớp Mới</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 md:p-6 p-0 border-0">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Tìm kiếm theo Tên lớp hoặc Tên Gia sư..." 
                className="pl-9 bg-slate-50 border-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'Tất cả')}>
              <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Ngừng hoạt động</SelectItem>
              </SelectContent>
            </Select>

            <Select value={classTypeFilter} onValueChange={(val) => setClassTypeFilter(val || 'Tất cả')}>
              <SelectTrigger className="w-[180px] bg-slate-50 border-slate-200">
                <SelectValue placeholder="Loại lớp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tất cả">Tất cả loại lớp</SelectItem>
                <SelectItem value="Lớp Cơ bản">Lớp Cơ bản</SelectItem>
                <SelectItem value="Lớp Nâng cao">Lớp Nâng cao</SelectItem>
                <SelectItem value="Lớp Luyện thi">Lớp Luyện thi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-slate-200 bg-white overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[300px]">Tên Lớp</TableHead>
                  <TableHead>Loại Lớp</TableHead>
                  <TableHead>Gia Sư</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                     <TableCell colSpan={4} className="text-center py-8 text-slate-500">Đang tải dữ liệu...</TableCell>
                  </TableRow>
                ) : classes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <p>Không tìm thấy lớp học nào phù hợp.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  classes.map(c => (
                    <TableRow 
                      key={c.class_id} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/classes/${c.class_id}`)}
                    >
                      <TableCell className="font-medium text-slate-900">{c.name}</TableCell>
                      <TableCell className="text-slate-600">
                        <Badge variant="outline">{c.class_type || 'Lớp Cơ bản'}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">{c.tutors?.name || '---'}</TableCell>
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
                           <Button variant="ghost" size="sm" onClick={() => handleArchiveClass(c.class_id)} title="Dừng dạy lớp này" className="text-amber-600 hover:text-amber-800 hover:bg-amber-50">
                             <Archive className="h-4 w-4" />
                           </Button>
                         )}
                         <Button variant="ghost" size="sm" onClick={() => handleDeleteClass(c.class_id)} title="Xóa cứng lớp này" className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
            <span className="text-sm text-slate-500">
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
