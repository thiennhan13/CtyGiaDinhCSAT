'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';

export default function SessionAttendancePage() {
  const params = useParams() as { class_id: string, session_id: string };
  const classId = params.class_id;
  const sessionId = params.session_id;

  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, { status: 'attended' | 'absent', notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [classId, sessionId]);

  async function fetchData() {
    setLoading(true);
    // 1. Fetch Session Info
    const { data: sess } = await supabase.from('sessions').select('*, classes(name)').eq('session_id', sessionId).single();
    if (sess) setSessionData(sess);

    // 2. Fetch students currently in this class
    const { data: classStds } = await supabase.from('class_students').select('student_id, students(student_id, name)').eq('class_id', classId).eq('status', 'active');
    
    // 3. Fetch existing attendance for this session
    const { data: existingAtt } = await supabase.from('session_attendance').select('*').eq('session_id', sessionId);
    
    if (classStds) {
      const stdList = classStds.map(cs => cs.students);
      setStudents(stdList || []);
      
      const attMap: any = {};
      if (existingAtt && existingAtt.length > 0) {
        existingAtt.forEach(a => {
          attMap[a.student_id] = { status: a.status, notes: a.notes || '' };
        });
      } else {
        stdList.forEach((s: any) => {
          attMap[s.student_id] = { status: 'attended', notes: '' }; // default attended
        });
      }
      setAttendance(attMap);
    }
    setLoading(false);
  }

  function handleStatusToggle(studentId: string, status: 'attended' | 'absent') {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status }
    }));
  }

  function handleNotesChange(studentId: string, notes: string) {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes }
    }));
  }

  async function handleSave() {
    setSubmitting(true);
    
    // Build array for upsert
    const attData = students.map(s => ({
      session_id: sessionId,
      student_id: s.student_id,
      status: attendance[s.student_id].status,
      notes: attendance[s.student_id].notes
    }));

    try {
       // Send to a custom route handler for safety, or upsert directly if RLS configured
       const res = await fetch('/api/attendance', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ sessionId, attendanceData: attData })
       });

       if (res.ok) {
         // Update session status to completed
         await supabase.from('sessions').update({ status: 'completed' }).eq('session_id', sessionId);
         alert('Thành công! Điểm danh đã lưu.');
         router.push('/tutor/dashboard');
       } else {
         const d = await res.json();
         throw new Error(d.error);
       }
    } catch(err: any) {
      alert('Lỗi: ' + err.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold tracking-tight text-gray-900">Điểm Danh: {sessionData?.classes?.name}</h2>
           <p className="text-gray-500">{sessionData?.date}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Quay lại</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Học Sinh</CardTitle>
          <CardDescription>Chọn "Có mặt" hoặc "Vắng mặt" (Học phí chỉ tính khi Có mặt)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <p>Đang tải...</p> : (
            <div className="space-y-4">
               {students.map(s => {
                 const currentStatus = attendance[s.student_id]?.status;
                 return (
                   <div key={s.student_id} className="p-4 border rounded-lg bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="font-medium text-lg min-w-[200px]">{s.name}</div>
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          variant={currentStatus === 'attended' ? 'default' : 'outline'}
                          className={currentStatus === 'attended' ? 'bg-green-600 hover:bg-green-700' : ''}
                          onClick={() => handleStatusToggle(s.student_id, 'attended')}
                        >Có mặt</Button>
                        <Button 
                          type="button"
                          variant={currentStatus === 'absent' ? 'default' : 'outline'}
                          className={currentStatus === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                          onClick={() => handleStatusToggle(s.student_id, 'absent')}
                        >Vắng mặt</Button>
                      </div>
                      <Input 
                        placeholder="Ghi chú (Tùy chọn)" 
                        className="max-w-xs"
                        value={attendance[s.student_id]?.notes || ''}
                        onChange={(e) => handleNotesChange(s.student_id, e.target.value)} 
                      />
                   </div>
                 );
               })}

               <div className="pt-6 border-t mt-4">
                 <Button onClick={handleSave} disabled={submitting || students.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg">
                   {submitting ? 'Đang lưu...' : 'Chốt Điểm Danh (Lưu vĩnh viễn)'}
                 </Button>
               </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
