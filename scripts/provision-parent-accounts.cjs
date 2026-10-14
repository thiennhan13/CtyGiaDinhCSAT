// Historical filename retained for operators; Auth provisioning is retired.
// Explicit environment only. This command now reads aggregate contact readiness.
const { createClient } = require('@supabase/supabase-js');
async function main() {
 if(process.versions.node.split('.')[0]!=='24')throw new Error('node_24_required');
 if(process.argv.length>2)throw new Error('provisioning_retired');
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('environment_required');
 const target=new URL(url);
 if(target.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(target.hostname))throw new Error('secure_endpoint_required');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await db.rpc('parent_contact_candidates');
 if(error||!Array.isArray(data))throw new Error('contact_read_unavailable');
 console.log(JSON.stringify({students:data.length,ready:data.filter(r=>!r.issue).length,review:data.filter(r=>r.issue).length,readOnly:true}));
}
main().catch(()=>{console.error('Đã ngừng cấp Auth phụ huynh. Chỉ chạy không tham số để đối soát sau migration 27; kiểm tra Node24 và cấu hình riêng.');process.exitCode=1;});
