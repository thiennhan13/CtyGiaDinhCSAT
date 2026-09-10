'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
export function PrintPortal() {
 return <Button className="min-h-11" variant="outline" onClick={()=>{
   const details=Array.from(document.querySelectorAll<HTMLDetailsElement>('.parent-report details'));
   const states=details.map(d=>d.open);details.forEach(d=>{d.open=true;});
   const restore=()=>{details.forEach((d,i)=>{d.open=states[i];});window.removeEventListener('afterprint',restore);};
   window.addEventListener('afterprint',restore);window.print();
 }}>In / Lưu PDF A4</Button>;
}
export function ParentContact({name,label,url}:{name:string;label:string;url:string}){
 const [notice,setNotice]=useState('');
 const message='Chào CSAT, tôi là phụ huynh của '+name+'. Tôi muốn trao đổi về việc học của con: ';
 return <div className="space-y-3"><p className="text-sm leading-7">Gửi kèm tên học sinh và nội dung cần trao đổi để trung tâm hỗ trợ đúng tình hình.</p><textarea className="min-h-24 w-full rounded-lg border bg-background p-3 text-sm" aria-label="Nội dung trao đổi gợi ý" readOnly value={message}/><div className="flex flex-wrap gap-3"><Button className="min-h-11" variant="outline" onClick={async()=>{try{await navigator.clipboard.writeText(message);setNotice('Đã sao chép. Bạn có thể bổ sung nội dung trước khi gửi.');}catch{setNotice('Hãy chọn và sao chép nội dung trong ô phía trên.');}}}>Sao chép nội dung</Button>{url.startsWith('https://') && <a className="csat-btn text-sm" href={url} target="_blank" rel="noopener noreferrer">{label || 'Liên hệ CSAT'}</a>}</div>{!url && <p className="text-xs text-muted-foreground">Trung tâm chưa cập nhật kênh liên hệ tại đây. Vui lòng dùng kênh đang trao đổi với CSAT.</p>}{notice && <p role="status" className="text-xs">{notice}</p>}</div>;
}
