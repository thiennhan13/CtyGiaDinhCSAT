const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {randomUUID}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {Client}=require('pg'),{as,id,value}=require('./accounting.test.cjs');
const {ready,queue}=require('./oj-links.test.cjs');
async function port(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
test('PostgreSQL: concurrent OJ links cannot claim one account twice; duplicate request is idempotent', {timeout:120000,skip:process.platform!=='win32'},async()=>{
 const runtime=fs.mkdtempSync(path.join(os.tmpdir(),'csat-oj-pg-')),dataDir=path.join(runtime,'data');
 assert(path.resolve(runtime).startsWith(path.resolve(os.tmpdir())+path.sep));
 const binaries=await import('@embedded-postgres/windows-x64'),native=path.join(runtime,'native');
 fs.cpSync(path.resolve(path.dirname(binaries.postgres),'..'),native,{recursive:true});
 const bin=path.join(native,'bin'),passwordFile=path.join(runtime,'password');
 const config={host:'127.0.0.1',port:await port(),user:'postgres',password:randomUUID(),database:'postgres'};
 fs.writeFileSync(passwordFile,config.password);const clients=[];let started=false;
 const connect=async()=>{const c=new Client(config);await c.connect();clients.push(c);c.exec=s=>c.query(s);return c;};
 try{
  execFileSync(path.join(bin,'initdb.exe'),['-D',dataDir,'-U',config.user,'--pwfile='+passwordFile,'--auth=scram-sha-256','--encoding=UTF8','--locale=C'],{windowsHide:true,stdio:'pipe'});
  execFileSync(path.join(bin,'pg_ctl.exe'),['-D',dataDir,'-l',path.join(runtime,'server.log'),'-o','-h 127.0.0.1 -p '+config.port,'-w','-t','30','start'],{windowsHide:true,stdio:'ignore',timeout:40000});started=true;
  const a=await connect();await ready(a);const b=await connect();await as(b);
  const duplicate=await Promise.all([queue(a,'student',10,0,{profile_id:7},100),queue(b,'student',10,0,{profile_id:7},100)]);
  assert.deepEqual(duplicate[0],duplicate[1]);
  await a.exec('reset role');assert.equal(await value(a,'select count(*)::int from oj_link_outbox'),1);await as(a);
  // Existing pending claim belongs to student 10. A second student cannot acquire it.
  await assert.rejects(()=>queue(b,'student',11,0,{profile_id:7},101),{code:'23505'});
  // Separate profiles racing to reserve a new organization: exactly one transaction wins.
  await a.exec('reset role');await a.query("insert into classes(class_id,tutor_id,name,start_date,end_date,csat_fee_per_session) select $1,tutor_id,'Other class',start_date,end_date,csat_fee_per_session from classes where class_id=$2",[id(31),id(30)]);await as(a);
  const race=await Promise.allSettled([queue(a,'class',30,0,{organization_id:3},102),queue(b,'class',31,0,{organization_id:3},103)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.code,'23505');
 }finally{
  for(const c of clients)await c.end();
  if(started)execFileSync(path.join(bin,'pg_ctl.exe'),['-D',dataDir,'-m','fast','-w','-t','30','stop'],{windowsHide:true,stdio:'ignore',timeout:40000});
  // Preserve fixture files for inspection; no recursive removal of a computed path.
 }
});
