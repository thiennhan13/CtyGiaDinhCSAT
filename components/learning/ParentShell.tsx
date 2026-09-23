'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { LayoutDashboard, MessageSquareText, Route, Signpost, CalendarDays, Trophy, UsersRound, Menu, X } from 'lucide-react';
import { ParentLogoutButton } from '@/app/parents/logout-button';
import { PrintPortal } from '@/app/parents/portal-actions';
import './parent-portal.css';
const navigation=[{id:'overview',label:'Tổng quan',icon:LayoutDashboard},{id:'reviews',label:'Nhận xét gia sư',icon:MessageSquareText},{id:'roadmap',label:'Lộ trình học tập',icon:Route},{id:'development',label:'Định hướng phát triển',icon:Signpost},{id:'attendance',label:'Buổi học',icon:CalendarDays},{id:'oj',label:'Kết quả CSATOJ',icon:Trophy},{id:'services',label:'Gia sư & học phí',icon:UsersRound}];
export function ParentShell({children,navigationEnabled=true}:{children:ReactNode;navigationEnabled?:boolean}){
 const [open,setOpen]=useState(false),[active,setActive]=useState('overview');
 useEffect(()=>{
  const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);if(visible[0])setActive(visible[0].target.id);},{rootMargin:'-100px 0px -55% 0px',threshold:0});
  navigation.forEach(n=>{const el=document.getElementById(n.id);if(el)observer.observe(el);});return()=>observer.disconnect();
 },[]);
 return <div className="parent-portal"><a className="parent-skip" href="#parent-main">Đến nội dung chính</a><header className="parent-topbar print:hidden"><Link href="/" className="parent-logo" aria-label="CSAT · Về trang chủ"><Image src="/icon/csat-nav-logo.png" width={100} height={36} alt="CSAT" priority/></Link><div className="parent-topbar-label"><span className="parent-dot"/>CỔNG PHỤ HUYNH</div><div className="parent-topbar-actions"><PrintPortal/><ParentLogoutButton/></div></header>
 <div className={'parent-shell '+(!navigationEnabled?'parent-shell-simple':'')}>
 {navigationEnabled&&<aside className="parent-sidebar print:hidden"><button type="button" className="parent-menu-toggle" aria-expanded={open} aria-controls="parent-navigation" onClick={()=>setOpen(!open)}>{open?<X size={20}/>:<Menu size={20}/>}Nội dung theo dõi</button><nav id="parent-navigation" aria-label="Nội dung phụ huynh" className={open?'is-open':''}><p className="parent-nav-label">ĐỒNG HÀNH CÙNG CON</p>{navigation.map(n=><a href={'#'+n.id} key={n.id} aria-current={active===n.id?'location':undefined} onClick={()=>{setActive(n.id);setOpen(false);}}><n.icon size={18}/><span>{n.label}</span></a>)}<p className="parent-sidebar-note">Hiểu việc con học.<br/>Cùng con tiến từng bước.</p></nav></aside>}
 <main id="parent-main" className="parent-report">{children}</main></div></div>;
}
