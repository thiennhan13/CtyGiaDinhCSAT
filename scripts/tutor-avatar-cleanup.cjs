// Read-only by default. No secrets, object paths, or personal data in output.
const {createClient}=require('@supabase/supabase-js');
async function main(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw Error('Missing Supabase configuration. Supply environment securely.');
 const apply=process.argv.includes('--apply'),expected=process.argv.find(a=>a.startsWith('--project='))?.slice(10);
 if(apply&&expected!==new URL(url).hostname)throw Error('Use --project=<exact Supabase hostname> with --apply after approval.');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),cutoff=new Date(Date.now()-86400000).toISOString();
 const {data,error}=await db.from('tutor_avatar_assets').select('path,state,created_at').or(`state.in.(retired,deleting),and(state.in.(pending,ready),created_at.lt.${cutoff})`).order('created_at').limit(500);
 if(error)throw Error('Cannot list cleanup registry.');
 let deleted=0,failed=0,skipped=0;
 if(apply)for(const item of data){
  const claim=await db.rpc('claim_tutor_avatar_cleanup',{p_path:item.path});
  if(claim.error){failed++;continue;}if(!claim.data){skipped++;continue;}
  const removed=await db.storage.from('tutor-avatars').remove([item.path]);
  if(removed.error){failed++;continue;}
  const result=await db.from('tutor_avatar_assets').delete().eq('path',item.path).eq('state','deleting');
  if(result.error)failed++;else deleted++;
 }
 console.log(JSON.stringify({mode:apply?'apply':'dry-run',candidates:data.length,deleted,failed,skipped,batchLimit:500}));
 if(failed)process.exitCode=1;
}
main().catch(()=>{console.error('Avatar cleanup did not complete. Check configuration, approval and database/Storage availability.');process.exitCode=1;});
