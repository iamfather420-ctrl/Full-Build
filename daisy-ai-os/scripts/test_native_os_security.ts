import assert from 'node:assert/strict';
import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PermissionKernel, signHumanAuthorization } from '../src/native-os/permissions/PermissionKernel.ts';
import { ProcessLayer } from '../src/native-os/process/ProcessLayer.ts';
import { SystemTools } from '../src/native-os/system-tools/SystemTools.ts';
import { LocalInferenceRuntime } from '../../src/inference/LocalInferenceRuntime.ts';

async function verifyLocalEngineDoesNotInheritProviderKeys() {
  if (process.platform === 'win32') return;
  const directory=await mkdtemp(path.join(os.tmpdir(),'daisy-local-inference-'));
  const modelPath=path.join(directory,'model.gguf');
  const enginePath=path.join(directory,'local-engine.sh');
  const oldKeys={openai:process.env.OPENAI_API_KEY,gemini:process.env.GEMINI_API_KEY,google:process.env.GOOGLE_API_KEY};
  try {
    await writeFile(modelPath,'test-only local model placeholder');
    await writeFile(enginePath,"#!/bin/sh\nif [ -n \"${OPENAI_API_KEY:-}\" ] || [ -n \"${GEMINI_API_KEY:-}\" ] || [ -n \"${GOOGLE_API_KEY:-}\" ]; then printf 'PROVIDER_KEY_LEAKED'; else printf 'LOCAL_ENGINE_NO_PROVIDER_SECRETS'; fi\n");
    await chmod(enginePath,0o700);
    process.env.OPENAI_API_KEY='test-sentinel-openai';
    process.env.GEMINI_API_KEY='test-sentinel-gemini';
    process.env.GOOGLE_API_KEY='test-sentinel-google';
    const runtime=new LocalInferenceRuntime({modelPath,enginePath});
    const result=await runtime.generate({messages:[{role:'user',content:'local test'}],timeoutMs:5_000});
    assert.equal(result.status,'OK');
    assert.equal(result.text,'LOCAL_ENGINE_NO_PROVIDER_SECRETS','A local engine must not inherit parent AI-provider credentials.');
  } finally {
    if(oldKeys.openai===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKeys.openai;
    if(oldKeys.gemini===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKeys.gemini;
    if(oldKeys.google===undefined)delete process.env.GOOGLE_API_KEY;else process.env.GOOGLE_API_KEY=oldKeys.google;
    await rm(directory,{recursive:true,force:true});
  }
}

async function verifyQwen3UsesOfflineChatML() {
  if (process.platform === 'win32') return;
  const directory=await mkdtemp(path.join(os.tmpdir(),'daisy-qwen3-local-'));
  const modelPath=path.join(directory,'qwen3.gguf');
  const enginePath=path.join(directory,'llama-cli');
  try {
    await writeFile(modelPath,'test-only local model placeholder');
    await writeFile(enginePath,"#!/bin/sh\nprompt=''\noffline=0\nsingle=0\nnoecho=0\nnoescape=0\nwhile [ \"$#\" -gt 0 ]; do\n  case \"$1\" in\n    --prompt) shift; prompt=$1 ;;\n    --offline) offline=1 ;;\n    --single-turn) single=1 ;;\n    --no-display-prompt) noecho=1 ;;\n    --no-escape) noescape=1 ;;\n  esac\n  shift\ndone\n[ \"$offline\" = 1 ] && [ \"$single\" = 1 ] && [ \"$noecho\" = 1 ] && [ \"$noescape\" = 1 ] || exit 21\ncase \"$prompt\" in *'<|im_start|>system'*'/no_think'*'<|im_start|>user'*'<|im_start|>assistant'*) ;; *) exit 22 ;; esac\nprintf 'llama.cpp banner\\n> %sQWEN3_LOCAL_RUNTIME_OK<|im_end|>\\n[ Prompt: 1 t/s ]\\nExiting...\\n' \"$prompt\"\n");
    await chmod(enginePath,0o700);
    const runtime=new LocalInferenceRuntime({modelPath,enginePath,modelId:'qwen3-1.7b-q4_k_m',modelVersion:'test-q4'});
    const result=await runtime.generate({messages:[{role:'system',content:'You are Daisy.'},{role:'user',content:'Say hello.'}],timeoutMs:5_000});
    assert.equal(result.status,'OK');
    assert.equal(result.text,'QWEN3_LOCAL_RUNTIME_OK','Qwen3 must receive ChatML/offline CLI flags and suppress llama.cpp banners/prompt echoes.');
  } finally {
    await rm(directory,{recursive:true,force:true});
  }
}

async function main() {
  const secret = 'test-only-permission-signing-secret-32-bytes';
  const kernel = new PermissionKernel(secret);
  const impersonation = kernel.request('daisy','tool:proc_status','execute');
  assert.equal(impersonation.granted,false,'A privileged-looking subject string must not grant access.');

  const now = Date.now();
  const authorizationInput = {
    authorizationId:'test-auth-001',actor:'operator-test',actorType:'human' as const,
    subject:'operator-test',resource:'tool:proc_status',action:'execute' as const,
    issuedAtMs:now,expiresAtMs:now+60_000,
  };
  const authorization = signHumanAuthorization(authorizationInput,secret);
  const first = kernel.request('operator-test','tool:proc_status','execute',authorization,now);
  assert.equal(first.granted,true,'A valid scoped human authorization should be accepted once.');
  const replay = kernel.request('operator-test','tool:proc_status','execute',authorization,now);
  assert.equal(replay.granted,false,'A consumed authorization must not be replayable in this process.');

  const mismatch = signHumanAuthorization({...authorizationInput,authorizationId:'test-auth-002',resource:'tool:mem_summary'},secret);
  assert.equal(kernel.request('operator-test','tool:proc_status','execute',mismatch,now).granted,false,'An authorization for another resource must be rejected.');
  const expired = signHumanAuthorization({...authorizationInput,authorizationId:'test-auth-003',issuedAtMs:now-120_000,expiresAtMs:now-60_000},secret);
  assert.equal(kernel.request('operator-test','tool:proc_status','execute',expired,now).granted,false,'Expired authorizations must be rejected.');
  assert.equal(new PermissionKernel(null).request('daisy','tool:mem_summary','execute').granted,false,'Missing secret must fail closed.');
  assert.equal(new PermissionKernel(null).request('guest','public:status','read').granted,true,'Public read-only resources remain readable.');

  const processes = new ProcessLayer();
  const toolsWithoutAuth = new SystemTools(new PermissionKernel(null),processes);
  const denied = toolsWithoutAuth.invoke('daisy','proc_status');
  assert.equal(denied.status,'DENIED');
  assert.equal(denied.result,null);

  const tools = new SystemTools(new PermissionKernel(secret),processes);
  const memoryAuthorization = signHumanAuthorization({
    authorizationId:'test-auth-memory',actor:'operator-test',actorType:'human',
    subject:'operator-test',resource:'tool:mem_summary',action:'execute',
    issuedAtMs:now,expiresAtMs:now+60_000,
  },secret);
  const memory = tools.invoke('operator-test','mem_summary',{},memoryAuthorization);
  assert.equal(memory.status,'EXECUTED');
  assert.equal(typeof (memory.result as {rss_bytes?:unknown}).rss_bytes,'number','Memory values must come from the actual Node process.');
  await verifyLocalEngineDoesNotInheritProviderKeys();
  await verifyQwen3UsesOfflineChatML();

  const listAuthorization = signHumanAuthorization({
    authorizationId:'test-auth-fs-list',actor:'operator-test',actorType:'human',
    subject:'operator-test',resource:'tool:fs_list',action:'execute',
    issuedAtMs:now,expiresAtMs:now+60_000,
  },secret);
  const fsList = tools.invoke('operator-test','fs_list',{},listAuthorization);
  assert.equal(fsList.status,'NOT_IMPLEMENTED','Unbound filesystem access must be explicitly unavailable.');
  assert.equal(fsList.result,null,'The unimplemented tool must not return invented paths.');

  delete process.env.SOLVEX_SOURCE_COMMIT;
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  delete process.env.GITHUB_SHA;
  const { DaisyActivationGate: nativeActivationGate } = await import('../src/brain/DaisyActivationGate.ts');
  assert.equal(nativeActivationGate.isActive(),false,'The native module must not ship embedded ACTIVE evidence.');
  const { DaisyRuntime } = await import('../src/native-os/runtime/DaisyRuntime.ts');
  const runtime = DaisyRuntime.getInstance('linux');
  assert.equal(runtime.boot().activation,'BLOCKED','Missing source-bound verification must not activate the OS.');
  assert.equal(runtime.claimScope(),'BLOCKED','A blocked runtime must not claim local/production verification.');

  process.env.DAISY_MODEL_PATH=path.join(os.tmpdir(),`daisy-no-weights-${process.pid}.gguf`);
  process.env.DAISY_INFERENCE_ENGINE='';
  const { createDaisyNativeServer } = await import('../server.mjs');
  const server = createDaisyNativeServer();
  await new Promise<void>((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>resolve());
  });
  try {
    const address=server.address();
    assert.ok(address&&typeof address==='object');
    assert.equal(address.address,'127.0.0.1','The native server must bind to loopback only.');
    const origin=`http://127.0.0.1:${address.port}`;
    const page=await fetch(origin+'/');
    assert.equal(page.status,200,'The local UI must be served by the native server.');
    assert.match(page.headers.get('content-security-policy')||'',/default-src \'self\'/);
    assert.match(await page.text(),/external AI provider/);
    const health=await fetch(origin+'/api/health');
    const healthJson=await health.json() as {ok:boolean;inference:{ready:boolean};runtime:{activation:string};claimScope:string};
    assert.equal(health.status,200);
    assert.equal(health.headers.get('access-control-allow-origin'),null,'The local server must not expose permissive CORS.');
    assert.equal(healthJson.ok,true);
    assert.equal(healthJson.inference.ready,false,'Missing local model/engine must remain blocked.');
    const registryResponse=await fetch(origin+'/api/models');
    const registryJson=await registryResponse.json() as {ok:boolean;ready:boolean;models:Array<{id:string;weights:{status:string};engine:{status:string};expectedSha256:string}>};
    assert.equal(registryResponse.status,200);
    assert.equal(registryJson.ok,true);
    assert.equal(registryJson.ready,false);
    assert.equal(registryJson.models[0]?.weights.status,'not_installed');
    assert.equal(registryJson.models[0]?.expectedSha256,'b139949c5bd74937ad8ed8c8cf3d9ffb1e99c866c823204dc42c0d91fa181897');
    assert.equal(JSON.stringify(registryJson).includes('/home/ubuntu'),false,'The registry must not expose local filesystem paths.');
    const chat=await fetch(origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'hello'}]})});
    const chatJson=await chat.json() as {ok:boolean;status?:string;code?:string;text?:string};
    assert.equal(chat.status,503);
    assert.equal(chatJson.ok,false);
    assert.equal(chatJson.code,'FIRST_PARTY_MODEL_UNAVAILABLE');
    assert.equal(chatJson.text,undefined,'Unavailable local AI must not fabricate a response.');
    const noAuth=await fetch(origin+'/api/tools/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:'daisy',tool:'proc_status'})});
    assert.equal(noAuth.status,403,'The HTTP tools route must not grant access by subject string.');
    const oversized=await fetch(origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:'x'.repeat(70_000)}]})});
    assert.equal(oversized.status,413,'The server must enforce a bounded request body.');
    const arbitraryPath=await fetch(origin+'/server.mjs');
    assert.equal(arbitraryPath.status,404,'Static serving must remain allowlisted.');
  } finally {
    await new Promise<void>((resolve,reject)=>server.close((error)=>error?reject(error):resolve()));
  }

  console.log('PASS: local OS serves its UI on loopback, blocks unsigned/replayed grants, reports real process memory, disables unsupported tools, and returns no synthetic or external-AI chat reply.');
}

main().catch((error)=>{
  console.error(error);
  process.exitCode=1;
});
