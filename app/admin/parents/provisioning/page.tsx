import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Đối soát liên hệ phụ huynh', robots: { index: false, follow: false } };
type Candidate = {student_id:string;name:string;parent_name:string|null;parent_number:string|null;issue:string|null};
const issues:Record<string,string> = {missing_contact:'Thiếu tên hoặc số điện thoại phụ huynh hợp lệ',conflicting_names:'Tên liên hệ không khớp; cần xác minh',missing_parent:'Chưa có hồ sơ phụ huynh',inactive_parent:'Hồ sơ đã khóa; cần admin xem xét',missing_link:'Chưa có liên kết phụ huynh–học sinh',conflicting_links:'Liên kết các con chưa khớp hồ sơ; cần xác minh'};
export default async function ProvisioningPage() {
 const db=await createClient();const {data:{user}}=await db.auth.getUser();
 if(user?.app_metadata?.role!=='admin')redirect('/login');
 const result=await db.rpc('parent_contact_candidates');
 const rows:Candidate[]=Array.isArray(result.data)?result.data:[];
 return <main className="space-y-6"><Link className="underline" href="/admin/parents">← Hồ sơ phụ huynh</Link><h1 className="text-2xl font-bold">Đối soát liên hệ phụ huynh</h1><p className="max-w-3xl text-sm leading-6">Danh sách chỉ gồm học sinh đang học trong lớp hoạt động. Bổ sung liên hệ tại hồ sơ học sinh, sau đó đối chiếu hồ sơ phụ huynh và liên kết các con. Phụ huynh tra cứu bằng số điện thoại của hồ sơ đang hoạt động và đã liên kết với học sinh; không cần cấp tài khoản Auth.</p>
 {result.error?<p role="alert">Chưa đọc được danh sách. Kiểm tra kết nối và migration 27.</p>:<><p>{rows.length} học sinh · {rows.filter(r=>r.issue).length} trường hợp cần xem xét</p><div className="overflow-x-auto rounded border"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Học sinh</th><th className="p-3">Liên hệ phụ huynh</th><th className="p-3">Trạng thái</th></tr></thead><tbody>{rows.map(r=><tr className="border-t" key={r.student_id}><td className="p-3"><Link className="underline" href={'/admin/students/'+r.student_id}>{r.name}</Link></td><td className="p-3">{r.parent_name||'Chưa có tên'}<br/>{r.parent_number||'Chưa có số điện thoại'}</td><td className="p-3">{r.issue?issues[r.issue]||'Cần đối soát':'Sẵn sàng tra cứu'}</td></tr>)}</tbody></table></div></>}
 </main>;
}
