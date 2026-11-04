const fs=require('node:fs'),path=require('node:path');
const {setup,as,id,value}=require('./accounting.test.cjs');
const dir=path.join(__dirname,'../migrations');
async function portalDB(last='20261031_31',existing) {
 const db=await setup(existing);await db.exec('reset role');
 await db.exec('alter table auth.users add column phone text, add column banned_until timestamptz; create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));');
 try {
  for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.sql')&&n>'20260908_06_atomic_billing.sql'&&n.slice(0,11)<=last).sort())await db.exec(fs.readFileSync(path.join(dir,name),'utf8'));
  await as(db);return db;
 } catch(e) {await db.close();throw e;}
}
async function parent(db,n=80){
 await db.exec('reset role');
 await db.query("insert into auth.users(id,email,raw_app_meta_data) values($1,$2,'{\"provider\":\"google\",\"providers\":[\"google\"]}') on conflict do nothing",[id(n),`parent${n}@example.test`]);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'authenticated',sub:id(n)})]);await db.exec('set role authenticated');
}
module.exports={portalDB,parent,as,id,value};
