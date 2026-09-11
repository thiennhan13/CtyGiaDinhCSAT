const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,as,id,value}=require('./accounting.test.cjs');
const migration=fs.readFileSync(path.join(__dirname,'../migrations/20260911_16_parent_domestic_phones.sql'),'utf8');
async function ready(){const db=await setup();await db.exec('reset role');for(const file of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>/^202609(08|09|10)_/.test(n)).sort().slice(2))await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',file),'utf8'));return db;}
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}
test('domestic migration preserves identities, links, sessions, accounting and ambiguous source text',async()=>{
const db=await ready();try{
await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'P','+84912345678')",[id(80)]);
await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
await db.query("update students set parent_number='+84 912-345-678' where student_id=$1",[id(10)]);
await db.query("update students set parent_number='Call office' where student_id=$1",[id(11)]);
await service(db);await value(db,'select start_parent_lookup($1,$2,$3)',['+84912345678','a'.repeat(64),'b'.repeat(64)]);
await db.exec('reset role');const before={};for(const table of ['parent_student_links','parent_lookup_sessions','payments'])before[table]=await value(db,'select jsonb_agg(to_jsonb(x)) from '+table+' x');
await db.exec(migration);
for(const table in before)assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(x)) from '+table+' x'),before[table]);
assert.equal(await value(db,'select phone from parent_accounts where parent_id=$1',[id(80)]),'0912345678');
assert.equal(await value(db,'select parent_number from students where student_id=$1',[id(10)]),'0912345678');
assert.equal(await value(db,'select parent_number from students where student_id=$1',[id(11)]),'Call office');
await service(db);assert.equal((await value(db,'select parent_learning_portal($1,null,null,0)',['a'.repeat(64)])).student.student_id,id(10));
for(const [i,p] of ['0912345678','+84912345678','0084912345678','0912 345 678'].entries())assert.equal(await value(db,'select start_parent_lookup($1,$2,$3)',[p,String(i+1).repeat(64),'c'.repeat(64)]),'ok');
await assert.rejects(()=>value(db,'select start_parent_lookup($1,$2,$3)',['912345678','d'.repeat(64),'e'.repeat(64)]),{code:'22023'});
await db.exec('reset role');await assert.rejects(()=>db.exec(migration),/already applied/);await db.exec('rollback');
assert.equal(await value(db,'select count(*)::int from parent_accounts'),1);
}finally{await db.close();}});
test('all parent writes store domestic phones, prevent duplicate forms and keep admin-only grants',async()=>{
const db=await ready();try{await db.exec(migration);await as(db);
const parent=await value(db,'select admin_save_parent_contact(null,$1,$2,$3,true)',['P','+84912345678',[id(10)]]);
assert.equal(await value(db,'select phone from parent_accounts where parent_id=$1',[parent]),'0912345678');
await assert.rejects(()=>value(db,'select admin_save_parent_contact(null,$1,$2,$3,true)',['Other','0912345678',[id(11)]]),{code:'23505'});
await db.query("update students set parent_name='P',parent_number='0084912345678' where student_id=$1",[id(11)]);
const row={student_id:id(11),parent_name:'P',parent_number:'0912345678',phone:'+84912345678'};
assert.deepEqual(await value(db,'select admin_import_parent_contacts($1)',[JSON.stringify([row])]),{created:0,linked:1});
row.phone='0912345678';assert.deepEqual(await value(db,'select admin_import_parent_contacts($1)',[JSON.stringify([row])]),{created:0,linked:0});
await as(db,'tutor');await assert.rejects(()=>value(db,'select admin_import_parent_contacts($1)',[JSON.stringify([row])]),{code:'42501'});
await db.exec('reset role');await db.query("insert into parent_accounts(display_name,phone) values('Direct','+84987654321')");
assert.equal(await value(db,"select phone from parent_accounts where display_name='Direct'"),'0987654321');
await assert.rejects(()=>db.query("insert into parent_accounts(display_name,phone) values('Bad','123')"),{code:'22023'});
assert.equal(await value(db,"select has_function_privilege('anon','public.start_parent_lookup(text,text,text)','execute')"),false);
assert.equal(await value(db,"select has_function_privilege('authenticated','public.admin_import_parent_contacts(jsonb)','execute')"),true);
}finally{await db.close();}});
test('canonical collisions abort the entire migration without modifying old accounts',async()=>{
const db=await ready();try{await db.exec('alter table parent_accounts drop constraint parent_accounts_phone_check');
await db.exec("insert into parent_accounts(display_name,phone) values('A','+84912345678'),('B','0912345678')");
await assert.rejects(()=>db.exec(migration),/collision/);await db.exec('rollback');
assert.equal(await value(db,"select count(*)::int from parent_accounts where phone like '+84%'"),1);
assert.equal(await value(db,"select count(*)::int from csat_internal.schema_migrations where version='20260911_16'"),0);
}finally{await db.close();}});
