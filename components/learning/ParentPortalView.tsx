import { ParentTutors } from '@/components/tutors/ParentTutors';
import Link from 'next/link';
import { ReviewContent } from '@/components/reviews/ReviewContent';
import { Roadmap } from '@/components/learning/Roadmap';
import type { ParentLearningData } from '@/lib/parent-learning';
import { getReviewTag } from '@/lib/student-reviews';
import { ParentAttendance } from './ParentAttendance';
import { ParentShell } from './ParentShell';
import { ParentDevelopment } from './ParentDevelopment';
import { ParentContact } from '@/app/parents/portal-actions';
import { effectiveStages } from '@/lib/curriculum';
import { resolveParentCurriculumProgress } from '@/lib/parent-curriculum-progress';
import { articlesForTopic, isParentTopicFramework, parentTopicHref } from '@/lib/parent-topics';

const money = (value:number|null) => value === null ? 'Chưa đủ dữ liệu' : new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(value);
const card='parent-card';
export function ParentPortalView({portal}:{portal:ParentLearningData}){
 if(!portal.student)return null;
 const {student,students}=portal;
 const query=(page:number)=>'/parents?'+new URLSearchParams({student:student.student_id,month:portal.month,page:String(page)}).toString()+'#reviews';
 const totals=portal.invoices.reduce((s,p)=>({amount:s.amount+Number(p.amount),received:s.received+Number(p.amount)-Number(p.balance),owed:s.owed+Math.max(0,Number(p.balance)),credit:s.credit+Math.max(0,-Number(p.balance))}),{amount:0,received:0,owed:0,credit:0});
 return <ParentShell>
   <header id="overview" className="parent-welcome"><div><p className="parent-eyebrow">CSAT / GIA ĐÌNH & HỌC TẬP</p><h1>Hành trình học tập<br/><span>của con.</span></h1><p>Hiểu điều con đang học, ghi nhận từng bước tiến.</p></div><nav aria-label="Chọn học sinh" className="parent-student-picker">{students.map(s=><Link key={s.student_id} href={'/parents?'+new URLSearchParams({student:s.student_id,month:portal.month})} aria-current={s.student_id===student.student_id?'page':undefined}>{s.name}</Link>)}</nav></header>
   <section className="parent-profile" aria-label="Thông tin học sinh"><div className="parent-profile-main"><div className="parent-avatar" aria-hidden="true">{student.name.trim().split(/\s+/).slice(-1)[0]?.slice(0,1)}</div><div className="min-w-0"><p className="parent-eyebrow">HỌC SINH</p><h2>{student.name}</h2><div className="parent-chips">{portal.enrolledClasses.map(c=><span key={c.class_id}>{c.classes?.name}</span>)}<span title="Chờ kết nối tài khoản CSATOJ">Bài đã giải: — / —</span><span title="Chờ kết nối contest của lớp">Xếp hạng contest lớp: —</span></div><p className="parent-metric-note">CSATOJ · Chưa có dữ liệu kết nối</p></div></div><div className="parent-profile-goal"><p className="parent-eyebrow">ĐỒNG HÀNH CÙNG GIA ĐÌNH</p><p>Theo dõi việc học từ nội dung thực tế và nhận xét của gia sư.</p><a href="#reviews">Xem ghi nhận mới nhất ↓</a></div></section>
   <section id="reviews" className={card}><h2 className="text-2xl font-extrabold">Nhận xét từ gia sư</h2><p className="my-4 text-sm leading-7 text-muted-foreground">Nhận xét dựa trên quan sát và bài làm. Điểm danh hoặc số buổi học không tự thể hiện mức độ thành thạo.</p>
    <div className="space-y-4">{portal.reviews.map(r=><article key={r.review_id} className="rounded-xl border p-5"><div className="mb-4 flex flex-wrap justify-between gap-3"><strong>{r.classes?.name} · {r.month_year}</strong><span className="text-xs text-muted-foreground">Gia sư: {r.tutors?.name || 'Chưa cập nhật'}</span></div><ReviewContent review={r}/></article>)}</div>
    {!portal.reviews.length && <p className="rounded-lg border border-dashed p-5 text-sm">Chưa có nhận xét tháng được công bố. Nhận xét sẽ xuất hiện sau khi gia sư gửi nhận xét tháng.</p>}
    <div className="mt-5 flex flex-wrap gap-3 print:hidden">{portal.reviewPage>0 && <Link className="csat-btn text-xs" href={query(portal.reviewPage-1)}>Mới hơn</Link>}{(portal.reviewPage+1)*12<portal.reviewCount && <Link className="csat-btn text-xs" href={query(portal.reviewPage+1)}>Nhận xét trước đó</Link>}</div>
   </section>
   <section id="roadmap" className={card}><h2 className="mb-5 text-2xl font-extrabold">Lộ trình và trọng tâm học tập</h2>
    {portal.plans.filter(p=>p.kind==='class').map(p=>{
      const progress=resolveParentCurriculumProgress(p.template,p.body,portal.class_progress?.find(item=>item.class_id===p.class_id));
      const articleLinks:Record<string,string>={};
      if(p.published_at&&isParentTopicFramework(p.template,p.body))for(const stage of effectiveStages(p.template,p.body))for(const lesson of stage.lessons){
        const first=lesson.code?articlesForTopic(lesson.code)[0]:undefined;
        if(first&&lesson.code)articleLinks[lesson.code]=parentTopicHref(first.slug,{student:student.student_id,classId:p.class_id,month:portal.month,page:portal.reviewPage});
      }
      return <article key={p.class_id} className="mb-7 space-y-4 last:mb-0"><h3 className="text-xl font-bold text-primary">{p.class_name}</h3><Roadmap body={p.body} template={p.template} progress={progress} articleLinks={articleLinks}/></article>;
    })}
    {!portal.plans.some(p=>p.kind==='class') && <p className="text-sm leading-7 text-muted-foreground">Gia sư chưa công bố lộ trình lớp. Thông tin sẽ được bổ sung sau khi xác nhận chương trình và mục tiêu học.</p>}
    {portal.plans.filter(p=>p.kind==='student').map(p=><article key={p.class_id} className="mt-6 space-y-3 rounded-xl bg-accent p-5"><h3 className="font-bold">Trọng tâm riêng · {p.class_name}</h3><p className="whitespace-pre-wrap text-sm leading-7">{p.body.goal}</p><div className="flex flex-wrap gap-2">{p.body.focus_tags.map(id=><span className="rounded-lg border bg-card p-2 text-xs" key={id}>{getReviewTag(id)?.label || id}</span>)}</div>{p.body.next_step && <p className="whitespace-pre-wrap text-sm leading-7"><strong>Bước tiếp theo: </strong>{p.body.next_step}</p>}</article>)}
   </section>
   <ParentDevelopment plans={portal.plans}/>
   <section id="attendance" className={card}><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><h2 className="text-2xl font-extrabold">Buổi học · {portal.month}</h2><form className="flex flex-wrap items-end gap-2 print:hidden" action="/parents"><input type="hidden" name="student" value={student.student_id}/><label className="text-xs">Tháng xem<input type="month" name="month" defaultValue={portal.month} required className="mt-2 block min-h-11 rounded-lg border bg-background px-3"/></label><button className="csat-btn text-sm" type="submit">Xem buổi học</button></form></div>
    <ParentAttendance sessions={portal.attendance}/>
   </section>
   <section id="oj" className={card}><div className="parent-section-heading"><div><p className="parent-eyebrow">LUYỆN TẬP & THỬ SỨC</p><h2>Kết quả trên CSATOJ</h2></div><span className="parent-status">Chưa kết nối dữ liệu</span></div><p className="text-sm leading-7 text-muted-foreground">Số bài đã giải, tổng số bài và thứ hạng contest của lớp sẽ được hiển thị sau khi kết nối và đối chiếu tài khoản học sinh.</p><div className="parent-oj-placeholder"><div><strong>— / —</strong><span>Bài đã giải / Tổng bài</span></div><div><strong>—</strong><span>Xếp hạng contest lớp</span></div></div></section>
   <div id="services" className="parent-services">
   <section id="contact" className={card}><h2 className="mb-5 text-2xl font-extrabold">Gia sư và kết nối với CSAT</h2><ParentTutors tutors={portal.tutors}/><div className="print:hidden"><ParentContact name={student.name} label={portal.contact?.label||''} url={portal.contact?.url||''}/></div></section>
   <section id="tuition" className={card}><h2 className="text-2xl font-extrabold">Học phí</h2><p className="my-4 text-sm leading-7 text-muted-foreground">Admin đối chiếu và chốt sổ thủ công. Khoản tạm tính tiếp tục được giữ nguyên trạng thái khi sang tháng mới, cho đến khi trung tâm chốt sổ.</p>
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Đã chốt',totals.amount],['Đã ghi nhận thanh toán (ròng)',totals.received],['Còn phải đóng',totals.owed],['Dư / cần hoàn',totals.credit]].map(([label,value])=><div key={label} className="rounded-xl border bg-accent/40 p-4"><p className="text-xs">{label}</p><strong className="mt-2 block text-lg">{money(portal.invoices.length?Number(value):null)}</strong></div>)}</div>
    <h3 className="mb-3 font-bold">Các kỳ đã chốt</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-3">Kỳ / lớp</th><th className="p-3">Học phí đã chốt</th><th className="p-3">Đã thanh toán (ròng)</th><th className="p-3">Số dư</th></tr></thead><tbody>{portal.invoices.map(p=><tr className="border-b" key={p.payment_id}><td className="p-3">{p.period}<span className="block text-xs text-muted-foreground">{p.class_name || 'Chưa có liên kết lớp'}</span></td><td className="p-3">{money(p.amount)}</td><td className="p-3">{money(Number(p.amount)-Number(p.balance))}</td><td className="p-3">{Number(p.balance)<0?'Dư / cần hoàn: ':Number(p.balance)>0?'Còn đóng: ':'Đã đủ: '}{money(Math.abs(Number(p.balance)))}</td></tr>)}</tbody></table></div>
    {!portal.invoices.length && <p className="my-4 text-sm text-muted-foreground">Chưa có kỳ học phí đã chốt.</p>}
    <h3 className="mb-3 mt-6 font-bold">Tạm tính · Chưa chốt</h3><div className="space-y-3">{portal.provisional.map((p,i)=><div key={i} className="flex flex-wrap justify-between gap-3 rounded-xl border border-dashed p-4"><div><strong className="text-sm">{p.class_name} · {p.month}</strong><p className="mt-2 text-xs text-muted-foreground">{p.unknown>0?p.unknown+' buổi còn thiếu điểm danh hoặc học phí; số tiền dưới đây chưa đầy đủ.':'Theo buổi học và mức phí đã ghi nhận; chờ đối chiếu.'}</p></div><span className="font-bold">{money(p.amount)}</span></div>)}</div>{!portal.provisional.length && <p className="text-sm text-muted-foreground">Chưa có khoản tạm tính từ các buổi đã diễn ra.</p>}
   </section>
   </div>
   <footer className="parent-footer">CSAT · Gia đình và gia sư cùng đồng hành trong việc học của con.</footer>
 </ParentShell>;
}
