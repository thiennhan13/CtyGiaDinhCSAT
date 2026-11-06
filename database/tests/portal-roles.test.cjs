const { test } = require('node:test');
const assert = require('node:assert/strict');
const { portalDB, parent, as, id, value } = require('./portal-upgrade-helper.cjs');

test('exclusive roles deny stale staff claims, keep parent links and recheck OJ actors', async () => {
  const db = await portalDB('20261105_33');
  try {
    await db.exec('reset role');
    await db.query("update auth.users set raw_app_meta_data=jsonb_build_object('role',case when id=$1 then 'admin' else 'tutor' end,'provider','google')", [id(1)]);
    await as(db);
    const parentId = await value(db, "select admin_save_parent(null,'Parent','0912345678',$1,true,null)", [id(10)]);
    await parent(db);
    assert.equal((await value(db, "select claim_parent_phone('0912345678')")).state, 'active');
    const before = await value(db, 'select parent_access()');
    assert.equal((await value(db, 'select parent_portal()')).student.student_id, id(10));
    await db.exec('reset role');
    await db.query("update auth.users set raw_app_meta_data=raw_app_meta_data||'{\"role\":\"tutor\"}' where id=$1", [id(80)]);
    await parent(db);
    assert.equal((await value(db, 'select parent_access()')).state, 'unlinked');
    await assert.rejects(() => value(db, 'select parent_portal()'), { code: '42501' });
    await assert.rejects(() => value(db, "select claim_parent_phone('0912345678')"), { code: '42501' });
    await as(db);
    await assert.rejects(() => value(db, 'select admin_transfer_parent($1,$2,$3,$4)', [parentId, id(2), before.revision, 'Fixture transfer']), {code:'22023'});
    assert.deepEqual(await value(db, "select admin_parent_google_candidates('parent80@example.test')"), []);
    // Service OJ reads reconstruct permissions from the current Auth record.
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claims',$1,false)", [JSON.stringify({role:'service_role'})]);
    await db.exec('set role service_role');
    await assert.rejects(() => value(db, 'select oj_account_context($1,null,$2)', [id(10), id(80)]), {code:'42501'});
    assert.equal((await value(db, 'select oj_account_context($1,null,$2)', [id(10), id(1)])).mapping, null);
    assert.equal((await value(db, 'select oj_account_context($1,null,$2)', [id(10), id(2)])).mapping, null);
    await as(db, 'tutor');
    assert.equal(await value(db, 'select current_tutor_id()'), id(20));
    await db.exec('reset role');
    await db.query("update auth.users set raw_app_meta_data='{\"provider\":\"google\"}' where id=$1", [id(2)]);
    await as(db, 'tutor');
    assert.equal(await value(db, 'select current_tutor_id()'), null);
    assert.equal(Number(await value(db, 'select count(*) from classes')), 0);
    await db.exec('reset role');
    await db.query("update auth.users set banned_until=now()+interval '1 day' where id=$1", [id(1)]);
    await as(db);
    assert.equal(await value(db, 'select is_admin()'), false);
    // No migration deletes historical links or silently transfers ownership.
    await db.exec('reset role');
    assert.equal(Number(await value(db, 'select count(*) from parent_identity_links')), 1);
    await db.query("update auth.users set raw_app_meta_data='{\"provider\":\"google\"}' where id=$1", [id(80)]);
    await parent(db);
    assert.deepEqual(await value(db, 'select parent_access()'), before);
  } finally { await db.close(); }
});

test('English registration URLs and existing requests stay valid after migration 34', async () => {
 const db=await portalDB('20261105_34');
 try {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({role:'service_role'})]);
  await db.exec('set role service_role');
  const urls=['/','/enroll','/roadmap','/roadmap/a','/dang-ky-hoc','/lo-trinh/b'];
  for (const [index,source_path] of urls.entries()) {
   const payload={schema_version:2,role:'parent',name:'Fixture Parent',phone:'09123456'+String(index+10),email:'',level:'thcs',course:'B',goal:'beginner',background:'none',school_year:'8',message:'',source_path,consent:true};
   const args=[id(901+index),JSON.stringify(payload),String(index+1).repeat(64)];
   assert.equal(await value(db,'select submit_registration($1,$2,$3)',args),args[0]);
   assert.equal(await value(db,'select submit_registration($1,$2,$3)',args),args[0]);
   await assert.rejects(()=>value(db,'select submit_registration($1,$2,$3)',[id(951+index),JSON.stringify({...payload,source_path:'/roadmap/invalid'}),args[2]]),{code:'22023'});
  }
 } finally {await db.close();}
});
