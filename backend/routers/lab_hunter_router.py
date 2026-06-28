"""
DEVOPS — Lab Hunter Router
Pega una IP de laboratorio (HTB) y la herramienta intenta hacer la máquina sola.
Incluye una UI mínima en /api/lab-hunter/ui para usarlo sin el frontend React.
Uso educativo en máquinas autorizadas.
"""
from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from services import lab_hunter_service

router = APIRouter(prefix="/api/lab-hunter", tags=["lab-hunter"])


class HuntReq(BaseModel):
    ip: str


@router.post("/run")
async def run(req: HuntReq):
    return await lab_hunter_service.hunt(req.ip)


@router.get("/ui", response_class=HTMLResponse)
async def ui():
    return _HTML


_HTML = """<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lab Hunter — DEVOPS</title>
<style>
  :root{--bg:#0a0e14;--panel:#111824;--line:#1e2a3a;--txt:#cdd6e4;--mut:#7d8ba0;--ok:#3ddc84;--bad:#ff5c6c;--acc:#4da3ff}
  *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 ui-monospace,Menlo,Consolas,monospace}
  .wrap{max-width:900px;margin:0 auto;padding:24px}
  h1{font-size:20px;margin:0 0 4px} .sub{color:var(--mut);margin:0 0 20px}
  .row{display:flex;gap:8px} input{flex:1;background:var(--panel);border:1px solid var(--line);color:var(--txt);padding:12px;border-radius:8px;font:inherit}
  button{background:var(--acc);border:0;color:#04111f;font-weight:700;padding:0 20px;border-radius:8px;cursor:pointer}
  button:disabled{opacity:.5;cursor:wait}
  .status{margin:16px 0;padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:var(--panel)}
  .owned{border-color:var(--ok);color:var(--ok)} .err{border-color:var(--bad);color:var(--bad)}
  .flag{font-weight:700;color:var(--ok)}
  .step{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:10px 14px;margin:8px 0}
  .step .h{display:flex;justify-content:space-between;color:var(--mut);font-size:12px}
  .fase{color:var(--acc);font-weight:700}
  .res{margin:4px 0}
  .hall{color:var(--ok);font-size:13px}
  pre{white-space:pre-wrap;word-break:break-word;color:var(--mut);background:#0c121b;border-radius:6px;padding:8px;margin:6px 0 0;max-height:240px;overflow:auto;font-size:12px}
  details summary{cursor:pointer;color:var(--mut);font-size:12px}
</style></head><body><div class="wrap">
<h1>🎯 Lab Hunter</h1>
<p class="sub">Pega la IP de la máquina (HTB) y dale. Comprueba VPN → nmap → playbook → flag.</p>
<div class="row">
  <input id="ip" placeholder="10.129.x.x" autofocus>
  <button id="go">Atacar</button>
</div>
<div id="out"></div>
<script>
const out=document.getElementById('out'), btn=document.getElementById('go'), ip=document.getElementById('ip');
function esc(s){return (s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
async function run(){
  const target=ip.value.trim(); if(!target)return;
  btn.disabled=true; out.innerHTML='<div class="status">⏳ Trabajando… (nmap + playbooks, puede tardar ~1 min)</div>';
  try{
    const r=await fetch('/api/lab-hunter/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ip:target})});
    const d=await r.json(); render(d);
  }catch(e){ out.innerHTML='<div class="status err">Error: '+esc(e.message)+'</div>'; }
  btn.disabled=false;
}
function render(d){
  let h='';
  const owned=d.status==='owned';
  h+='<div class="status '+(owned?'owned':(['error','rechazado','sin-vpn','inalcanzable'].includes(d.status)?'err':''))+'">';
  h+='Estado: <b>'+esc(d.status)+'</b>';
  if(d.flags&&d.flags.length) h+=' · 🚩 Flags: '+d.flags.map(f=>'<span class="flag">'+esc(f)+'</span>').join(', ');
  h+='</div>';
  for(const s of (d.steps||[])){
    h+='<div class="step"><div class="h"><span class="fase">'+esc(s.fase)+'</span><span>paso '+s.paso+' · '+esc(s.ts)+'</span></div>';
    h+='<div class="res"><b>'+esc(s.accion)+'</b> → '+esc(s.resultado)+'</div>';
    if(s.hallazgos&&s.hallazgos.length) h+='<div class="hall">'+s.hallazgos.map(esc).join('<br>')+'</div>';
    if(s.salida) h+='<details><summary>ver salida</summary><pre>'+esc(s.salida)+'</pre></details>';
    h+='</div>';
  }
  out.innerHTML=h;
}
btn.onclick=run; ip.addEventListener('keydown',e=>{if(e.key==='Enter')run();});
</script></div></body></html>"""
