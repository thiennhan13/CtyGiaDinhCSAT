const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

function fixture(overrides={}) {
  return {
    user:{id:id(1001),app_metadata:{role:'tutor'}},
    tutors:[{tutor_id:id(1),auth_uid:id(1001),status:'active',is_deleted:false}],
    classes:[{class_id:id(10),tutor_id:id(1),start_date:'2026-08-01',end_date:'2026-08-31',csat_fee_per_session:30000}],
    sessions:[{session_id:id(100),class_id:id(10),tutor_id_snapshot:id(1),classes:{tutor_id:id(1)}}],
    class_students:[{class_id:id(10),student_id:id(11),tuition_fee_per_session:100000}],
    session_attendance:[{session_id:id(100),student_id:id(11),tuition_fee_snapshot:100000}],
    writes:[],rpcCalls:[],...overrides,
  };
}
function client(state) {
  return {
    auth:{getUser:async()=>({data:{user:state.user}})},
    rpc:async(name,payload)=>{state.rpcCalls.push({name,payload});return {data:{},error:state.rpcError||null};},
    from(table) {
      const filters=[];
      let operation='select',payload,single=false;
      const chain={
        select(){return chain;},
        eq(key,value){filters.push(row=>row[key]===value);return chain;},
        in(key,value){filters.push(row=>value.includes(row[key]));return chain;},
        single(){single=true;return chain;},
        update(value){operation='update';payload=value;return chain;},
        insert(value){operation='insert';payload=value;return chain;},
        then(resolve,reject){
          return Promise.resolve().then(()=>{
            const data=(state[table]||[]).filter(row=>filters.every(filter=>filter(row)));
            if(operation!=='select')state.writes.push({table,operation,payload});
            return {data:single?(data[0]||null):data,error:state.queryErrors?.[table]||null};
          }).then(resolve,reject);
        },
      };
      return chain;
    },
  };
}
function handler(relative,state) {
  const filename=path.join(root,relative);
  const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod=new Module(filename,module); mod.paths=module.paths;
  const baseRequire=mod.require.bind(mod);
  mod.require=name=>{
    if(name==='next/server')return {NextResponse:{json:(data,init)=>Response.json(data,init)}};
    if(name==='@/lib/supabase/server')return {createClient:async()=>client(state)};
    if(name==='@/lib/supabase/service')return {createAdminClient:()=>client(state)};
    return baseRequire(name);
  };
  mod._compile(compiled,filename);
  return async body=>mod.exports.POST(new Request('https://test.invalid/api',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}));
}
const renew='app/api/tutor/classes/renew/route.ts';
const makeup='app/api/tutor/makeup/route.ts';
const attendance='app/api/attendance/route.ts';
const renewBody={class_id:id(10),new_end_date:'2026-09-30'};
const attendanceBody={sessionId:id(100),attendanceData:[{session_id:id(100),student_id:id(11),status:'absent',tuition_fee_snapshot:1}]};

test('forged user_metadata admin cannot renew another tutor class through service client',async()=>{
  const state=fixture({user:{id:id(1001),app_metadata:{},user_metadata:{role:'admin'}}});
  state.classes[0].tutor_id=id(2);
  assert.equal((await handler(renew,state)(renewBody)).status,403);
  assert.equal(state.writes.length,0);
});
test('legitimate assigned tutor and app_metadata admin retain renewal access',async()=>{
  for (const isAdmin of [false,true]) {
    const state=fixture();
    if(isAdmin){state.user.app_metadata.role='admin';state.classes[0].tutor_id=id(2);}
    assert.equal((await handler(renew,state)(renewBody)).status,200);
    assert.equal(state.writes.length,1);
  }
});
test('disabled tutor cannot use service client routes with a still-valid JWT',async()=>{
  for (const route of [renew,makeup]) {
    const state=fixture();state.tutors[0].status='inactive';
    const body=route===renew?renewBody:{class_id:id(10),date:'2026-09-01',start_time:'18:00',end_time:'19:00'};
    assert.equal((await handler(route,state)(body)).status,403);
    assert.equal(state.writes.length,0);
  }
});
test('attendance endpoint checks ownership even before the manual SQL migration',async()=>{
  const state=fixture({user:{id:id(1001),app_metadata:{},user_metadata:{role:'admin'}}});
  state.sessions[0].classes.tutor_id=id(2);state.sessions[0].tutor_id_snapshot=id(2);
  assert.equal((await handler(attendance,state)(attendanceBody)).status,403);
  assert.equal(state.rpcCalls.length,0);
});
test('attendance endpoint rejects foreign and duplicate students before RPC',async()=>{
  for (const badData of [
    [{session_id:id(100),student_id:id(13),status:'attended'}],
    [attendanceBody.attendanceData[0],attendanceBody.attendanceData[0]],
  ]) {
    const state=fixture();
    const response=await handler(attendance,state)({...attendanceBody,attendanceData:badData});
    assert.ok([400,403].includes(response.status));
    assert.equal(state.rpcCalls.length,0);
  }
});
test('attendance remains compatible before/after migration and ignores a client fee',async()=>{
  const state=fixture();
  assert.equal((await handler(attendance,state)(attendanceBody)).status,200);
  assert.equal(state.rpcCalls[0].payload.p_attendance_data[0].tuition_fee_snapshot,100000);
});
test('database permission and validation errors map to useful HTTP status',async()=>{
  for (const [code,status] of [['42501',403],['22023',400],['P0002',404]]) {
    const state=fixture({rpcError:{code,message:'Expected validation rejection'}});
    assert.equal((await handler(attendance,state)(attendanceBody)).status,status);
  }
});
