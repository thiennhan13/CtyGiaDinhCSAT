const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
process.chdir(root);
fs.mkdirSync(path.join(root,'scratch'),{recursive:true});
const preview=path.join(root,'app/qa-learning-preview'),fixture=path.join(__dirname,'../fixtures/learning-preview.tsx.fixture');
const expected=path.join(root,'app','qa-learning-preview');
if(fs.existsSync(preview))throw Error('Preview route already exists; refusing to overwrite it.');
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const port=s.address().port;await new Promise(r=>s.close(r));return port;}
(async()=>{let server;const stream=fs.createWriteStream(path.join(root,'scratch/learning-ui-server.log'));try{
 fs.mkdirSync(path.join(preview,'[class_id]'),{recursive:true});fs.copyFileSync(fixture,path.join(preview,'[class_id]/page.tsx'));
 const port=await freePort();const origin='http://127.0.0.1:'+port;
 server=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
 server.stdout.pipe(stream,{end:false});server.stderr.pipe(stream,{end:false});
 let ready=false;for(let i=0;i<90;i++){if(server.exitCode!==null)throw Error('Next.js exited; inspect scratch/learning-ui-server.log');try{const r=await fetch(origin+'/qa-learning-preview/20000000-0000-4000-8000-000000000030');if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}
 if(!ready)throw Error('Preview server timeout');
 await new Promise((resolve,reject)=>{const check=spawn(process.execPath,[path.join(__dirname,'learning-ui-check.cjs')],{cwd:root,env:{...process.env,CSAT_UI_QA_ORIGIN:origin},windowsHide:true,stdio:'inherit'});check.on('exit',code=>code===0?resolve():reject(Error('UI checks failed: '+code)));check.on('error',reject);});
}finally{
 if(server?.pid){if(process.platform==='win32'){try{execFileSync('taskkill',['/PID',String(server.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});}catch{}}else server.kill('SIGTERM');}
 stream.end();
 if(path.resolve(preview)===expected && path.dirname(preview)===path.join(root,'app'))fs.rmSync(preview,{recursive:true,force:true});
 const validator=path.join(root,'.next/dev/types/validator.ts');
 if(fs.existsSync(validator) && fs.readFileSync(validator,'utf8').includes('qa-learning-preview'))fs.unlinkSync(validator);
}})().catch(e=>{console.error(e.message);process.exitCode=1;});
