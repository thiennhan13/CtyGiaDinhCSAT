'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  async function fetchData() {
    setLoading(true);
    const { data: cls } = await supabase.from('classes').select('*, tutors(name)').order('created_at', { ascending: false });
    
    if (cls) setClasses(cls);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Quản lý Lớp Học</h2>
        <Link href="/admin/classes/new">
          <Button>+ Thêm Lớp Mới</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Lớp</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p>Đang tải...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên Lớp</TableHead>
                  <TableHead>Gia Sư</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map(c => (
                  <TableRow key={c.class_id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.tutors?.name || '---'}</TableCell>
                    <TableCell>{c.status}</TableCell>
                    <TableCell className="text-right">
                       <Link href={`/admin/classes/${c.class_id}`}>
                         <Button variant="outline" size="sm">Chi tiết</Button>
                       </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {classes.length === 0 && (
                  <TableRow>
                     <TableCell colSpan={4} className="text-center py-4">Chưa có dữ liệu</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
