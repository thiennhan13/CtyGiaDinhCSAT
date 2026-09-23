
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {randomUUID}=require('node:crypto');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const {Client}=require('pg');
const {setup,as,id,value,verifyFixtureRosters}=require('./accounting.test.cjs');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('PostgreSQL 17: concurrent accounting, learning drafts and email leases; backup restores independently', {timeout:120000,skip:process.platform!=='win32'}, async()=>{
 // Native Windows PostgreSQL cannot re-exec reliably from a non-ASCII path.
 const runtime=fs.mkdtempSync(path.join(os.tmpdir(),'csat-pg-test-')),dataDir=path.join(runtime,'data');
 assert.ok(path.resolve(runtime).startsWith(path.resolve(os.tmpdir())+path.sep));
 const binaries=await import('@embedded-postgres/windows-x64');
 const nativeDir=path.join(runtime,'native');
 fs.cpSync(path.resolve(path.dirname(binaries.postgres),'..'),nativeDir,{recursive:true});
 const binDir=path.join(nativeDir,'bin');
 const config={host:'127.0.0.1',port:await port(),user:'postgres',password:randomUUID(),database:'postgres'};
 const passwordFile=path.join(runtime,'password');fs.writeFileSync(passwordFile,config.password);
 let activeDataDir=dataDir;
 const pg={
  async initialise(){execFileSync(path.join(binDir,'initdb.exe'),['-D',dataDir,'-U',config.user,'--pwfile='+passwordFile,'--auth=scram-sha-256','--encoding=UTF8','--locale=C'],{windowsHide:true,stdio:'pipe'});},
  async start(){execFileSync(path.join(binDir,'pg_ctl.exe'),['-D',dataDir,'-l',path.join(runtime,'postgres.log'),'-o','-h 127.0.0.1 -p '+config.port,'-w','-t','30','start'],{windowsHide:true,stdio:'ignore',timeout:40000});},
  async stop(){execFileSync(path.join(binDir,'pg_ctl.exe'),['-D',activeDataDir,'-m','fast','-w','-t','30','stop'],{windowsHide:true,stdio:'ignore',timeout:40000});}
 };
 const clients=[];let started=false;
 const connect=async(db='postgres')=>{const c=new Client({...config,database:db});await c.connect();clients.push(c);
  c.exec=sql=>c.query(sql);c.close=async()=>{};return c;};
 try{
  await pg.initialise();await pg.start();started=true;
  const a=await connect();await setup(a);await a.exec('reset role');
  for(const name of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>/^202609(08|09|10)_/.test(n)).sort().slice(2))
   await a.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));
  await as(a);await verifyFixtureRosters(a);const b=await connect();await as(b);
  const preview=await value(a,'select billing_report($1,$2,null)',['2026-06-02','2026-06-03']);
  const closeSQL='select close_billing_period($1,$2,$3,$4,$5)';
  const args=['2026-06-02','2026-06-03','Concurrent',preview.previewToken,id(300)];
  const [one,two]=await Promise.all([value(a,closeSQL,args),value(b,closeSQL,args)]);
  assert.deepEqual(one,two);assert.equal(one.invoice_count,1);
  assert.equal(await value(a,'select count(*)::int from billing_sessions'),2);
  const p=(await value(a,"select payment_accounts()")).find(p=>p.billing_period==='Concurrent');
  const paid=await Promise.allSettled([value(a,'select record_payment_event($1,$2,$3)',[p.payment_id,id(301),100000]),
    value(b,'select record_payment_event($1,$2,$3)',[p.payment_id,id(302),100000])]);
  assert.equal(paid.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(await value(a,'select count(*)::int from payment_events where payment_id=$1',[p.payment_id]),1);
  const today=await value(a,"select (now() at time zone 'Asia/Ho_Chi_Minh')::date::text");
  const end=await value(a,"select ((now() at time zone 'Asia/Ho_Chi_Minh')::date+10)::text");
  const c=await value(a,'select manage_class($1,null,$2,$3)',['create',JSON.stringify({name:'Concurrent schedule',class_type:'Cơ bản',
   tutor_id:id(20),csat_fee_per_session:30000,start_date:today,end_date:end,students:[],sessions:[]}),id(303)]);
  const spec=JSON.stringify({sessions:[{date:end,start_time:'18:00',end_time:'19:00'}]});
  const schedule=await Promise.allSettled([value(a,'select manage_class($1,$2,$3,$4)',['add_sessions',c.class_id,spec,id(304)]),
   value(b,'select manage_class($1,$2,$3,$4)',['add_sessions',c.class_id,spec,id(305)])]);
  assert.equal(schedule.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(await value(a,'select count(*)::int from sessions where class_id=$1',[c.class_id]),1);
  // A completed close also blocks a concurrent attempt to change its attendance.
  await assert.rejects(()=>value(b,'select take_attendance_safe($1,$2)',[id(41),JSON.stringify([{student_id:id(10),status:'absent'}])]),/đã chốt/);

  // Two editors starting from the same revision: exactly one write wins.
  const learningBody={goal:'Concurrent draft',focus_tags:[],next_step:'',stage_index:null,title:'',content:'',continuation:'',program:'basic',format:'group',template_id:'30000000-0000-4000-8000-000000000001'};
  const learningSQL="select save_learning_record($1,'class',null,null,0,$2,false)";
  const learningWrites=await Promise.allSettled([value(a,learningSQL,[c.class_id,JSON.stringify(learningBody)]),value(b,learningSQL,[c.class_id,JSON.stringify({...learningBody,goal:'Other editor'})])]);
  assert.equal(learningWrites.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(learningWrites.find(r=>r.status==='rejected').reason.code,'40001');
  // Two workers cannot claim the same email, and leases survive a backup.
  await a.exec('reset role');
  await a.exec("update parent_portal_settings set email_enabled=true");
  await a.query("insert into review_email_runs(month,snapshot,sender,origin,admin_emails) values('2026-09','[]','test@example.test','https://example.test','{}')");
  await a.query("insert into review_email_outbox(month,kind,recipient_key,recipient,payload) values('2026-09','tutor','test','test@example.test','{}')");
  for(const worker of [a,b]){await worker.exec('reset role');await worker.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await worker.exec('set role service_role');}
  const claims=await Promise.all([value(a,"select review_email_work('claim')"),value(b,"select review_email_work('claim')")]);
  assert.equal(claims.filter(Boolean).length,1);

  // Consultation submission and claim locks must work across actual connections.
  await a.exec('reset role');
  await a.exec(fs.readFileSync(path.join(__dirname,'../migrations/20260913_18_consultations.sql'),'utf8'));
  for(const worker of [a,b])await worker.exec('set role service_role');
  const consultationId=randomUUID();
  const consultationData={role:'parent',name:'Synthetic Parent',phone:'0912345678',email:'',level:'thcs',goal:'specialist',program:'co-ban',school_year:'8',message:'Native concurrency test',consent:true};
  const submitSQL='select submit_consultation($1,$2,$3,$4)';
  const consultationArgs=[consultationId,JSON.stringify(consultationData),'a'.repeat(64),JSON.stringify({to:['csattutor@gmail.com'],subject:'Test only',text:'Synthetic'})];
  const saved=await Promise.all([value(a,submitSQL,consultationArgs),value(b,submitSQL,consultationArgs)]);
  assert.equal(saved[0],saved[1]);
  const mailClaims=await Promise.all([value(a,'select claim_consultation_email($1,$2)',[consultationId,'test@example.test']),value(b,'select claim_consultation_email($1,$2)',[consultationId,'test@example.test'])]);
  assert.equal(mailClaims.filter(Boolean).length,1);
  await value(a,submitSQL,[randomUUID(),...consultationArgs.slice(1)]);
  const limited=await Promise.allSettled([value(a,submitSQL,[randomUUID(),...consultationArgs.slice(1)]),value(b,submitSQL,[randomUUID(),...consultationArgs.slice(1)])]);
  assert.equal(limited.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(limited.find(r=>r.status==='rejected').reason.code,'P0429');

  // Complete the real PostgreSQL chain before exercising the final email worker.
  await a.exec('reset role');
  for(const file of ['20260911_16_parent_domestic_phones.sql','20260911_17_class_program_defaults.sql'])
   await a.exec(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));
  // New rollout: concurrent prepare creates one run; concurrent claims retain one lease.
  await a.exec('reset role');
  await a.exec(fs.readFileSync(path.join(__dirname,'../migrations/20260914_19_email_operations.sql'),'utf8'));
  for(const file of ['20260922_20_curriculum_frameworks.sql','20260922_21_parent_email_completion.sql','20260923_22_tutor_profiles.sql'])
   await a.exec(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));
  for(const file of ['20260914_email_operations.sql','20260922_curriculum_frameworks.sql','20260922_parent_email_completion.sql','20260923_tutor_profiles.sql'])
   await a.exec(fs.readFileSync(path.join(__dirname,'../verification',file),'utf8'));
  let emailDef=await value(a,"select pg_get_functiondef('review_email_work(text,jsonb)'::regprocedure)");
  emailDef=emailDef.replace("local_now timestamp:=now() AT TIME ZONE 'Asia/Ho_Chi_Minh'","local_now timestamp:='2026-06-28 08:00'::timestamp");
  await a.exec(emailDef);await a.exec("update tutors set email='tutor@example.test'");
  for(const worker of [a,b])await worker.exec('set role service_role');
  const prepareArgs=['prepare',JSON.stringify({origin:'https://portal.example.test',sender:'CSAT <test@example.test>',reply_to:'csattutor@gmail.com'})];
  const prepared=await Promise.all([value(a,'select review_email_work($1,$2)',prepareArgs),value(b,'select review_email_work($1,$2)',prepareArgs)]);
  assert.equal(prepared.filter(x=>x.prepared).length,1);assert.equal(prepared.filter(x=>x.existing).length,1);
  const newClaims=await Promise.all([value(a,"select review_email_work('claim')"),value(b,"select review_email_work('claim')")]);
  assert.equal(newClaims.filter(Boolean).length,1);
  assert.equal(newClaims.find(Boolean).month,'2026-06');

  // Admin and tutor must not silently overwrite the same profile revision.
  await as(a);await as(b,'tutor');
  const profileSQL='select save_tutor_profile($1,$2,$3)';
  const profileBody=JSON.stringify({introduction:'Synthetic concurrent profile',major:'',university:'',achievements:'',avatar_action:'keep'});
  const profileWrites=await Promise.allSettled([value(a,profileSQL,[id(20),0,profileBody]),value(b,profileSQL,[id(20),0,profileBody])]);
  assert.equal(profileWrites.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(profileWrites.filter(r=>r.status==='rejected')[0].reason.code,'40001');
  await a.exec('reset role');
  assert.equal(await value(a,'select revision from tutor_public_profiles where tutor_id=$1',[id(20)]),1);

  // Cold physical backup: copy only after a clean shutdown, then restore to a separate data directory.
  await Promise.all(clients.splice(0).map(c=>c.end()));
  await pg.stop();started=false;
  const restoredDir=path.join(runtime,'restored');
  fs.cpSync(dataDir,restoredDir,{recursive:true});
  execFileSync(path.join(binDir,'pg_ctl.exe'),['-D',restoredDir,'-l',path.join(runtime,'restore.log'),'-o','-h 127.0.0.1 -p '+config.port,'-w','-t','30','start'],{windowsHide:true,stdio:'ignore',timeout:40000});
  activeDataDir=restoredDir;started=true;
  const restored=await connect();
  assert.equal(await value(restored,"select count(*)::int from csat_internal.schema_migrations where version in ('20260913_18','20260914_19','20260922_20','20260922_21','20260923_22')"),5);
  assert.equal(await value(restored,'select count(*)::int from public.billing_items'),3);
  assert.equal(await value(restored,'select count(*)::int from public.payment_events'),1);
  assert.equal(await value(restored,'select amount from payments where payment_id=$1',[id(60)]),'100000.00');
 }finally{
  await Promise.allSettled(clients.map(c=>c.end()));
  if(started || fs.existsSync(path.join(activeDataDir,'postmaster.pid')))await pg.stop();
  const resolved=path.resolve(runtime);
  if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('csat-pg-test-'))fs.rmSync(resolved,{recursive:true,force:true});
 }
});
