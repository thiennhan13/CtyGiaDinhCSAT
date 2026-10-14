const {test}=require('node:test');
const assert=require('node:assert/strict');
const {provisionParents}=require('../../scripts/parent-provisioning-core.cjs');
function fixture(){
 const rows=[{student_id:'child-1',parent_id:'parent-1',phone:'0912345678',auth_uid:null,issue:null},{student_id:'child-2',parent_id:'parent-1',phone:'0912345678',auth_uid:null,issue:null},{student_id:'child-3',parent_id:null,issue:'missing_contact'}];
 const users=[],calls=[];let fail=false;
 const db={rpc:async(name,args)=>{calls.push(name);if(name==='parent_auth_candidates')return {data:rows};if(fail)return {error:{code:'timeout'}};for(const row of rows)if(row.parent_id===args.p_parent_id)row.auth_uid=args.p_auth_uid;return {data:true};},auth:{admin:{listUsers:async()=>({data:{users}}),createUser:async(args)=>{calls.push('create');const user={id:'auth-1',phone:args.phone,app_metadata:args.app_metadata};users.push(user);return {data:{user}};}}}};
 return {db,rows,users,calls,fail(value){fail=value;}};
}
test('provisioning dry-run groups siblings and does not invoke Auth writes',async()=>{
 const f=fixture(),r=await provisionParents(f.db);assert.equal(r.parents,1);assert.equal(r.students,3);assert.equal(r.review,1);assert.equal(r.pending,1);assert.deepEqual(f.calls,['parent_auth_candidates']);
});
test('provisioning recovers a failed Auth–DB link, never resets or deletes users, and reruns safely',async()=>{
 const f=fixture();f.fail(true);assert.equal((await provisionParents(f.db,{apply:true,password:'synthetic-only'})).failed,1);assert.equal(f.users.length,1);
 f.fail(false);assert.equal((await provisionParents(f.db,{apply:true,password:'synthetic-only'})).recovered,1);
 assert.equal((await provisionParents(f.db,{apply:true,password:'another-value'})).alreadyLinked,1);assert.equal(f.calls.filter(x=>x==='create').length,1);
});
test('provisioning refuses conflicting identities and any sibling requiring review',async()=>{
 const f=fixture();f.users.push({phone:'84912345678',app_metadata:{role:'tutor'}});assert.equal((await provisionParents(f.db,{apply:true,password:'synthetic-only'})).failed,1);assert.ok(!f.calls.includes('link_parent_auth'));
 f.rows[1].issue='missing_link';assert.equal((await provisionParents(f.db)).parents,0);
});
