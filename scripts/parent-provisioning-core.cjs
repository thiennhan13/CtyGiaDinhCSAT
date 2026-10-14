// Server-only helper. No credentials or personal data are logged.
async function provisionParents(db, { apply = false, password } = {}) {
  const candidates = await db.rpc('parent_auth_candidates');
  if (candidates.error) throw new Error('candidate_read_failed');
  const rows = candidates.data;
  const blocked = new Set(rows.filter(r => r.issue && r.parent_id).map(r => r.parent_id));
  const grouped = new Map(rows.filter(r => !r.issue && !blocked.has(r.parent_id)).map(r => [r.parent_id, r]));
  const result = { students: rows.length, review: rows.filter(r => r.issue).length, parents: grouped.size, alreadyLinked: 0, created: 0, recovered: 0, failed: 0, pending: 0, apply };
  if (!apply) { result.alreadyLinked = [...grouped.values()].filter(r => r.auth_uid).length; result.pending = grouped.size - result.alreadyLinked; return result; }
  if (typeof password !== 'string' || password.length < 10) throw new Error('initial_password_required');
  const users = [];
  for (let page = 1; ; page++) {
    const r = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (r.error) throw new Error('auth_read_failed');
    users.push(...r.data.users); if (r.data.users.length < 1000) break;
  }
  for (const row of grouped.values()) {
    if (row.auth_uid) { result.alreadyLinked++; continue; }
    const phone = '84' + row.phone.slice(1);
    let user = users.find(u => (u.phone || '').replace(/^\+/, '') === phone);
    if (user && (user.app_metadata?.role !== 'parent' || user.app_metadata?.csat_parent_id !== row.parent_id)) { result.failed++; continue; }
    const recovering = !!user;
    if (!user) {
      const r = await db.auth.admin.createUser({ phone: '+' + phone, password, phone_confirm: true, app_metadata: { role: 'parent', csat_parent_id: row.parent_id } });
      if (r.error || !r.data.user) { result.failed++; continue; }
      user = r.data.user; users.push(user);
    }
    const linked = await db.rpc('link_parent_auth', { p_parent_id: row.parent_id, p_auth_uid: user.id, p_phone: row.phone });
    // A link failure leaves an identifiable Auth user for safe reconciliation.
    // Never delete a user after an uncertain database response or overwrite passwords.
    if (linked.error || linked.data !== true) { result.failed++; continue; }
    if (recovering) result.recovered++; else result.created++;
  }
  return result;
}
module.exports = { provisionParents };
