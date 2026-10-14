'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ParentPasswordForm() {
 const router = useRouter();
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError('');
  const data=new FormData(e.currentTarget);
  try {
   const r=await fetch('/api/parents/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(data))});
   const result=await r.json();if(!r.ok)throw new Error(result.error);
   router.replace('/login');router.refresh();
  } catch(e){setError(e instanceof Error?e.message:'Chưa đổi được mật khẩu.');}finally{setBusy(false);}
 }
 return <form onSubmit={submit} className="space-y-5 max-w-md">
  {([['current_password','Mật khẩu hiện tại','current-password'],['password','Mật khẩu mới','new-password'],['confirmation','Nhập lại mật khẩu mới','new-password']] as const).map(([name,label,complete])=><label key={name} className="block font-semibold">{label}<input className="block mt-2 w-full rounded-lg border border-input bg-background px-3 min-h-11" name={name} type="password" autoComplete={complete} required minLength={name==='current_password'?1:10} maxLength={128}/></label>)}
  <p className="text-sm text-muted-foreground">Mật khẩu mới có ít nhất 10 ký tự. Sau khi đổi, bạn sẽ đăng nhập lại trên các thiết bị.</p>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  <button className="csat-btn" disabled={busy}>{busy?'Đang lưu…':'Đổi mật khẩu'}</button>
 </form>;
}

