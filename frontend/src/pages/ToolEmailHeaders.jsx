import { useState, useMemo } from 'react'
import ToolShell from '../components/ToolShell'
import { Mail, AlertTriangle, CheckCircle, Copy, ChevronDown, ChevronRight, Shield } from 'lucide-react'

const COLOR = '#f59e0b'

// ── Parser ────────────────────────────────────────────────────────────────────
function parseHeaders(raw) {
  const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const headers = []
  let current = null

  lines.split('\n').forEach(line => {
    if (/^\s/.test(line) && current) {
      current.value += ' ' + line.trim()
    } else {
      const match = line.match(/^([A-Za-z][A-Za-z0-9-]*):\s*(.*)$/)
      if (match) {
        current = { name: match[1], value: match[2] }
        headers.push(current)
      }
    }
  })
  return headers
}

function getHeader(headers, name) {
  return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || null
}

function parseReceived(val) {
  const from = val.match(/from\s+([^\s]+)/i)?.[1]
  const by   = val.match(/by\s+([^\s]+)/i)?.[1]
  const ip   = val.match(/\[(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\]/)?.[1] ||
               val.match(/\(([^)]+)\)/)?.[1]
  const date = val.match(/;\s*(.+)$/)?.[1]?.trim()
  return { from, by, ip, date }
}

function parseSPF(authResults) {
  if (!authResults) return null
  const spf = authResults.match(/spf=(\w+)/i)?.[1]
  return spf
}

function parseDKIM(authResults) {
  if (!authResults) return null
  return authResults.match(/dkim=(\w+)/i)?.[1]
}

function parseDMARC(authResults) {
  if (!authResults) return null
  return authResults.match(/dmarc=(\w+)/i)?.[1]
}

function statusBadge(val) {
  if (!val) return null
  const lower = val.toLowerCase()
  if (lower === 'pass') return { color:'#10b981', label:'PASS' }
  if (lower === 'fail') return { color:'#ef4444', label:'FAIL' }
  if (lower === 'softfail') return { color:'#f97316', label:'SOFTFAIL' }
  if (lower === 'neutral') return { color:'#6b7280', label:'NEUTRAL' }
  if (lower === 'none')    return { color:'#6b7280', label:'NONE' }
  if (lower === 'permerror' || lower === 'temperror') return { color:'#f97316', label:val.toUpperCase() }
  return { color:'#f59e0b', label:val.toUpperCase() }
}

const SAMPLE = `Delivered-To: usuario@gmail.com
Received: by 2002:a17:907:2d27:0:0:0:0 with SMTP id gs39csp1234567obc;
        Mon, 15 Jan 2024 08:23:45 -0800 (PST)
X-Received: by 2002:a05:6214:300f:0:0:0:0 with SMTP id 15-1234567890;
        Mon, 15 Jan 2024 08:23:45 -0800 (PST)
Received: from mail.example.com (mail.example.com. [203.0.113.25])
        by mx.google.com with ESMTPS id s8-12345678;
        Mon, 15 Jan 2024 08:23:44 -0800 (PST)
Authentication-Results: mx.google.com;
       dkim=pass header.i=@example.com header.s=20210112 header.b=AbCdEfGh;
       spf=pass (google.com: domain of sender@example.com designates 203.0.113.25 as permitted sender) smtp.mailfrom=sender@example.com;
       dmarc=pass (p=REJECT sp=REJECT dis=NONE) header.from=example.com
DKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=example.com; s=20210112; h=mime-version:from:date:message-id:subject:to; bh=AbCdEfGhIjKlMnOpQrStUv==; b=AbCdEfGhIjKlMnOpQrStUvWxYz
MIME-Version: 1.0
From: Sender Name <sender@example.com>
Reply-To: noreply@example.com
Date: Mon, 15 Jan 2024 16:23:43 +0000
Message-ID: <CABCdef123456@mail.example.com>
Subject: Ejemplo de análisis de cabeceras
To: usuario@gmail.com
Content-Type: text/html; charset="UTF-8"`

export default function ToolEmailHeaders() {
  const [raw,       setRaw]      = useState('')
  const [analyzed,  setAnalyzed] = useState(null)
  const [expanded,  setExpanded] = useState({})
  const [copied,    setCopied]   = useState('')

  const analyze = () => {
    if (!raw.trim()) return
    const headers = parseHeaders(raw)
    const auth    = getHeader(headers, 'Authentication-Results')
    const spf     = parseSPF(auth)
    const dkim    = parseDKIM(auth)
    const dmarc   = parseDMARC(auth)
    const received = headers.filter(h => h.name.toLowerCase() === 'received').map(h => parseReceived(h.value))

    setAnalyzed({
      headers,
      from:      getHeader(headers, 'From'),
      to:        getHeader(headers, 'To'),
      replyTo:   getHeader(headers, 'Reply-To'),
      subject:   getHeader(headers, 'Subject'),
      date:      getHeader(headers, 'Date'),
      messageId: getHeader(headers, 'Message-ID'),
      returnPath:getHeader(headers, 'Return-Path'),
      xMailer:   getHeader(headers, 'X-Mailer') || getHeader(headers, 'X-Originating-IP'),
      contentType: getHeader(headers, 'Content-Type'),
      spf, dkim, dmarc, auth, received,
    })
  }

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v); setTimeout(() => setCopied(''), 1500)
  }

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }))

  // Phishing risk score
  const riskScore = useMemo(() => {
    if (!analyzed) return null
    let score = 0
    const flags = []

    if (analyzed.spf === 'fail' || analyzed.spf === 'softfail') { score += 30; flags.push('SPF falla') }
    if (analyzed.dkim === 'fail') { score += 30; flags.push('DKIM inválido') }
    if (analyzed.dmarc === 'fail') { score += 20; flags.push('DMARC falla') }
    if (!analyzed.spf) { score += 15; flags.push('Sin SPF') }
    if (!analyzed.dkim) { score += 10; flags.push('Sin DKIM') }

    // Check if Reply-To differs from From
    const fromDomain  = analyzed.from?.match(/@([^\s>]+)/)?.[1]
    const replyDomain = analyzed.replyTo?.match(/@([^\s>]+)/)?.[1]
    if (replyDomain && fromDomain && replyDomain !== fromDomain) {
      score += 25; flags.push(`Reply-To diferente: ${replyDomain}`)
    }

    // Check for free mail providers sending as business
    const isFreeMail = /gmail|yahoo|hotmail|outlook|live/i.test(fromDomain || '')
    if (isFreeMail && analyzed.from?.includes('@') && !analyzed.from?.includes('gmail')) {
      score += 15; flags.push('Dominio de correo gratuito')
    }

    return {
      score: Math.min(score, 100),
      level: score >= 60 ? 'ALTO' : score >= 30 ? 'MEDIO' : 'BAJO',
      color: score >= 60 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#10b981',
      flags,
    }
  }, [analyzed])

  return (
    <ToolShell icon="✉️" name="Email Header Analyzer" color={COLOR} badge="SPF · DKIM · DMARC · Phishing Detection · Mail Path">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {!analyzed ? (
          <>
            <div style={{ display:'flex', gap:8, marginBottom:10, alignItems:'center' }}>
              <Mail size={14} style={{ color:COLOR }}/>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>
                Pega las cabeceras completas del email (Mostrar original → Ver fuente)
              </span>
              <button onClick={() => setRaw(SAMPLE)} style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:6, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.45)', fontSize:11, cursor:'pointer' }}>
                Ver ejemplo
              </button>
            </div>
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder="Delivered-To: ...\nReceived: from ...\nAuthentication-Results: ..."
              style={{ width:'100%', boxSizing:'border-box', minHeight:280, background:'rgba(245,158,11,0.04)', border:'1px solid rgba(245,158,11,0.2)', color:'rgba(255,255,255,0.7)', padding:'14px', borderRadius:12, fontSize:12, fontFamily:'monospace', resize:'vertical', outline:'none', lineHeight:1.7 }}
            />
            <div style={{ display:'flex', gap:10, marginTop:12 }}>
              <button onClick={analyze} disabled={!raw.trim()}
                style={{ padding:'11px 24px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:7, background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.4)', color:COLOR, fontWeight:700, fontSize:13 }}>
                <Shield size={14}/> Analizar cabeceras
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setAnalyzed(null); setExpanded({}) }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:12, marginBottom:20 }}>
              ← Analizar otro email
            </button>

            {/* Risk score */}
            {riskScore && (
              <div style={{ display:'flex', alignItems:'center', gap:16, padding:'16px 20px', borderRadius:14, marginBottom:20, background:`${riskScore.color}10`, border:`1px solid ${riskScore.color}30`, flexWrap:'wrap' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:80 }}>
                  <div style={{ color:riskScore.color, fontSize:36, fontWeight:900, fontFamily:'monospace', lineHeight:1 }}>{riskScore.score}</div>
                  <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10 }}>Riesgo / 100</div>
                </div>
                <div style={{ width:1, height:50, background:'rgba(255,255,255,0.1)' }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ padding:'3px 10px', borderRadius:6, background:`${riskScore.color}20`, color:riskScore.color, fontWeight:700, fontSize:11 }}>
                      RIESGO {riskScore.level}
                    </span>
                    <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>Indicadores de phishing</span>
                  </div>
                  {riskScore.flags.length > 0 ? (
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {riskScore.flags.map((f, i) => (
                        <span key={i} style={{ fontSize:10, padding:'2px 8px', borderRadius:4, background:'rgba(239,68,68,0.15)', color:'#fca5a5', border:'1px solid rgba(239,68,68,0.3)' }}>
                          ⚠ {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color:'#10b981', fontSize:12, display:'flex', alignItems:'center', gap:5 }}>
                      <CheckCircle size={12}/> No se detectaron indicadores de phishing
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
              {/* Auth results */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:14 }}>
                  🔐 Autenticación de email
                </div>
                {[
                  { label:'SPF', val: analyzed.spf, desc:'Sender Policy Framework' },
                  { label:'DKIM', val: analyzed.dkim, desc:'DomainKeys Identified Mail' },
                  { label:'DMARC', val: analyzed.dmarc, desc:'Domain-based Message Auth.' },
                ].map(a => {
                  const badge = statusBadge(a.val)
                  return (
                    <div key={a.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12, minWidth:50 }}>{a.label}</span>
                      {badge ? (
                        <span style={{ padding:'2px 8px', borderRadius:5, background:`${badge.color}20`, color:badge.color, fontWeight:700, fontSize:11 }}>{badge.label}</span>
                      ) : (
                        <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11 }}>No encontrado</span>
                      )}
                      <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10, marginLeft:'auto' }}>{a.desc}</span>
                    </div>
                  )
                })}
              </div>

              {/* Key headers */}
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px' }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:14 }}>
                  📧 Información principal
                </div>
                {[
                  { label:'De',          val: analyzed.from },
                  { label:'Para',        val: analyzed.to },
                  { label:'Reply-To',    val: analyzed.replyTo },
                  { label:'Fecha',       val: analyzed.date },
                  { label:'Message-ID',  val: analyzed.messageId },
                  { label:'Return-Path', val: analyzed.returnPath },
                ].map(f => f.val ? (
                  <div key={f.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11, flexShrink:0 }}>{f.label}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flex:1, justifyContent:'flex-end' }}>
                      <span style={{ color:'#fff', fontSize:11, fontFamily:'monospace', textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', maxWidth:240, whiteSpace:'nowrap' }}>{f.val}</span>
                      <button onClick={() => copy(f.val)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.2)', padding:0, display:'flex', flexShrink:0 }}>
                        {copied === f.val ? <CheckCircle size={9} style={{ color:'#10b981' }}/> : <Copy size={9}/>}
                      </button>
                    </div>
                  </div>
                ) : null)}
              </div>
            </div>

            {/* Mail path (Received headers) */}
            {analyzed.received.length > 0 && (
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px', marginBottom:16 }}>
                <div style={{ color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>
                  🛣️ Ruta del mensaje ({analyzed.received.length} saltos)
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {analyzed.received.map((r, i) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', borderRadius:9, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ width:22, height:22, borderRadius:6, background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:COLOR, fontSize:10, fontWeight:700, flexShrink:0 }}>
                        {analyzed.received.length - i}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {r.from && <span style={{ color:'rgba(255,255,255,0.6)', fontSize:11, fontFamily:'monospace' }}>from <strong style={{ color:'#fff' }}>{r.from}</strong></span>}
                          {r.by   && <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>→ {r.by}</span>}
                          {r.ip   && <span style={{ color:COLOR, fontSize:11, fontFamily:'monospace' }}>[{r.ip}]</span>}
                        </div>
                        {r.date && <div style={{ color:'rgba(255,255,255,0.2)', fontSize:10, marginTop:4 }}>{r.date}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All headers (collapsible) */}
            <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14, overflow:'hidden' }}>
              <button onClick={() => toggle('all')} style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.4)', fontSize:12 }}>
                {expanded.all ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                Todas las cabeceras ({analyzed.headers.length})
              </button>
              {expanded.all && (
                <div style={{ padding:'0 16px 16px', maxHeight:400, overflowY:'auto' }}>
                  {analyzed.headers.map((h, i) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                      <span style={{ color:COLOR, fontSize:11, fontFamily:'monospace', minWidth:160, flexShrink:0 }}>{h.name}:</span>
                      <span style={{ color:'rgba(255,255,255,0.5)', fontSize:11, fontFamily:'monospace', wordBreak:'break-all' }}>{h.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ToolShell>
  )
}
