const $=(id)=>document.getElementById(id);
const state={messages:[],ready:false,busy:false};
const form=$('chat-form'),prompt=$('prompt'),send=$('send'),messages=$('messages'),notice=$('notice');
function appendMessage(role,text){
  $('empty-state')?.remove();
  const item=document.createElement('div');
  item.className=`message ${role}`;
  item.textContent=text;
  messages.append(item);
  messages.scrollTop=messages.scrollHeight;
}
function setBusy(busy){state.busy=busy;send.disabled=busy||!state.ready;send.querySelector('span:first-child').textContent=busy?'Thinking…':'Send';}
function showBlocked(message){notice.textContent=message;}
async function refreshHealth(){
  $('state-label').textContent='Checking local runtime…';
  $('state-dot').className='dot';
  try{
    const response=await fetch('/api/health',{headers:{Accept:'application/json'},cache:'no-store'});
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error(data.error||'Local runtime is unavailable.');
    const inference=data.inference||{};
    state.ready=inference.ready===true;
    $('state-label').textContent=state.ready?'Local model configured':'Local model unavailable';
    $('state-dot').className=`dot ${state.ready?'ready':'blocked'}`;
    $('claim-chip').textContent=data.claimScope||'BLOCKED';
    $('claim-chip').className=`chip ${data.claimScope==='BLOCKED'?'blocked':'ready'}`;
    $('activation').textContent=data.runtime?.activation||'UNKNOWN';
    $('claim-scope').textContent=data.claimScope||'UNKNOWN';
    $('inference-state').textContent=state.ready?'LOCAL ENGINE READY':'BLOCKED · MODEL/ENGINE REQUIRED';
    $('model-id').textContent=inference.modelId||'Not configured';
    $('runtime-note').textContent=inference.notes||'No runtime details returned.';
    $('updated').textContent=`Updated ${new Date().toLocaleTimeString()}`;
    send.disabled=!state.ready||state.busy;
    prompt.disabled=!state.ready||state.busy;
    if(!state.ready)showBlocked('Chat is blocked until a local model file and local inference executable are configured. No external provider will be used.');
    else if(notice.textContent.startsWith('Chat is blocked'))notice.textContent='';
  }catch(error){
    state.ready=false;
    send.disabled=true;prompt.disabled=true;
    $('state-label').textContent='Local server unavailable';
    $('state-dot').className='dot blocked';
    $('claim-chip').textContent='OFFLINE';$('claim-chip').className='chip blocked';
    $('inference-state').textContent='Unavailable';
    $('runtime-note').textContent=error instanceof Error?error.message:'Unable to reach the local server.';
    $('updated').textContent='Not connected';
    showBlocked('This page needs the Daisy local server at 127.0.0.1. No remote service is contacted.');
  }
}
form.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const text=prompt.value.trim();
  if(!text||!state.ready||state.busy)return;
  const next=[...state.messages,{role:'user',content:text}].slice(-12);
  appendMessage('user',text);
  state.messages=next;
  prompt.value='';
  notice.textContent='';
  setBusy(true);
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({messages:state.messages}),cache:'no-store'});
    const data=await response.json();
    if(!response.ok||!data.ok){showBlocked(`Local inference blocked (${data.code||response.status}): ${data.error||'No reply was generated.'}`);return;}
    const answer=String(data.text||'').trim();
    if(!answer){showBlocked('The local inference engine returned no text. No response was substituted.');return;}
    appendMessage('assistant',answer);
    state.messages=[...state.messages,{role:'assistant',content:answer}].slice(-12);
  }catch(error){showBlocked(`Local inference request failed: ${error instanceof Error?error.message:'unknown error'}. No external fallback was attempted.`);}
  finally{setBusy(false);prompt.focus();}
});
$('refresh').addEventListener('click',()=>void refreshHealth());
void refreshHealth();
