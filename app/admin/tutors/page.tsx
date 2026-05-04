'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@/lib/supabase/client';

export default function TutorsPage() {
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();

  async function fetchTutors() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tutors')
      .select('*')
      .neq('is_deleted', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching tutors:", error);
    }
    
    if (!error && data) {
      setTutors(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTutors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddTutor(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !phone) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, email, phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
      
      setName('');
      setEmail('');
      setPhone('');
      fetchTutors();
      alert('Đã tạo tài khoản Gia sư. Mật khẩu đăng nhập là số điện thoại.');
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
    setIsSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Hành động này sẽ xóa hoặc vô hiệu hóa gia sư này. Bạn có chắc chắn không?')) return;
    try {
      const res = await fetch('/api/admin/tutors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', tutor_id: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');
      fetchTutors();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  }

 

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Quản lý Gia Sư</h2>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Thêm Gia Sư Mới (Cấp tài khoản)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTutor} className="flex flex-col sm:flex-row gap-4">
            <Input 
              placeholder="Họ & Tên..." 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="max-w-xs"
              required 
            />
            <Input 
              placeholder="Email..." 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="max-w-xs"
              required 
            />
            <Input 
              placeholder="Số điện thoại (dùng làm mật khẩu)..." 
              type="tel"
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className="max-w-xs"
              required 
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Đang tạo...' : 'Tạo Tài Khoản'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Gia Sư</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p>Đang tải...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên Gia Sư</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Trạng Thái</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tutors.map(t => (
                  <TableRow key={t.tutor_id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.email}</TableCell>
                    <TableCell>
                      {t.status === 'inactive' ? <span className="text-red-500 font-medium">Đã vô hiệu hóa</span> : <span className="text-emerald-500 font-medium">Đang hoạt động</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(t.tutor_id)}>
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tutors.length === 0 && (
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
