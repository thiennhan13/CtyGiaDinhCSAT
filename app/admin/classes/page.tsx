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
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [tutorId, setTutorId] = useState('');
  
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: cls }, { data: tuts }] = await Promise.all([
      supabase.from('classes').select('*, tutors(name)').order('created_at', { ascending: false }),
      supabase.from('tutors').select('*')
    ]);
    
    if (cls) setClasses(cls);
    if (tuts) setTutors(tuts);
    setLoading(false);
  }

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !tutorId) return;
    
    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, tutor_id: tutorId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setName('');
      setTutorId('');
      fetchData();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900">Quản lý Lớp Học</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Tạo Lớp Mới</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddClass} className="flex flex-col sm:flex-row gap-4">
            <Input 
              placeholder="Tên lớp..." 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="max-w-xs"
              required 
            />
            <Select value={tutorId} onValueChange={(val) => setTutorId(val || '')} required>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn Gia Sư" />
              </SelectTrigger>
              <SelectContent>
                {tutors.map(t => (
                  <SelectItem key={t.tutor_id} value={t.tutor_id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Thêm Lớp</Button>
          </form>
        </CardContent>
      </Card>

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
