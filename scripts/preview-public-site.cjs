// Preview public pages without connecting to the project's real Supabase or sending email.
const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const child=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3100'],{
 cwd:root,stdio:'inherit',windowsHide:true,
 env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-preview-placeholder',SUPABASE_SERVICE_ROLE_KEY:'local-preview-placeholder',APP_ORIGIN:'http://127.0.0.1:3100',CONSULTATIONS_ENABLED:'false',CONSULTATIONS_EMAIL_ENABLED:'false'},
});
child.on('error',()=>{console.error('Cannot start local public preview.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code||0;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
