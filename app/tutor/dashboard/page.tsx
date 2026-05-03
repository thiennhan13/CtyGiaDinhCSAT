'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function TutorDashboard() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    fetchMySessions();
  }, []);

  async function fetchMySessions() {
    setLoading(true);
    // Get user id -> tutor id
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: tutor } = await supabase.from('tutors').select('tutor_id').eq('auth_uid', user.id).single();
      if (tutor) {
        // Fetch sessions for this tutor's classes
        // Note: RLS should handle this, but explicitly querying:
        const { data: myClasses } = await supabase.from('classes').select('class_id').eq('tutor_id', tutor.tutor_id);
        if (myClasses && myClasses.length > 0) {
          const classIds = myClasses.map(c => c.class_id);
          const { data: mySessions } = await supabase
            .from('sessions')
            .select('*, classes(name, class_id)')
            .in('class_id', classIds)
            .order('date', { ascending: false });
          if (mySessions) setSessions(mySessions);
        }
      }
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight text-gray-900">Lịch Dạy Của Tôi</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? <p>Đang tải...</p> : sessions.map(session => (
          <Card key={session.session_id} className="hover:border-blue-500 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{session.classes?.name || 'Lớp Không Tên'}</CardTitle>
              <CardDescription>
                {format(new Date(session.date), 'EEEE, dd/MM/yyyy', { locale: vi })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {session.start_time.substring(0,5)} - {session.end_time.substring(0,5)}
                </span>
                <span className={`text-sm font-bold ${session.status === 'completed' ? 'text-green-600' : 'text-blue-600'}`}>
                  {session.status === 'completed' ? 'Đã điểm danh' : 'Chưa điểm danh'}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                 <Link href={`/tutor/classes/${session.class_id}/session/${session.session_id}`} className="w-full">
                   <Button className="w-full" variant={session.status === 'completed' ? "outline" : "default"}>
                     {session.status === 'completed' ? 'Xem lại điểm danh' : 'Điểm danh ngay'}
                   </Button>
                 </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && sessions.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="py-8 text-center text-gray-500">
               Hiện không có ca dạy nào.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
