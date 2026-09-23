// Explicit operator tool. Dry-run by default; never reads student data or drains an outbox.
const fs=require('node:fs'),path=require('node:path');
const recipient='csattutor@gmail.com';
function payload(kind,id,sender){
 const texts={
  consultation:'Yêu cầu tư vấn MẪU. Người liên hệ: Phụ huynh minh họa. Nội dung: tìm hiểu chương trình Cơ bản. Không có hồ sơ hay số điện thoại thật.\nQuản lý tư vấn: https://portal.csatoj.vn/admin/consultations',
  reminder:'Nhắc nhận xét tháng MẪU. Học sinh minh họa · Lớp minh họa. Hoàn thiện nhận xét và chọn tag có minh chứng một lần cho mỗi học sinh/lớp/tháng. Lưu nháp khi đang soạn; “Gửi nhận xét” công bố cho phụ huynh. Admin chốt sổ học phí riêng.',
  digest:'Tổng hợp tháng MẪU. Các số liệu dưới đây chỉ để kiểm tra trình bày: 1 nhận xét nháp, 1 chưa viết. “Nhà cung cấp tiếp nhận” không có nghĩa thư đã đến Inbox.\nXem vận hành: https://portal.csatoj.vn/admin/learning'
 };
 if(!Object.hasOwn(texts,kind))throw Error('invalid_sample_kind');
 return {from:sender,to:[recipient],reply_to:recipient,subject:`[CSAT · THƯ THỬ] ${kind} · ${id}`,text:'Đây là thư thử có kiểm soát của CSAT. Không cần xử lý nhận xét hoặc liên hệ phụ huynh.\n\n'+texts[kind]};
}
async function run({send=false,id,kind='reminder',stateDir=path.resolve(__dirname,'../scratch/email-smoke'),env=process.env,fetchImpl=global.fetch,now=Date.now}={}){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||''))throw Error('supply_uuid_v4_id');
 const sender=env.CSAT_EMAIL_FROM||'CSAT <thongbao@notify.csatoj.vn>';
 if(sender!=='CSAT <thongbao@notify.csatoj.vn>')throw Error('unexpected_sender');
 const sample=payload(kind,id,sender);
 if(!send)return {dryRun:true,payload:sample};
 if(!env.RESEND_API_KEY)throw Error('missing_resend_key');
 fs.mkdirSync(stateDir,{recursive:true});
 const file=path.join(stateDir,id+'.json'),lock=file+'.lock';
 const descriptor=fs.openSync(lock,'wx',0o600);
 try{
  const time=now();let state=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;
  if(state&&(state.id!==id||state.kind!==kind||JSON.stringify(state.payload)!==JSON.stringify(sample)))throw Error('sample_changed_use_original_parameters');
  if(state?.status==='accepted')return {state:'already_accepted',id};
  if(state&&(state.attempts>=3||time-state.first_attempt_at>=23*60*60*1000))throw Error('manual_review_required');
  if(state&&time-state.last_attempt_at<5*60*1000)throw Error('retry_after_five_minutes');
  state={...state,id,kind,payload:sample,first_attempt_at:state?.first_attempt_at??time,last_attempt_at:time,attempts:(state?.attempts??0)+1,status:'sending'};
  // Persist before the HTTP call, so an uncertain outcome can only retry the same payload/key.
  const persist=()=>{fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2),{mode:0o600});fs.renameSync(file+'.tmp',file);};
  persist();let providerId=null,error=null;
  try{
   const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'csat-smoke-'+id},body:JSON.stringify(state.payload),signal:AbortSignal.timeout(10000)});
   const body=await response.json().catch(()=>null);
   if(response.ok&&typeof body?.id==='string')providerId=body.id;else error='provider_http_'+response.status;
  }catch{error='transport_uncertain';}
  state={...state,status:providerId?'accepted':'failed',provider_id:providerId,error_code:error};persist();
  return {id,state:state.status,error_code:error};
 }finally{fs.closeSync(descriptor);fs.unlinkSync(lock);}
}
module.exports={run,payload};
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.some(a=>a!=='--send'&&!/^--(id|kind)=/.test(a))){console.error('Allowed: --id=<UUID-v4> --kind=consultation|reminder|digest [--send]');process.exitCode=1;}
 else run({send:args.includes('--send'),id:args.find(a=>a.startsWith('--id='))?.slice(5),kind:args.find(a=>a.startsWith('--kind='))?.slice(7)||'reminder'}).then(r=>{console.log(JSON.stringify(r,null,2));if(r.state==='failed')process.exitCode=1;}).catch(e=>{console.error(['supply_uuid_v4_id','invalid_sample_kind','unexpected_sender','missing_resend_key','sample_changed_use_original_parameters','manual_review_required','retry_after_five_minutes'].includes(e.message)?e.message:'sample_state_or_configuration_error');process.exitCode=1;});
}
