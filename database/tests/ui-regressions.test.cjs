const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Module=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function load(file){
  const filename=path.join(root,file);const mod=new Module(filename,module);mod.paths=module.paths;
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
  return mod.exports;
}
const {getVietnamMonthRange}=load('lib/calendar.ts');
const {buildAttendanceForm,buildAttendancePayload}=load('lib/attendance-form.ts');
const A={student_id:'A',name:'Student A'},B={student_id:'B',name:'Student B'},C={student_id:'C',name:'Former student'};
const enrolled=[{students:A},{students:[B]}];
const existing=[{student_id:'A',status:'attended',notes:'Original note',students:A},{student_id:'C',status:'absent',notes:null,students:C}];

test('Vietnam calendar dates do not shift across host timezones, leap years or year boundaries',()=>{
  const cases=[
    ['2026-09-06T00:00:00Z','2026-09-01','2026-09-30'],
    ['2026-08-31T16:59:59Z','2026-08-01','2026-08-31'],
    ['2026-08-31T17:00:00Z','2026-09-01','2026-09-30'],
    ['2024-02-15T12:00:00Z','2024-02-01','2024-02-29'],
    ['2026-02-15T12:00:00Z','2026-02-01','2026-02-28'],
    ['2100-02-15T12:00:00Z','2100-02-01','2100-02-28'],
    ['2026-12-31T16:59:59Z','2026-12-01','2026-12-31'],
    ['2026-12-31T17:00:00Z','2027-01-01','2027-01-31'],
  ];
  const previous=process.env.TZ;
  try{for(const zone of ['UTC','Asia/Ho_Chi_Minh','America/Los_Angeles','Pacific/Kiritimati']){
    process.env.TZ=zone;
    for(const [instant,startDate,endDate] of cases) assert.deepEqual(getVietnamMonthRange(new Date(instant)),{startDate,endDate},zone+' '+instant);
  }}finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('late attendance preserves former students and leaves new students undecided',()=>{
  const form=buildAttendanceForm(enrolled,existing);
  assert.deepEqual(form.students,[A,B,C]);
  assert.deepEqual(form.attendance,{A:{status:'attended',notes:'Original note'},B:{status:null,notes:''},C:{status:'absent',notes:''}});
  const payload=buildAttendancePayload('S',form.students,form.attendance);
  assert.deepEqual(payload.map(row=>row.student_id),['A','C']);
  assert.equal(payload[0].notes,'Original note');assert.ok(payload.every(row=>!('tuition_fee_snapshot' in row)));
});
test('a new student is included only after an explicit present/absent selection',()=>{
  const form=buildAttendanceForm(enrolled,existing);
  form.attendance.B.status='absent';form.attendance.B.notes='Selected explicitly';
  assert.deepEqual(buildAttendancePayload('S',form.students,form.attendance).find(r=>r.student_id==='B'),{session_id:'S',student_id:'B',status:'absent',notes:'Selected explicitly'});
});
test('a fresh session does not silently mark the whole roster present',()=>{
  const form=buildAttendanceForm(enrolled,[]);
  assert.ok(Object.values(form.attendance).every(a=>a.status===null));
  assert.throws(()=>buildAttendancePayload('S',form.students,form.attendance),/ít nhất một học sinh/);
});
test('notes without a selection require correction rather than disappearing or creating a fee',()=>{
  const form=buildAttendanceForm(enrolled,existing);form.attendance.B.notes='Needs confirmation';
  assert.throws(()=>buildAttendancePayload('S',form.students,form.attendance),/Student B/);
  assert.equal(form.attendance.B.status,null);
});
test('missing joins and duplicate roster rows retain historical identities exactly once',()=>{
  const form=buildAttendanceForm([{students:null},{students:[]},...enrolled,{students:A}],[...existing,{student_id:'D',status:'attended',notes:'Retained',students:null}]);
  assert.deepEqual(form.students.map(s=>s.student_id),['A','B','C','D']);
  assert.equal(buildAttendancePayload('S',form.students,form.attendance).find(r=>r.student_id==='D').notes,'Retained');
});

// Execute the real component handlers (not copies), with controlled IO and state.
const source=ts.createSourceFile('attendance.tsx',fs.readFileSync(path.join(root,'app/tutor/classes/[class_id]/session/[session_id]/page.tsx'),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function handler(name,context){
  let match;function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===name)match=node;ts.forEachChild(node,visit);}visit(source);
  assert.ok(match,name);const code=ts.transpileModule(match.getText(source),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  return vm.runInNewContext(code+';'+name,{Error,...context});
}
function saveFixture(overrides={}){
  const form=buildAttendanceForm(enrolled,existing);
  const state={busy:false,alerts:[],requests:[],navigation:[],...overrides};
  const context={...form,sessionId:'S',sessionData:{session_id:'S'},loading:false,loadError:'',isSubmittingRef:{current:false},
    buildAttendancePayload,setSubmitting:v=>state.busy=v,
    showAlert:async value=>state.alerts.push(value),router:{push:url=>state.navigation.push(url)},
    fetch:async(url,init)=>{state.requests.push(JSON.parse(init.body));return {ok:true};},...overrides};
  return {state,context,save:handler('handleSave',context)};
}
test('actual save handler excludes undecided rows and clears busy state after success',async()=>{
  const f=saveFixture();await f.save();
  assert.deepEqual(f.state.requests[0].attendanceData.map(a=>a.student_id),['A','C']);
  assert.equal(f.state.busy,false);assert.equal(f.context.isSubmittingRef.current,false);assert.equal(f.state.navigation.length,1);
});
test('payload validation errors release the actual submit guard before a retry',async()=>{
  const f=saveFixture();f.context.attendance.B.notes='Unselected note';await f.save();
  assert.equal(f.state.requests.length,0);assert.match(f.state.alerts[0].description,/Student B/);
  assert.equal(f.state.busy,false);assert.equal(f.context.isSubmittingRef.current,false);
  f.context.attendance.B.notes='';await f.save();assert.equal(f.state.requests.length,1);
});
test('network failures, non-JSON errors and closed-period errors never leave submit stuck',async()=>{
  for(const fetch of [async()=>{throw new Error('Network failure');},async()=>({ok:false,json:async()=>{throw new Error('Bad JSON');}}),async()=>({ok:false,json:async()=>({error:'Buổi học đã chốt kỳ.'})})]){
    const f=saveFixture({fetch});await f.save();assert.equal(f.state.busy,false);assert.equal(f.context.isSubmittingRef.current,false);assert.equal(f.state.navigation.length,0);assert.equal(f.state.alerts[0].variant,'error');
  }
});
test('rapid repeated save sends only one request and cannot save incomplete loading state',async()=>{
  let finish,count=0;const f=saveFixture({fetch:()=>{count++;return new Promise(resolve=>{finish=resolve;});}});
  const first=f.save();await f.save();assert.equal(count,1);finish({ok:true});await first;
  for(const extra of [{loading:true},{loadError:'Offline'},{sessionData:null}]){
    const guarded=saveFixture(extra);await guarded.save();assert.equal(guarded.state.requests.length,0);
  }
});
test('actual loader refuses partial data, clears stale records and recovers on retry',async()=>{
  const state={};let failure=true;
  const data={sessions:{session_id:'S'},class_students:enrolled,session_attendance:existing};
  const supabase={from(table){const q={select(){return q;},eq(){return q;},single(){return q;},then(resolve,reject){return Promise.resolve({data:data[table],error:failure&&table==='session_attendance'?{message:'Offline'}:null}).then(resolve,reject);}};return q;}};
  const load=handler('fetchData',{supabase,classId:'C',sessionId:'S',loadSequence:{current:0},buildAttendanceForm,
    setLoading:v=>state.loading=v,setLoadError:v=>state.error=v,setSessionData:v=>state.session=v,setStudents:v=>state.students=v,setAttendance:v=>state.attendance=v});
  await load();assert.equal(state.loading,false);assert.ok(state.error);assert.equal(state.students.length,0);assert.equal(state.session,null);
  failure=false;await load();assert.equal(state.error,'');assert.equal(state.students.length,3);assert.equal(state.attendance.B.status,null);
});
test('late responses from a previous route cannot overwrite the current attendance form',async()=>{
  let release;const state={};const sequence={current:0};
  const supabase={from(table){const q={select(){return q;},eq(){return q;},single(){return q;},then(resolve,reject){return new Promise(r=>{if(table==='sessions')release=()=>r({data:{session_id:'Old'},error:null});else r({data:[],error:null});}).then(resolve,reject);}};return q;}};
  const load=handler('fetchData',{supabase,classId:'C',sessionId:'S',loadSequence:sequence,buildAttendanceForm,
    setLoading:v=>state.loading=v,setLoadError:v=>state.error=v,setSessionData:v=>state.session=v,setStudents(){},setAttendance(){}});
  const pending=load();await new Promise(r=>setImmediate(r));sequence.current++;state.session={session_id:'New'};release();await pending;
  assert.equal(state.session.session_id,'New');
});
