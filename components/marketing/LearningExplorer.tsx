'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { goals, levels, validGoal, validLevel, recommendedProgram, programs } from '@/lib/learning-guidance';
import { ConsultationForm } from './ConsultationForm';
export function LearningExplorer({mode}:{mode:"selector"|"form"}) {
 const search=useSearchParams(),level=validLevel(search.get('level')),goal=validGoal(search.get('goal'));
 const recommended=recommendedProgram(level,goal),shown=search.get('show')==='1';
 function change(key:string,value:string){
  const query=new URLSearchParams();
  const nextLevel=key==='level'?validLevel(value):level, nextGoal=key==='goal'?validGoal(value):goal;
  if(nextLevel)query.set('level',nextLevel);query.set('goal',nextGoal);
  if(key==='show')query.set('show','1');
  window.history.replaceState(null,'',`/lo-trinh?${query}${window.location.hash}`);
 }
 const destination=recommended==='consultation'?'#tu-van':`/lo-trinh/${recommended}?${new URLSearchParams({...(level?{level}:{}),goal})}`;
 if(mode==="form")return <ConsultationForm level={level} goal={goal} onSelection={change}/>;
 return <><section className="public-wrap"><div className="public-selector"><h2>Cá nhân hóa lộ trình học</h2><p>Chọn cấp học và mục tiêu để khám phá hướng học. Đây là gợi ý ban đầu; gia sư sẽ trao đổi thêm về nền tảng của bạn.</p><form className="public-selector-grid" onSubmit={e=>{e.preventDefault();change('show','1');}}><label className="public-field">1. Cấp học<select required value={level} onChange={e=>change('level',e.target.value)}><option value="" disabled>Chọn cấp học</option>{Object.entries(levels).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><label className="public-field">2. Mục tiêu<select value={goal} onChange={e=>change('goal',e.target.value)}>{Object.entries(goals).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label><button className="public-button" type="submit">Xem hướng học <ArrowRight size={18}/></button></form>
 {shown&&<div className="public-recommendation" role="status"><p className="public-kicker">Hướng học gợi ý</p><h3>{recommended==='consultation'?'Trao đổi để chọn hướng đi':recommended==='hsgqg'?'Định hướng HSG Quốc gia':`Chương trình ${programs[recommended].name}`}</h3><p>{level==='university'?'Với sinh viên, CSAT sẽ tư vấn riêng dựa trên kiến thức đã học và mục tiêu cụ thể.':recommended==='co-ban'?'Củng cố C++ và các mảng kiến thức nền tảng cho định hướng HSG THCS, Chuyên Tin. Phạm vi luyện thi sẽ được trao đổi thêm theo kỳ thi của bạn.':recommended==='nang-cao'?'Phát triển cách phối hợp cấu trúc dữ liệu và thuật toán, hướng tới HSG tỉnh cấp THPT. Bạn cần sử dụng được C++ cơ bản, mảng, xâu và hàm.':recommended==='hsgqg'?'Cùng CSAT trao đổi về quá trình luyện tập và mục tiêu HSG Quốc gia. Chương trình chi tiết sẽ được bổ sung sau.':'Bạn có thể xem hai chương trình bên dưới và chia sẻ thêm để CSAT tư vấn điểm bắt đầu.'}</p><Link className="public-text-link" href={destination}>{recommended==='consultation'?'Điền thông tin tư vấn':'Xem hướng học chi tiết'}<ArrowRight size={18}/></Link></div>}
 </div></section></>;
}
export function CourseConsultLink({program}:{program:string}) {
 const params=useSearchParams(),level=validLevel(params.get('level'));
 const goal=validGoal(params.get('goal')||(program==='hsgqg'?'national':program==='nang-cao'?'province':'specialist'));
 return <Link href={`/lo-trinh?${new URLSearchParams({...(level?{level}:{}),goal})}#tu-van`} className="public-button">Tư vấn lộ trình này <ArrowRight size={18}/></Link>;
}
