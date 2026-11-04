const {test}=require('node:test'),assert=require('node:assert/strict');
const {resetConnection}=require('../portal-reset.cjs');
test('reset pins the effective database target and TLS even when URL parameters could override pg settings',()=>{
 const ref='abcdefghijklmnopqrst';
 const fixtureURL=(host,user)=>{const url=new URL(`postgresql://${host}:5432/postgres`);url.username=user;url.password='fixture-only';return url.toString();};
 const base=fixtureURL(`db.${ref}.supabase.co`,'postgres');
 for(const query of ['', '?sslmode=require','?sslmode=verify-full']){
  const config=resetConnection(base+query,ref);
  assert.equal(config.host,`db.${ref}.supabase.co`);assert.equal(config.user,'postgres');assert.equal(config.database,'postgres');
  assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.connectionString,undefined);
 }
 for(const query of ['?host=other.test','?user=postgres.otherproject','?sslmode=no-verify','?ssl=0','?sslmode=disable','?sslmode=require&uselibpqcompat=true','?sslrootcert=untrusted.pem'])assert.throws(()=>resetConnection(base+query,ref));
 assert.throws(()=>resetConnection(base,'xxxxxxxxxxxxxxxxxxxx'));
 assert.throws(()=>resetConnection(base.replace(/\/postgres$/,'/other'),ref));
 const pooled=fixtureURL('aws-0-example.pooler.supabase.com','postgres.'+ref);
 assert.equal(resetConnection(pooled,ref).user,'postgres.'+ref);
 assert.throws(()=>resetConnection(pooled.replace('postgres.'+ref,'postgres.xxxxxxxxxxxxxxxxxxxx'),ref));
});
