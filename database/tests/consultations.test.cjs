const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,as,value}=require('./accounting.test.cjs');
const {randomUUID}=require('node:crypto');
const data=(phone='0912345678')=>({role:'parent',name:'Test Parent',phone,email:'parent@example.test',level:'thcs',goal:'specialist',program:'co-ban',school_year:'8',message:'Test only',consent:true});
const payload={to:['csattutor@gmail.com'],subject:'Test only',text:'Synthetic consultation'};
async function ready(){const db=await setup();await db.exec('reset role');await db.exec(fs.readFileSync(path.join(__dirname,'../migrations/20260913_18_consultations.sql'),'utf8'));return db;}
async function service(db){await db.exec('reset role;set role service_role');}
const submit=(db,id=randomUUID(),body=data(),source='a'.repeat(64),mail=payload)=>value(db,'select submit_consultation($1,$2,$3,$4)',[id,JSON.stringify(body),source,JSON.stringify(mail)]);
const claim=(db,id,sender='CSAT <sender@example.test>')=>value(db,'select claim_consultation_email($1,$2)',[id,sender]);
const finish=(db,id,lease,provider=null,error='transport_uncertain')=>value(db,'select finish_consultation_email($1,$2,$3,$4)',[id,lease,provider,error]);
test('consultation saves atomically and idempotently without modifying historical business rows',async()=>{const db=await ready();try{
 const before=await value(db,'select jsonb_agg(to_jsonb(p)) from payments p');await service(db);const id=randomUUID();await submit(db,id);await submit(db,id,data(),'b'.repeat(64),{...payload,text:'Different timestamp on retry'});
 await assert.rejects(()=>submit(db,id,{...data(),message:'changed'}),/Request key reused/);
 await db.exec('reset role');assert.equal(await value(db,'select count(*)::int from consultation_requests'),1);assert.equal(await value(db,'select count(*)::int from consultation_email_outbox'),1);assert.deepEqual(await value(db,'select payload from consultation_email_outbox'),payload);assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(p)) from payments p'),before);
 await service(db);await assert.rejects(()=>submit(db,randomUUID(),data(),'a'.repeat(64),{to:['attacker@example.test'],text:'invalid'}),/Invalid email/);
 await db.exec('reset role');assert.equal(await value(db,'select count(*)::int from consultation_requests'),1);
 }finally{await db.close();}});
test('persisted sliding limits apply across sources and remain idempotent at the limit',async()=>{const db=await ready();try{await service(db);const id=randomUUID();await submit(db,id);await submit(db);await submit(db);await assert.rejects(()=>submit(db,randomUUID(),data(),'b'.repeat(64)),/Too many/);await submit(db,id);
 await submit(db,randomUUID(),data('0987654321'));await submit(db,randomUUID(),data('0987654321'));await assert.rejects(()=>submit(db,randomUUID(),data('0987654321')),/Too many/);
 }finally{await db.close();}});
test('anon/tutor cannot read contacts or write and only admin can change statuses with revision guard',async()=>{const db=await ready();try{await service(db);const id=await submit(db);await db.exec('reset role;set role anon');await assert.rejects(()=>submit(db),/permission denied/);await assert.rejects(()=>value(db,'select count(*) from consultation_requests'),/permission denied/);
 await as(db,'tutor');assert.equal(await value(db,'select count(*)::int from consultation_requests'),0);await assert.rejects(()=>claim(db,id),/permission denied/);await assert.rejects(()=>value(db,"select update_consultation_status($1,'contacted',1)",[id]),/Admin required/);
 await as(db);assert.equal(await value(db,'select count(*)::int from consultation_requests'),1);assert.equal(await value(db,"select update_consultation_status($1,'contacted',1)",[id]),2);await assert.rejects(()=>value(db,"select update_consultation_status($1,'completed',1)",[id]),/thay đổi/);await assert.rejects(()=>db.exec("update consultation_requests set status='completed'"),/permission denied/);await assert.rejects(()=>claim(db,id),/permission denied/);
 }finally{await db.close();}});
test('mail claims freeze payload, prevent parallel sends, reject stale finish and never retry accepted mail',async()=>{const db=await ready();try{await service(db);const id=await submit(db),job=await claim(db,id);assert.ok(job.lease_id);assert.equal(await claim(db,id),null);assert.equal(await finish(db,id,randomUUID(),'invalid'),false);assert.equal(await finish(db,id,job.lease_id),true);assert.equal(await claim(db,id),null);
 await db.exec('reset role');await db.query("update consultation_email_outbox set next_attempt_at=now() where request_id=$1",[id]);await service(db);const retry=await claim(db,id,'Changed <changed@example.test>');assert.deepEqual(retry.payload,job.payload);assert.equal(await finish(db,id,retry.lease_id,'provider-test'),true);assert.equal(await claim(db,id),null);
 }finally{await db.close();}});
test('uncertain mail beyond 23 hours or three attempts requires manual review; expired lease can recover',async()=>{const db=await ready();try{await service(db);const id=await submit(db);await claim(db,id);await db.exec('reset role');await db.query("update consultation_email_outbox set lease_until=now()-interval '1 second' where request_id=$1",[id]);await service(db);assert.ok(await claim(db,id));await db.exec('reset role');await db.query("update consultation_email_outbox set lease_until=now()-interval '1 second', first_attempt_at=now()-interval '24 hours' where request_id=$1",[id]);await service(db);assert.equal(await claim(db,id),null);await db.exec('reset role');assert.equal(await value(db,'select status from consultation_email_outbox where request_id=$1',[id]),'manual_review');
 }finally{await db.close();}});
