// Starts an isolated localhost preview; all auth/business data are synthetic.
const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
(async()=>{let server;fs.mkdirSync(path.join(root,'scratch'),{recursive:true});const log=fs.createWriteStream(path.join(root,'scratch/email-ui-server.log'));try{
 const port=await freePort(),origin='http://127.0.0.1:'+port;
 const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-preview-placeholder',SUPABASE_SERVICE_ROLE_KEY:'local-preview-placeholder',APP_ORIGIN:origin,CONSULTATIONS_ENABLED:'false',CONSULTATIONS_EMAIL_ENABLED:'false',VERCEL_ENV:'development'};
 server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});server.stdout.pipe(log,{end:false});server.stderr.pipe(log,{end:false});
 let ready=false;for(let n=0;n<60;n++){if(server.exitCode!==null)throw Error('Preview exited');try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}if(!ready)throw Error('Preview timeout');
 await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(__dirname,'check-email-operations.cjs')],{cwd:root,env:{...env,CSAT_UI_QA_ORIGIN:origin,PLAYWRIGHT_MODULE:process.env.PLAYWRIGHT_MODULE||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')},windowsHide:true,stdio:'inherit'});child.on('exit',code=>code===0?resolve():reject(Error('Email UI check failed')));child.on('error',reject);});
 }finally{if(server?.pid){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});}catch{}}else server.kill('SIGTERM');}log.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
