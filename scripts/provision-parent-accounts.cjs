// Run with Node 24 and explicitly supplied environment. Never auto-load production .env.
const { createClient } = require('@supabase/supabase-js');
const { provisionParents } = require('./parent-provisioning-core.cjs');
async function main() {
  if (process.versions.node.split('.')[0] !== '24') throw new Error('node_24_required');
  const args = process.argv.slice(2);
  if (args.some(a => a !== '--apply' && !a.startsWith('--project-ref='))) throw new Error('unsupported_argument');
  const apply = args.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('server_environment_required');
  const target = new URL(url);
  if (target.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(target.hostname)) throw new Error('secure_endpoint_required');
  const expected = args.find(a => a.startsWith('--project-ref='))?.slice(14);
  if (apply && (!expected || expected !== target.hostname.split('.')[0])) throw new Error('project_confirmation_required');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await provisionParents(db, { apply, password: process.env.CSAT_PARENT_INITIAL_PASSWORD });
  console.log(JSON.stringify(result, null, 2));
  if (result.failed) process.exitCode = 1;
}
main().catch(() => { console.error('Không hoàn tất cấp tài khoản. Kiểm tra runtime, project, cấu hình và danh sách đối soát trong admin; không gửi log chứa hồ sơ hoặc secret.'); process.exitCode = 1; });
