const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {run}=require('../../scripts/email-smoke.cjs');const id='30000000-0000-4000-8000-000000000001';
test('smoke is dry-run by default with only synthetic data and a fixed recipient',async()=>{
 for(const kind of ['consultation','reminder','digest']){const r=await run({id,kind,env:{},fetchImpl:()=>{throw Error('must not call');}});assert.equal(r.dryRun,true);assert.deepEqual(r.payload.to,['csattutor@gmail.com']);assert.equal(r.payload.reply_to,'csattutor@gmail.com');}
 await assert.rejects(()=>run({id,send:true,env:{}}),/missing_resend_key/);await assert.rejects(()=>run({id,env:{CSAT_EMAIL_FROM:'other@example.com'}}),/unexpected_sender/);
});
test('smoke freezes payload, prevents overlapping send, limits retries and never resends accepted job',async()=>{
 const stateDir=fs.mkdtempSync(path.join(os.tmpdir(),'csat-smoke-test-'));let time=0,sent=0;const calls=[];
 const args={id,stateDir,send:true,env:{RESEND_API_KEY:'synthetic-only'},now:()=>time,fetchImpl:async(u,o)=>{calls.push(o);sent++;return sent===1?Response.json({},{status:429}):Response.json({id:'synthetic-provider'});}};
 try{
 assert.equal((await run(args)).state,'failed');await assert.rejects(()=>run(args),/retry_after/);time+=300001;assert.equal((await run(args)).state,'accepted');assert.equal(calls[0].body,calls[1].body);assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);assert.equal((await run(args)).state,'already_accepted');assert.equal(sent,2);
 await assert.rejects(()=>run({...args,kind:'digest'}),/sample_changed/);
 fs.writeFileSync(path.join(stateDir,id+'.json.lock'),'');await assert.rejects(()=>run(args),{code:'EEXIST'});
 }finally{if(path.dirname(stateDir)===os.tmpdir()&&path.basename(stateDir).startsWith('csat-smoke-test-'))fs.rmSync(stateDir,{recursive:true,force:true});}
});
test('uncertain smoke results stop outside idempotency window',async()=>{
 const stateDir=fs.mkdtempSync(path.join(os.tmpdir(),'csat-smoke-test-'));let time=0;const args={id,stateDir,send:true,env:{RESEND_API_KEY:'synthetic-only'},now:()=>time,fetchImpl:async()=>{throw Error('timeout');}};
 try{assert.equal((await run(args)).error_code,'transport_uncertain');time=23*60*60*1000;await assert.rejects(()=>run(args),/manual_review/);}finally{if(path.dirname(stateDir)===os.tmpdir()&&path.basename(stateDir).startsWith('csat-smoke-test-'))fs.rmSync(stateDir,{recursive:true,force:true});}
});
