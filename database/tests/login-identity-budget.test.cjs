const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,value}=require('./accounting.test.cjs');
const dir=path.join(__dirname,'../migrations'),migration='20261024_29_login_identity_budget.sql';
const sql=name=>fs.readFileSync(path.join(dir,name),'utf8');
const hash=n=>n.toString(16).padStart(64,'0');
const consume=(db,source,identity)=>value(db,'select consume_auth_attempt($1,$2)',[hash(source),hash(identity)]);
async function ready(){
 const db=await setup();await db.exec('reset role');
 await db.exec('alter table auth.users add column phone text, add column banned_until timestamptz; create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));');
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&n>'20260908_06_atomic_billing.sql'&&n<='20261014_27_parent_phone_access.sql').sort()){
  if(/^202609(14_19|22_21|23_22)/.test(name))continue;
  await db.exec(sql(name));
 }
 return db;
}
test('migration 29 preserves counters and grants; identity 20, source 50, fixed 15-minute window',async()=>{
 const db=await ready();try{
  for(let n=0;n<10;n++)assert.equal(await consume(db,100,200),true);
  const snapshot=()=>value(db,"select jsonb_agg(to_jsonb(a) order by key_hash) from csat_internal.auth_attempts a");
  const before=await snapshot();
  await db.exec(sql(migration));assert.deepEqual(await snapshot(),before);
  assert.equal(await value(db,"select count(*)::int from csat_internal.schema_migrations where version='20261024_29'"),1);
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);await assert.rejects(()=>consume(db,100,200),{code:'42501'});await db.exec('reset role');
  }
  await db.exec('set role service_role');
  for(let n=11;n<=20;n++)assert.equal(await consume(db,n+300,200),true,'same identity across different sources: '+n);
  assert.equal(await consume(db,500,200),false,'21st attempt denied');
  await assert.rejects(()=>value(db,'select consume_auth_attempt($1,$2)',['invalid',hash(200)]),{code:'22023'});
  for(let n=1;n<=50;n++)assert.equal(await consume(db,600,700+n),true);
  assert.equal(await consume(db,600,800),false,'51st source attempt denied');
  await assert.rejects(()=>value(db,'select count(*) from csat_internal.auth_attempts'),{code:'42501'});
  await db.exec('reset role');
  assert.equal(new Date(await value(db,'select reset_at from csat_internal.auth_attempts where key_hash=$1',[hash(200)])).getTime(),Date.parse(before.find(r=>r.key_hash===hash(200)).reset_at));
  await db.exec("update csat_internal.auth_attempts set reset_at=now()-interval '1 second'");
  await db.exec('set role service_role');assert.equal(await consume(db,600,200),true);
  await db.exec('reset role');
  assert.equal(await value(db,"select reset_at > now()+interval '14 minutes' and reset_at <= now()+interval '15 minutes' from csat_internal.auth_attempts where key_hash=$1",[hash(200)]),true);
  // Parent lookup uses the same function, including unknown phone numbers.
  await db.exec('set role service_role');
  for(let n=1;n<=21;n++)assert.equal(await value(db,'select start_parent_phone_session($1,$2,$3,$4)',['0999999999',hash(900+n),hash(1000),hash(1100)]),n<=20?'not_found':'rate_limited');
  await db.exec('reset role');
 }finally{await db.close();}
});
