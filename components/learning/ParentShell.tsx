'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { LayoutDashboard, MessageSquareText, Route, Signpost, CalendarDays, Trophy, UsersRound, Activity, Menu, X } from 'lucide-react';
import { PublicHeader } from '@/components/marketing/PublicHeader';
import { ParentLogoutButton } from '@/app/parents/logout-button';
import { PrintPortal } from '@/app/parents/portal-actions';
import './parent-portal.css';
const groups=[
 {label:'Theo dõi việc học',tone:'lime',items:[{id:'overview',label:'Tổng quan',icon:LayoutDashboard},{id:'practice',label:'Nhịp luyện tập',icon:Activity},{id:'reviews',label:'Nhận xét gia sư',icon:MessageSquareText}]},
 {label:'Chương trình & kết quả',tone:'blue',items:[{id:'roadmap',label:'Lộ trình học tập',icon:Route},{id:'attendance',label:'Buổi học',icon:CalendarDays},{id:'oj',label:'Kết quả CSATOJ',icon:Trophy}]},
 {label:'Đồng hành cùng con',tone:'mint',items:[{id:'services',label:'Gia sư & học phí',icon:UsersRound},{id:'development',label:'Định hướng của lớp',icon:Signpost}]},
];
const navigation=groups.flatMap(group=>group.items);
export function ParentShell({children,navigationEnabled=true,article=false}:{children:ReactNode;navigationEnabled?:boolean;article?:boolean}){
 const [open,setOpen]=useState(false),[active,setActive]=useState('overview');
 useEffect(()=>{
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible[0])setActive(visible[0].target.id);},{rootMargin:'-100px 0px -55% 0px',threshold:0});
  navigation.forEach(n=>{const el=document.getElementById(n.id);if(el)observer.observe(el);});return()=>observer.disconnect();
 },[]);
 return <div className="parent-portal"><a className="parent-skip" href="#parent-main">Đến nội dung chính</a><PublicHeader/><header className="parent-session-toolbar print:hidden"><div className="parent-topbar-label"><span className="parent-dot"/>CỔNG PHỤ HUYNH</div><div className="parent-topbar-actions"><PrintPortal/><ParentLogoutButton/></div></header>
 <div className={'parent-shell '+(!navigationEnabled?'parent-shell-simple':'')+(article?' parent-shell-article':'')}>
 {navigationEnabled&&<aside className="parent-sidebar print:hidden"><button type="button" className="parent-menu-toggle" aria-expanded={open} aria-controls="parent-navigation" onClick={()=>setOpen(!open)}>{open?<X size={20}/>:<Menu size={20}/>}Nội dung theo dõi</button><nav id="parent-navigation" aria-label="Nội dung phụ huynh" className={open?'is-open':''}>{groups.map(group=><div className={'parent-nav-group parent-nav-group--'+group.tone} key={group.label}><p className="parent-nav-label">{group.label}</p>{group.items.map(n=><a href={'#'+n.id} key={n.id} aria-current={active===n.id?'location':undefined} onClick={()=>{setActive(n.id);setOpen(false);}}><n.icon size={18} aria-hidden="true"/><span>{n.label}</span></a>)}</div>)}</nav></aside>}
 <main id="parent-main" className="parent-report">{children}</main></div></div>;
}
