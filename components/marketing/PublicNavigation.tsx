'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, X, Sun, Moon, MessageCircle, ArrowUpRight, Bell, BookOpen } from 'lucide-react';
import { RoadmapNavigation } from './RoadmapNavigation';
import { publicContactChannels } from '@/lib/public-contact';
export function PublicNavigation() {
    const path = usePathname(), { resolvedTheme, setTheme } = useTheme();
    const [menu, setMenu] = useState(false), [dock, setDock] = useState(false), [mounted, setMounted] = useState(false);
    const [materialsNotice, setMaterialsNotice] = useState(true);
    const header = useRef<HTMLElement>(null), aside = useRef<HTMLElement>(null), menuButton = useRef<HTMLButtonElement>(null), dockButton = useRef<HTMLButtonElement>(null);
    useEffect(() => setMounted(true), []);
    useEffect(() => { if (menu)
        header.current?.querySelector<HTMLAnchorElement>('nav a')?.focus(); }, [menu]);
    useEffect(() => { if (dock)
        aside.current?.querySelector<HTMLAnchorElement>('a')?.focus(); }, [dock]);
    useEffect(() => {
        const outside = (e: PointerEvent) => { if (!header.current?.contains(e.target as Node))
            setMenu(false); if (!aside.current?.contains(e.target as Node))
            setDock(false); };
        const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') {
            if (menu) {
                setMenu(false);
                menuButton.current?.focus();
            }
            if (dock) {
                setDock(false);
                dockButton.current?.focus();
            }
        } };
        const wide = matchMedia('(min-width:1281px)'), resize = () => { if (wide.matches)
            setMenu(false); };
        document.addEventListener('pointerdown', outside);
        document.addEventListener('keydown', escape);
        wide.addEventListener('change', resize);
        return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); wide.removeEventListener('change', resize); };
    }, [menu, dock]);
    const close = () => { setMenu(false); setDock(false); };
    return <><header className="site-header" ref={header}><div className="navbar wrap"><Link href="/" className="brand" onClick={close} aria-label="CSAT — trang giới thiệu"><Image src="/icon/csat-logo-compact.svg" alt="CSAT" width={91} height={40}/><span className="brand-caption">Lập trình thi đấu &amp;<br />Tư duy thuật toán</span></Link><nav id="public-navigation" className={`nav-links${menu ? ' is-open' : ''}`} aria-label="Điều hướng chính"><Link href="/" aria-current={path === '/' ? 'page' : undefined} onClick={close}>Giới thiệu</Link><RoadmapNavigation onNavigate={close} /><Link href="/thanh-tich" aria-current={path === "/thanh-tich" ? "page" : undefined} onClick={close}>Thành tích</Link><Link href="/gia-su" aria-current={path === "/gia-su" ? "page" : undefined} onClick={close}>Đội ngũ</Link><Link href="/bai-dang" aria-current={path.startsWith("/bai-dang") ? "page" : undefined} onClick={close}>Bài đăng</Link><span className="nav-spacer"/><Link className="nav-channel" href="/login" aria-current={path === "/login" || path.startsWith("/parents") ? "page" : undefined} onClick={close}>Trang liên lạc</Link><a className="nav-oj" href="https://csatoj.vn" target="_blank" rel="noopener noreferrer" aria-label="Kho đề thi và bài tập CSATOJ — mở tab mới"><span className="oj-caption">Kho đề thi<br />&amp; bài tập</span><Image src="/icon/csatoj-logo-compact.svg" alt="CSATOJ" width={106} height={41}/></a></nav><button type="button" className="icon-btn" aria-label="Chuyển giao diện sáng/tối" aria-pressed={mounted && resolvedTheme === 'dark'} onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>{mounted && resolvedTheme === 'dark' ? <Sun size={22}/> : <Moon size={22}/>}</button><button ref={menuButton} type="button" className="icon-btn menu-button" aria-label={menu ? 'Đóng menu' : 'Mở menu'} aria-expanded={menu} aria-controls="public-navigation" onClick={() => { setMenu(!menu); setDock(false); }}>{menu ? <X size={22}/> : <Menu size={22}/>}</button></div></header>{path !== '/login' && path !== '/tutor' && <aside ref={aside} className="contact-dock" aria-label="Liên hệ CSAT">
      {materialsNotice && !dock && !menu && path !== '/hoc-lieu-mien-phi' && <div className="dock-materials-notice">
        <Link href="/hoc-lieu-mien-phi" onClick={close}><span className="dock-notice-icon"><Bell size={24} aria-hidden="true" /></span><span>Nhận học liệu chuyên Tin<br /><strong>ngay bây giờ! <ArrowUpRight size={16} aria-hidden="true" /></strong></span></Link>
        <button type="button" aria-label="Ẩn gợi ý học liệu" onClick={() => { setMaterialsNotice(false); dockButton.current?.focus(); }}><X size={16} /></button>
      </div>}
      <div className="dock-panel" id="contact-panel" hidden={!dock}>
        <Link href="/hoc-lieu-mien-phi" onClick={close}><span>Học liệu miễn phí<br /><small>Trao đổi cùng gia sư CSAT</small></span><BookOpen size={20} /></Link>
        {publicContactChannels.map(channel => <a key={channel.name} href={channel.url} target="_blank" rel="noopener noreferrer"><span>{channel.name}<br /><small>{channel.label}</small></span><ArrowUpRight size={20} /></a>)}
      </div>
      <button ref={dockButton} type="button" className="icon-btn dock-toggle" aria-controls="contact-panel" aria-expanded={dock} aria-label={dock ? 'Đóng các kênh liên hệ' : 'Mở các kênh liên hệ'} onClick={() => { setDock(!dock); setMenu(false); }}><MessageCircle size={24}/></button>
    </aside>}</>;
}
