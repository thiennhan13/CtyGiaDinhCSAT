'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  
  const supabase = createClient();

  // Basic fetch
  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setStudents(data);
    }
    setLoading(false);
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setName('');
      fetchStudents();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Xác nhận xóa học sinh?')) return;
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', student_id: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchStudents();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900">Quản lý Học Sinh</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Thêm Học Sinh Mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStudent} className="flex gap-4">
            <Input 
              placeholder="Tên học sinh..." 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="max-w-sm"
              required 
            />
            <Button type="submit">Thêm</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Học Sinh</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p>Đang tải...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã Học Sinh</TableHead>
                  <TableHead>Tên Học Sinh</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map(s => (
                  <TableRow key={s.student_id}>
                    <TableCell className="font-mono text-xs">{s.student_id.split('-')[0]}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.status}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(s.student_id)}>
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {students.length === 0 && (
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
