const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,as,id,value}=require('./accounting.test.cjs');
const migration=fs.readFileSync(path.join(__dirname,'../migrations/20260923_22_tutor_profiles.sql'),'utf8');
async function ready(){const db=await setup();await db.exec('reset role');for(const name of fs.readdirSync(path.join(__dirname,'../migrations')).filter(n=>n.endsWith('.sql') && n>'20260908_06_atomic_billing.sql').sort()){if(name.startsWith('20260923_22'))break;await db.exec(fs.readFileSync(path.join(__dirname,'../migrations',name),'utf8'));}return db;}
const body=(extra={})=>({introduction:'Tôi đồng hành cùng học sinh.',major:'Khoa học máy tính',university:'Trường thử nghiệm',achievements:'Thành tích có thật\nDòng thứ hai',avatar_action:'keep',...extra});
const save=(db,rev=0,data=body(),tid=id(20))=>value(db,'select save_tutor_profile($1,$2,$3)',[tid,rev,JSON.stringify(data)]);
async function service(db){await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);await db.exec('set role service_role');}

test('profiles: preserves introductions and accounting; restricts ownership/background; prevents lost updates and legacy writes',async()=>{const db=await ready();try{
 await db.query("insert into tutor_public_profiles(tutor_id,introduction) values($1,'Original intro')",[id(20)]);
 const payments=await value(db,'select jsonb_agg(to_jsonb(p)) from payments p');await db.exec(migration);
 assert.equal(await value(db,'select introduction from tutor_public_profiles where tutor_id=$1',[id(20)]),'Original intro');
 assert.deepEqual(await value(db,'select jsonb_agg(to_jsonb(p)) from payments p'),payments);
 await as(db,'tutor');assert.equal(await value(db,'select count(*)::int from tutor_public_profiles'),1);
 const p=await save(db,1);assert.equal(p.revision,2);assert.match(p.background,/Cựu học sinh/);
 await assert.rejects(()=>save(db,1),/phiên khác/);
 await assert.rejects(()=>save(db,2,body({background:'Forged'})),/Chỉ admin/);
 await assert.rejects(()=>save(db,0,body(),id(21)),/quyền/);
 await assert.rejects(()=>db.exec("update tutor_public_profiles set introduction='Bypass'"),/permission denied/);
 await as(db);const admin=await save(db,2,body({background:'Thông tin ngoại lệ'}));assert.equal(admin.background,'Thông tin ngoại lệ');
 await assert.rejects(()=>value(db,'select admin_learning_settings($1,$2)',['profile',JSON.stringify({tutor_id:id(20),introduction:'Bypass'})]),/theo phiên bản/);
 await assert.rejects(()=>save(db,3,body({major:'x'.repeat(201)})),/check constraint/);
 await assert.rejects(()=>save(db,3,body({name:'Forged'})),/không hợp lệ/);
 await db.exec('reset role');await db.query("update tutors set status='inactive' where tutor_id=$1",[id(20)]);await as(db,'tutor');await assert.rejects(()=>save(db,3),/quyền/);
 await db.exec('reset role;set role anon');await assert.rejects(()=>save(db,3),/permission denied/);
 }finally{await db.close();}});

test('profiles: avatar lifecycle preserves attached files, rejects another tutor asset and retires only replaced images',async()=>{const db=await ready();try{
 await db.exec(migration);const first=id(20)+'/'+id(501)+'.webp',second=id(20)+'/'+id(502)+'.webp',foreign=id(21)+'/'+id(503)+'.webp';
 for(const [p,t] of [[first,id(20)],[second,id(20)],[foreign,id(21)]])await db.query("insert into tutor_avatar_assets(path,tutor_id,state) values($1,$2,'ready')",[p,t]);
 await as(db,'tutor');await assert.rejects(()=>save(db,0,body({avatar_action:'replace',avatar_path:foreign})),/không thuộc/);
 await save(db,0,body({avatar_action:'replace',avatar_path:first}));
 await service(db);assert.equal(await value(db,'select claim_tutor_avatar_cleanup($1)',[first]),false);
 await as(db,'tutor');await assert.rejects(()=>save(db,0,body({avatar_action:'replace',avatar_path:second})),/phiên khác/);
 await service(db);assert.equal(await value(db,'select claim_tutor_avatar_cleanup($1)',[second]),false);
 await as(db,'tutor');await save(db,1,body({avatar_action:'replace',avatar_path:second}));await service(db);
 assert.equal(await value(db,'select claim_tutor_avatar_cleanup($1)',[first]),true);
 await as(db,'tutor');await assert.rejects(()=>save(db,2,body({avatar_action:'replace',avatar_path:first})),/không thuộc/);
 await save(db,2,body({avatar_action:'remove'}));await service(db);assert.equal(await value(db,'select claim_tutor_avatar_cleanup($1)',[second]),true);
 await db.exec('reset role');await db.query("update tutor_avatar_assets set created_at=now()-interval '25 hours' where path=$1",[foreign]);await service(db);assert.equal(await value(db,'select claim_tutor_avatar_cleanup($1)',[foreign]),true);
 }finally{await db.close();}});

test('profiles: parent projection exposes only linked class tutors with defaults, published text and no private contact',async()=>{const db=await ready();try{
 await db.exec(migration);await as(db,'tutor');await save(db);
 await db.exec('reset role');await db.query("insert into parent_accounts(parent_id,display_name,phone) values($1,'Synthetic Parent','0912345678')",[id(80)]);await db.query('insert into parent_student_links(parent_id,student_id) values($1,$2)',[id(80),id(10)]);
 await service(db);await value(db,'select start_parent_lookup($1,$2,$3)',['0912345678','a'.repeat(64),'b'.repeat(64)]);
 const portal=()=>value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(10),'2026-06']);
 let p=await portal();assert.equal(p.tutors[0].tutor_id,id(20));assert.equal(p.tutors[0].introduction,body().introduction);assert.equal(p.tutors[0].major,body().major);assert.equal(p.tutors[0].avatar_path,null);assert.ok(!('email' in p.tutors[0]));assert.ok(!('phone' in p.tutors[0]));
 await assert.rejects(()=>value(db,'select parent_learning_portal($1,$2,$3,0)',['a'.repeat(64),id(11),'2026-06']),/quyền|liên kết/);
 await db.exec('reset role');await assert.rejects(()=>db.exec(migration),/already applied/);await db.exec('rollback');
 }finally{await db.close();}});

test('avatar bucket: repeatable setup blocks direct browser writes even with permissive existing policies',async()=>{const db=await ready();try{
 await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text);alter table storage.objects enable row level security;grant usage on schema storage to anon,authenticated,service_role;grant all on storage.objects to anon,authenticated,service_role;create policy existing_permissive on storage.objects for all to authenticated using(true) with check(true);`);
 const sql=fs.readFileSync(path.join(__dirname,'../verification/20260923_tutor_avatar_storage_setup.sql'),'utf8');await db.exec(sql);await db.exec(sql);await as(db,'tutor');
 await assert.rejects(()=>db.exec("insert into storage.objects(bucket_id) values('tutor-avatars')"),/row-level security/);
 await db.exec("insert into storage.objects(bucket_id) values('another-existing-bucket')");
 await service(db);await db.exec("insert into storage.objects(bucket_id) values('tutor-avatars')");await as(db);
 assert.equal(await value(db,"select count(*)::int from storage.objects where bucket_id='tutor-avatars'"),1);
 await db.exec("delete from storage.objects where bucket_id='tutor-avatars'");assert.equal(await value(db,"select count(*)::int from storage.objects where bucket_id='tutor-avatars'"),1);
 }finally{await db.close();}});
