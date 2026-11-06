const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {randomUUID}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {Client}=require('pg'),{as,id,value}=require('./accounting.test.cjs');
const {portalDB,parent}=require('./portal-upgrade-helper.cjs');
const {close,verifyFixtureRosters}=require('./accounting.test.cjs');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('PostgreSQL: Google claims, tutor receipts, grant completion race and reset restore', {timeout:120000,skip:process.platform!=='win32'},async()=>{
 const runtime=fs.mkdtempSync(path.join(os.tmpdir(),'csat-oj-pg-')),dataDir=path.join(runtime,'data');
 assert(path.resolve(runtime).startsWith(path.resolve(os.tmpdir())+path.sep));
 const binaries=await import('@embedded-postgres/windows-x64'),native=path.join(runtime,'native');
 fs.cpSync(path.resolve(path.dirname(binaries.postgres),'..'),native,{recursive:true});
 const bin=path.join(native,'bin'),passwordFile=path.join(runtime,'password');
 const config={host:'127.0.0.1',port:await port(),user:'postgres',password:randomUUID(),database:'postgres'};
 fs.writeFileSync(passwordFile,config.password);const clients=[];let started=false,activeDataDir=dataDir;
 const connect=async()=>{const c=new Client(config);await c.connect();clients.push(c);c.exec=s=>c.query(s);return c;};
 try{
  execFileSync(path.join(bin,'initdb.exe'),['-D',dataDir,'-U',config.user,'--pwfile='+passwordFile,'--auth=scram-sha-256','--encoding=UTF8','--locale=C'],{windowsHide:true,stdio:'pipe'});
  execFileSync(path.join(bin,'pg_ctl.exe'),['-D',dataDir,'-l',path.join(runtime,'server.log'),'-o','-h 127.0.0.1 -p '+config.port,'-w','-t','30','start'],{windowsHide:true,stdio:'ignore',timeout:40000});started=true;
  const a=await connect();a.close=async()=>{};await portalDB('20261105_34',a);const b=await connect();
  await value(a,'select admin_save_parent(null,$1,$2,$3,true,null)',['Parent','0912345678',id(10)]);
  await parent(a,80);await parent(b,81);
  const claims=await Promise.all([value(a,"select claim_parent_phone('+84912345678')"),value(b,"select claim_parent_phone('0084912345678')")]);
  assert.equal(claims.filter(x=>x.state==='active').length,1);assert.equal(claims.filter(x=>x.code==='PHONE_ALREADY_LINKED').length,1);
  await as(a);await verifyFixtureRosters(a);await close(a);
  const payment=(await value(a,'select payment_accounts()')).find(p=>p.billing_period==='New');assert(payment);
  await as(a,'tutor');await as(b,'tutor');
  const receipts=await Promise.allSettled([value(a,'select tutor_record_receipt($1,$2,$3)',[payment.payment_id,id(501),payment.balance]),value(b,'select tutor_record_receipt($1,$2,$3)',[payment.payment_id,id(502),payment.balance])]);
  assert.equal(receipts.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(receipts.find(r=>r.status==='rejected').reason.code,'40001');
  await as(a);await as(b);
  for(const [db,student,req]of [[a,10,601],[b,11,602]])await value(db,'select oj_begin_exchange($1,$2,$3,0,$4,$5)',[id(student),id(900),id(req),'a'.repeat(64),'Fixture']);
  for(const db of [a,b]){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
  const finishes=await Promise.allSettled([value(a,"select oj_finish_exchange($1,7,1,1,'fixture')",[id(601)]),value(b,"select oj_finish_exchange($1,7,1,1,'fixture')",[id(602)])]);
  assert.equal(finishes.filter(r=>r.status==='fulfilled').length,1);assert.equal(finishes.find(r=>r.status==='rejected').reason.code,'23505');
  await a.exec('reset role');await b.exec('reset role');
  const {inspect,reset}=require('../../scripts/portal-reset.cjs'),before=await inspect(a);
  const stop=()=>execFileSync(path.join(bin,'pg_ctl.exe'),['-D',activeDataDir,'-m','fast','-w','-t','30','stop'],{windowsHide:true,stdio:'ignore',timeout:40000});
  const start=()=>execFileSync(path.join(bin,'pg_ctl.exe'),['-D',activeDataDir,'-l',path.join(runtime,'restart.log'),'-o','-h 127.0.0.1 -p '+config.port,'-w','-t','30','start'],{windowsHide:true,stdio:'ignore',timeout:40000});
  await Promise.all(clients.splice(0).map(c=>c.end()));stop();started=false;
  const backup=path.join(runtime,'backup');fs.cpSync(dataDir,backup,{recursive:true});start();started=true;
  const live=await connect();await reset(live,before.token);
  assert.equal(await value(live,'select count(*)::int from students'),0);assert.equal(await value(live,'select count(*)::int from tutors'),2);
  await Promise.all(clients.splice(0).map(c=>c.end()));stop();started=false;
  activeDataDir=path.join(runtime,'restored');fs.cpSync(backup,activeDataDir,{recursive:true});start();started=true;
  const restored=await connect(),afterRestore=await inspect(restored);assert.equal(afterRestore.token,before.token);
 }finally{
  for(const c of clients)await c.end();
  if(started)execFileSync(path.join(bin,'pg_ctl.exe'),['-D',activeDataDir,'-m','fast','-w','-t','30','stop'],{windowsHide:true,stdio:'ignore',timeout:40000});
  // Preserve fixture files for inspection; no recursive removal of a computed path.
 }
});
