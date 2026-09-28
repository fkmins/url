<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="robots" content="noindex">
<title>Linker Workspace</title><link rel="icon" href="https://files.catbox.moe/dkajo4.png">
<link rel="preconnect" href="https://script.google.com"><link rel="preconnect" href="https://accounts.google.com">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; frame-src https://accounts.google.com/gsi/; img-src 'self' data: https:; connect-src https://script.google.com https://*.googleusercontent.com https://accounts.google.com/gsi/;">
<link rel="stylesheet" href="styles.css"><script src="https://accounts.google.com/gsi/client" async defer></script>
<script>if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});</script>
<style>*,*::before,*::after{box-sizing:border-box}body{font-family:system-ui,sans-serif;margin:0;padding:0;min-height:100vh;overflow-y:auto;overflow-x:hidden;background:#0a0a0a}.bg-wolf{position:fixed;inset:0;z-index:-2;background:radial-gradient(circle at 50% 20%,#2b2b2b,#050505)}.bg-overlay{position:fixed;inset:0;z-index:-1;background:rgba(0,0,0,.35)}.spinner{border:3px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;width:18px;height:18px;animation:spin .7s linear infinite;display:none}.spinner-dark{border:4px solid rgba(0,0,0,.08);border-top-color:#facc15;border-radius:50%;width:36px;height:36px;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}#toast{visibility:hidden;min-width:200px;background:#facc15;color:#000;text-align:center;border-radius:10px;padding:12px 20px;position:fixed;z-index:100;left:50%;bottom:30px;transform:translateX(-50%);opacity:0;transition:opacity .25s,bottom .25s;font-weight:900;text-transform:uppercase;font-size:12px;box-shadow:0 4px 20px rgba(250,204,21,.4)}#toast.show{visibility:visible;opacity:1;bottom:50px}.pulse-dot{width:8px;height:8px;background:#22c55e;border-radius:50%;display:inline-block;box-shadow:0 0 0 0 rgba(34,197,94,.7);animation:pulse 1.6s infinite}.pulse-dot.offline{background:#f59e0b;animation:none;box-shadow:none}@keyframes pulse{0%{transform:scale(.95)}70%{transform:scale(1);box-shadow:0 0 0 8px rgba(34,197,94,0)}100%{transform:scale(.95)}}.slim-scroll::-webkit-scrollbar{width:5px}.slim-scroll::-webkit-scrollbar-track{background:transparent}.slim-scroll::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:99px}.modal-backdrop{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px)}.modal-backdrop.open{display:flex}</style>
</head><body class="flex flex-col items-center justify-center min-h-screen py-8 px-4 dark:text-white">
<div class="bg-wolf"></div><div class="bg-overlay"></div>
<div id="authScreen" class="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl text-center border-4 border-gray-200 dark:border-gray-700"><img src="https://files.catbox.moe/dkajo4.png" alt="Linker" class="w-20 h-20 rounded-full border-4 border-black dark:border-gray-600 mb-6 mx-auto object-cover"><div id="g_id_onload" data-client_id="1024803666625-2dsd2ebgn5h4s6pg085bmssbk4kmqdbs.apps.googleusercontent.com" data-callback="handleCredentialResponse" data-auto_select="true" data-auto_prompt="false"></div><div class="g_id_signin flex justify-center w-full" data-type="standard" data-theme="outline" data-size="large"></div><p id="authStatus" class="mt-5 text-xs text-gray-500 font-bold hidden">Verifying details…</p></div>
<div id="unauthorizedModal" class="fixed inset-0 z-50 bg-black/95 hidden flex-col items-center justify-center p-4"><div class="bg-white dark:bg-gray-800 max-w-md w-full rounded-3xl border-4 border-red-500 p-8 text-center"><h2 class="text-2xl font-black text-red-600 mb-2 uppercase">Access Denied</h2><p class="text-gray-700 dark:text-gray-300 font-bold text-xs" id="deniedText">Not authorized.</p><button onclick="logout()" class="mt-5 bg-black text-white dark:bg-yellow-400 dark:text-black font-bold text-xs uppercase px-6 py-2.5 rounded-xl">Try another account</button></div></div>
<div id="appScreen" class="relative z-10 w-full max-w-6xl hidden"><div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
  <div class="lg:col-span-5 flex flex-col h-full"><div class="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-2xl border-4 border-gray-200 dark:border-gray-700 flex-1 flex flex-col items-center relative"><button onclick="logout()" class="absolute top-6 right-6 text-[10px] font-black uppercase text-gray-500 hover:text-red-600">Logout</button><img src="https://files.catbox.moe/dkajo4.png" alt="" class="w-16 h-16 rounded-full border-4 border-black dark:border-gray-600 mb-6 object-cover"><form id="shortenerForm" class="space-y-4 w-full"><input type="url" id="originalUrl" required aria-label="URL" placeholder="Enter URL (Ctrl+N)" class="w-full text-center border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl px-4 py-3 font-bold focus:border-black outline-none text-xs"><div class="grid grid-cols-2 gap-3 w-full"><input type="text" id="customAlias" maxlength="32" aria-label="Custom alias" placeholder="Custom Alias" class="w-full text-center border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-2 focus:border-black outline-none text-xs"><input type="text" id="linkTitle" maxlength="120" aria-label="Title" placeholder="Title (optional)" class="w-full text-center border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-2 py-2 focus:border-black outline-none text-xs"></div><button type="submit" id="submitBtn" class="w-full bg-black dark:bg-yellow-400 dark:text-black hover:bg-yellow-400 hover:text-black text-white font-black py-3.5 rounded-xl flex justify-center items-center gap-2 uppercase text-xs"><span id="btnText">Generate Short Url</span><div id="btnLoader" class="spinner"></div></button></form><div id="resultCard" class="hidden mt-4 pt-4 border-t-2 border-gray-100 dark:border-gray-700 w-full flex flex-col items-center"><p id="resultTitle" class="text-xs font-black text-gray-700 dark:text-gray-200 uppercase text-center w-full mb-3"></p><div class="bg-yellow-50 dark:bg-gray-700 border-2 border-yellow-400 rounded-xl p-3 flex flex-col gap-2 mb-3 w-full"><input type="text" id="shortLink" readonly aria-label="Short link" class="bg-transparent dark:text-white text-black font-black w-full text-center outline-none text-sm"><button id="shareBtn" class="w-full bg-black text-white dark:bg-yellow-400 dark:text-black font-bold py-2 rounded-lg hover:bg-yellow-400 hover:text-black uppercase text-xs">Share / Copy</button></div><button onclick="resetForm()" class="w-full bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 text-black font-bold py-2 rounded-xl text-xs uppercase">Create Another</button></div><div id="errorBox" role="alert" class="hidden mt-3 bg-red-100 text-red-900 p-2.5 rounded-xl text-xs font-bold text-center w-full"></div></div></div>
  <div class="lg:col-span-7 flex flex-col h-full"><div class="w-full bg-white dark:bg-gray-800 rounded-3xl p-6 border-4 border-gray-200 dark:border-gray-700 shadow-2xl h-full flex flex-col items-center min-h-[500px]"><div class="flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900 border border-green-300 dark:border-green-700 px-3 py-1 rounded-full mb-4"><span class="pulse-dot" id="syncDot"></span><span id="syncLbl" class="text-[10px] text-green-800 dark:text-green-200 uppercase font-black">Live</span></div><input type="text" id="searchInput" aria-label="Search links" placeholder="Search links… (Ctrl+K)" class="w-full text-center border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-xl px-4 py-2.5 mb-4 outline-none focus:border-black font-medium text-xs"><div id="listLoader" class="flex-col items-center justify-center flex-1 flex w-full"><div class="spinner-dark dark:border-yellow-400"></div></div><div class="flex-1 overflow-y-auto space-y-4 pr-1 slim-scroll w-full" style="max-height:480px" id="linksScroll"><div id="linksContainer" class="hidden space-y-4 w-full"></div><div id="paginationControls" class="hidden w-full flex justify-between items-center py-4 border-t-2 border-gray-100 dark:border-gray-700 mt-4"><button onclick="prevPage()" id="prevBtn" class="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-30">Prev</button><span id="pageInfo" class="text-[10px] font-black text-gray-500 uppercase tracking-widest"></span><button onclick="nextPage()" id="nextBtn" class="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg text-xs font-bold uppercase disabled:opacity-30">Next</button></div></div></div></div>
</div></div>
<div id="editModal" class="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit link"><div class="bg-white dark:bg-gray-800 rounded-3xl p-6 border-4 border-gray-200 dark:border-gray-700 w-full max-w-md mx-4"><h3 class="text-sm font-black uppercase text-center mb-4">Edit Link</h3><input type="hidden" id="editCode"><div class="space-y-3"><input id="editCodeDisplay" readonly aria-label="Code" class="w-full text-center border-2 border-gray-100 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-500 text-xs"><input type="url" id="editUrl" aria-label="URL" class="w-full text-center border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 text-xs"><input type="text" id="editTitle" maxlength="120" aria-label="Title" class="w-full text-center border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 text-xs"></div><div class="flex gap-3 mt-5"><button onclick="closeEditModal()" class="flex-1 bg-gray-100 dark:bg-gray-700 py-2.5 rounded-xl text-xs font-bold uppercase">Cancel</button><button onclick="submitEdit()" id="editSaveBtn" class="flex-1 bg-black text-white dark:bg-yellow-400 dark:text-black py-2.5 rounded-xl text-xs font-bold uppercase flex justify-center gap-2"><span id="editSaveText">Save</span><div id="editSaveLoader" class="spinner"></div></button></div></div></div>
<div id="toast" role="status" aria-live="polite">Link Copied</div>
<script>
'use strict';
const API='https://script.google.com/macros/s/AKfycbwEP7CIdySsPZgvccP295RY0oVoMc_9knwN8WbEfHUSq32Q7kWTv-A26hhK1Tp3zsZC/exec', SESS='linkerSession', PER=15;
let tk='', tmr=null, hist=[], filt=[], page=1, ver='';
const $=i=>document.getElementById(i), esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const jwt=t=>JSON.parse(decodeURIComponent(atob(t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')));
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2000);}
async function copy(txt){try{await navigator.clipboard.writeText(txt);toast('Link Copied');}catch(_){toast('Copy failed');}}
async function handleShare(l){if(navigator.share&&matchMedia('(pointer: coarse)').matches){try{await navigator.share({title:'Short Link',url:l});return;}catch(_){}}copy(l);}
function expired(){localStorage.removeItem(SESS);tk='';clearInterval(tmr);$('appScreen').classList.add('hidden');$('authScreen').classList.remove('hidden');$('authStatus').classList.add('hidden');toast('Session expired');}
async function post(p){const r=await(await fetch(API,{method:'POST',body:JSON.stringify({...p,token:tk}),headers:{'Content-Type':'text/plain;charset=utf-8'}})).json();if(r&&r.message==='Unauthorized'){expired();throw new Error('auth');}return r;}

/* shortcuts */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape')closeEditModal();
  if(e.ctrlKey||e.metaKey){const k=e.key.toLowerCase();if(k==='k'){e.preventDefault();$('searchInput').focus();}if(k==='n'){e.preventDefault();$('originalUrl').focus();}}
});
$('editModal').addEventListener('click',e=>{if(e.target===$('editModal'))closeEditModal();});

/* auth + live sync */
window.onload=()=>{let s=null;try{s=JSON.parse(localStorage.getItem(SESS)||'null');}catch(_){}
  if(s&&s.exp>Date.now()+60000){tk=s.token;showApp();syncData(true);}else showAuth();};
function startSync(){clearInterval(tmr);tmr=setInterval(syncData,60000);}
document.addEventListener('visibilitychange',()=>{if(!tk)return;if(document.visibilityState==='visible'){syncData();startSync();}else clearInterval(tmr);});
function showAuth(){$('appScreen').classList.add('hidden');$('authScreen').classList.remove('hidden');}
function showApp(){$('authScreen').classList.add('hidden');$('appScreen').classList.remove('hidden');startSync();}
async function handleCredentialResponse(r){
  $('authStatus').classList.remove('hidden'); tk=r.credential;
  try{
    const exp=jwt(tk).exp*1000, rs=await post({action:'history'});
    if(rs.success){localStorage.setItem(SESS,JSON.stringify({token:tk,exp}));hist=rs.history;ver=rs.v;processData();showApp();}
    else{$('deniedText').textContent=rs.message||'Not authorized.';$('authScreen').classList.add('hidden');$('unauthorizedModal').classList.remove('hidden');$('unauthorizedModal').classList.add('flex');}
  }catch(e){ if(e.message!=='auth'){$('authStatus').textContent='Connection problem. Try again.';} }
}
function logout(){localStorage.removeItem(SESS);try{google.accounts.id.disableAutoSelect();}catch(_){}location.reload();}
async function syncData(force){
  if(!tk)return; if(force===true){$('linksContainer').classList.add('hidden');$('listLoader').classList.remove('hidden');}
  try{
    const r=await post({action:'history',v:force===true?'':ver});
    $('syncDot').classList.remove('offline');$('syncLbl').textContent='Live';
    if(r.success&&!r.unchanged){hist=r.history;ver=r.v;processData();}else if(force===true)processData();
  }catch(e){if(e.message!=='auth'){$('syncDot').classList.add('offline');$('syncLbl').textContent='Offline';if(force===true)processData();}}
}

/* create (optimistic) */
$('shortenerForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const u=$('originalUrl').value.trim(),t=$('linkTitle').value.trim(),c=$('customAlias').value.trim(); if(!u)return;
  $('submitBtn').disabled=true;$('btnText').textContent='Wait…';$('btnLoader').style.display='block';$('errorBox').classList.add('hidden');
  const opt={title:t||'Generating...',source:u,shortCode:c||'⏳',shortLink:'...',clicks:0}; hist.unshift(opt); processData();
  try{
    const r=await post({action:'create',url:u,title:t,alias:c});
    hist=hist.filter(h=>h!==opt);
    if(r.success){
      if(!hist.some(h=>h.shortCode===r.shortCode))hist.unshift({title:r.title,source:u,shortCode:r.shortCode,shortLink:r.shortLink,clicks:0});
      ver='';$('shortLink').value=r.shortLink;$('resultTitle').textContent=r.title;$('shortenerForm').classList.add('hidden');$('resultCard').classList.remove('hidden');
    }else{$('errorBox').textContent=r.message||'Failed.';$('errorBox').classList.remove('hidden');}
    processData();
  }catch(err){hist=hist.filter(h=>h!==opt);processData();if(err.message!=='auth'){$('errorBox').textContent='Connection problem.';$('errorBox').classList.remove('hidden');}}
  finally{$('submitBtn').disabled=false;$('btnText').textContent='Generate Short Url';$('btnLoader').style.display='none';}
});
$('shareBtn').addEventListener('click',()=>handleShare($('shortLink').value));
function resetForm(){$('shortenerForm').reset();$('shortenerForm').classList.remove('hidden');$('resultCard').classList.add('hidden');$('originalUrl').focus();}

/* delete (optimistic, rollback on failure) */
async function deleteLink(code){
  if(!confirm(`Delete /${code}?`))return;
  const idx=hist.findIndex(h=>h.shortCode===code); if(idx<0)return; const backup=hist[idx];
  hist.splice(idx,1);processData();
  try{const r=await post({action:'delete',code});if(!r.success)throw new Error(r.message||'x');ver='';}
  catch(e){if(e.message==='auth')return;hist.splice(idx,0,backup);processData();toast('Delete failed');}
}

/* edit (optimistic, rollback on failure) */
function openEditModal(c,u,t){$('editCode').value=c;$('editCodeDisplay').value='/'+c;$('editUrl').value=u;$('editTitle').value=t;$('editModal').classList.add('open');$('editUrl').focus();}
function closeEditModal(){$('editModal').classList.remove('open');}
async function submitEdit(){
  const c=$('editCode').value,u=$('editUrl').value.trim(),t=$('editTitle').value.trim(); if(!u)return toast('URL required');
  const h=hist.find(x=>x.shortCode===c); if(!h)return closeEditModal(); const old={...h};
  $('editSaveBtn').disabled=true;
  try{
    const r=await post({action:'update',code:c,url:u,title:t});
    if(!r.success){toast(r.message||'Update failed');}
    else{h.source=/^https?:\/\//i.test(u)?u:'https://'+u;if(t)h.title=t;ver='';processData();closeEditModal();}
  }catch(e){if(e.message!=='auth'){Object.assign(h,old);toast('Update failed');}}
  finally{$('editSaveBtn').disabled=false;}
}

/* list */
let sT; $('searchInput').addEventListener('input',()=>{clearTimeout(sT);sT=setTimeout(()=>{page=1;processData();},300);});
$('linksContainer').addEventListener('click',e=>{
  const b=e.target.closest('[data-act]'); if(!b)return; const h=filt[(page-1)*PER+ +b.dataset.i]; if(!h)return;
  if(b.dataset.act==='copy')handleShare(h.shortLink);else if(b.dataset.act==='edit')openEditModal(h.shortCode,h.source,h.title);else if(b.dataset.act==='del')deleteLink(h.shortCode);
});
function processData(){
  const q=$('searchInput').value.toLowerCase();
  filt=q?hist.filter(h=>h.title.toLowerCase().includes(q)||h.source.toLowerCase().includes(q)||h.shortCode.toLowerCase().includes(q)):hist;
  const pages=Math.max(1,Math.ceil(filt.length/PER)); if(page>pages)page=pages;
  $('listLoader').classList.add('hidden');$('linksContainer').classList.remove('hidden');
  const mx=Math.max(1,...hist.map(h=>h.clicks||0)), pd=filt.slice((page-1)*PER,page*PER);
  $('linksContainer').innerHTML=pd.map((h,i)=>`
    <div class="relative overflow-hidden bg-gray-50 dark:bg-gray-800 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-sm text-center">
      <div class="absolute bottom-0 left-0 h-1 bg-green-400 dark:bg-green-600 opacity-70" style="width:${((h.clicks||0)/mx)*100}%"></div>
      <p class="font-black text-sm truncate w-full max-w-[300px] mx-auto">${esc(h.title)}</p>
      <p class="text-[10px] text-gray-500 truncate mb-2 w-full max-w-[300px] mx-auto">${esc(h.source)}</p>
      <a href="${esc(h.shortLink)}" target="_blank" rel="noopener noreferrer" class="text-xs font-black text-blue-600 dark:text-blue-400 block mb-2">${esc(h.shortLink)} <span class="text-gray-500 text-[10px]">(${h.clicks||0} clicks)</span></a>
      <div class="flex gap-2 justify-center mt-3 relative z-10">
        <button data-act="copy" data-i="${i}" class="bg-black text-white dark:bg-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Copy</button>
        <button data-act="edit" data-i="${i}" class="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Edit</button>
        <button data-act="del" data-i="${i}" class="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase">Del</button>
      </div></div>`).join('')||'<p class="text-xs font-bold text-gray-500 text-center py-8">No links found.</p>';
  const pc=$('paginationControls');
  if(filt.length>PER){pc.classList.remove('hidden');pc.classList.add('flex');$('pageInfo').textContent=`Page ${page} of ${pages}`;$('prevBtn').disabled=page===1;$('nextBtn').disabled=page>=pages;}else{pc.classList.add('hidden');pc.classList.remove('flex');}
}
function prevPage(){if(page>1){page--;processData();$('linksScroll').scrollTop=0;}}
function nextPage(){if(page*PER<filt.length){page++;processData();$('linksScroll').scrollTop=0;}}
</script></body></html>
