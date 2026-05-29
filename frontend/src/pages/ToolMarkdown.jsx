import { useState, useMemo, useRef } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, CheckCircle, Download, Eye, Code, Maximize2, AlignLeft } from 'lucide-react'

const COLOR = '#10b981'

// ── Minimal Markdown → HTML renderer (no dependency) ─────────────────────────
function mdToHtml(md) {
  let html = md
    // Escape HTML entities first
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Fenced code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre class="md-code-block"><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`)

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')

  // Headers
  html = html.replace(/^#{6}\s(.+)$/gm, '<h6 class="md-h6">$1</h6>')
  html = html.replace(/^#{5}\s(.+)$/gm, '<h5 class="md-h5">$1</h5>')
  html = html.replace(/^#{4}\s(.+)$/gm, '<h4 class="md-h4">$1</h4>')
  html = html.replace(/^#{3}\s(.+)$/gm, '<h3 class="md-h3">$1</h3>')
  html = html.replace(/^#{2}\s(.+)$/gm, '<h2 class="md-h2">$1</h2>')
  html = html.replace(/^#{1}\s(.+)$/gm, '<h1 class="md-h1">$1</h1>')

  // Horizontal rule
  html = html.replace(/^---+$/gm, '<hr class="md-hr"/>')

  // Blockquote
  html = html.replace(/^&gt;\s(.+)$/gm, '<blockquote class="md-blockquote">$1</blockquote>')

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img"/>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener">$1</a>')

  // Unordered lists
  html = html.replace(/((?:^[-*+]\s.+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^[-*+]\s/, '')}</li>`).join('')
    return `<ul class="md-ul">${items}</ul>`
  })

  // Ordered lists
  html = html.replace(/((?:^\d+\.\s.+\n?)+)/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\.\s/, '')}</li>`).join('')
    return `<ol class="md-ol">${items}</ol>`
  })

  // Tables
  html = html.replace(/^\|(.+)\|\n\|[-|: ]+\|\n((?:\|.+\|\n?)+)/gm, (_, header, rows) => {
    const ths = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('')
    const trs = rows.trim().split('\n').map(r => {
      const tds = r.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('')
      return `<tr>${tds}</tr>`
    }).join('')
    return `<table class="md-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
  })

  // Paragraphs (lines not already wrapped in block-level tags)
  const lines = html.split('\n')
  const result = []
  let inBlock = false
  for (const line of lines) {
    const isBlock = /^<(h[1-6]|ul|ol|li|pre|blockquote|hr|table|thead|tbody|tr|th|td)/.test(line)
    if (isBlock) { inBlock = true; result.push(line); continue }
    if (line.trim() === '') { inBlock = false; result.push(''); continue }
    if (!inBlock) result.push(`<p class="md-p">${line}</p>`)
    else result.push(line)
  }
  return result.join('\n')
}

const SAMPLE = `# B-DEVOPS Platform

## Descripcion

**B-DEVOPS** es una plataforma de operaciones _all-in-one_ para equipos de seguridad y desarrollo.

## Características principales

- 🔍 **OSINT** — 18 herramientas de inteligencia
- 🛡️ **Security** — Análisis de vulnerabilidades
- ⚡ **Infra** — Gestión de infraestructura

## Ejemplo de código

\`\`\`bash
# Clonar el repositorio
git clone https://github.com/bdjoseluis/devnova.git
cd devnova && docker compose up -d
\`\`\`

## Tabla de herramientas

| Categoría | Herramientas | Estado |
|-----------|-------------|--------|
| OSINT     | 18          | ✅ Activo |
| Security  | 16          | ✅ Activo |
| Infra     | 12          | ✅ Activo |

> 💡 Usa \`Ctrl+K\` para búsqueda rápida desde el dashboard.

---

Contacto: [comando1.yt@gmail.com](mailto:comando1.yt@gmail.com)
`

const PREVIEW_STYLES = `
  .md-h1 { font-size:1.75em; font-weight:700; color:#fff; margin:0.8em 0 0.4em; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.3em; }
  .md-h2 { font-size:1.4em; font-weight:700; color:#e2e8f0; margin:0.8em 0 0.3em; }
  .md-h3 { font-size:1.15em; font-weight:600; color:#cbd5e1; margin:0.6em 0 0.25em; }
  .md-h4,.md-h5,.md-h6 { font-weight:600; color:#94a3b8; margin:0.5em 0 0.2em; }
  .md-p { margin:0.5em 0; color:rgba(255,255,255,0.75); line-height:1.7; }
  .md-code { background:rgba(16,185,129,0.15); color:#86efac; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.9em; }
  .md-code-block { background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:14px 16px; margin:0.8em 0; overflow-x:auto; }
  .md-code-block code { color:#86efac; font-family:monospace; font-size:0.85em; line-height:1.6; white-space:pre; }
  .md-blockquote { border-left:3px solid #10b981; padding:8px 16px; margin:0.6em 0; background:rgba(16,185,129,0.06); color:rgba(255,255,255,0.6); border-radius:0 8px 8px 0; }
  .md-hr { border:none; border-top:1px solid rgba(255,255,255,0.15); margin:1.2em 0; }
  .md-link { color:#60a5fa; text-decoration:underline; }
  .md-link:hover { color:#93c5fd; }
  .md-ul,.md-ol { margin:0.5em 0 0.5em 1.5em; color:rgba(255,255,255,0.75); }
  .md-ul li,.md-ol li { margin:0.25em 0; line-height:1.6; }
  .md-table { width:100%; border-collapse:collapse; margin:0.8em 0; }
  .md-table th { background:rgba(16,185,129,0.15); color:#34d399; padding:8px 12px; text-align:left; font-size:0.85em; border:1px solid rgba(255,255,255,0.1); }
  .md-table td { padding:7px 12px; border:1px solid rgba(255,255,255,0.07); color:rgba(255,255,255,0.7); font-size:0.85em; }
  .md-table tr:nth-child(even) td { background:rgba(255,255,255,0.02); }
  .md-img { max-width:100%; border-radius:8px; margin:0.5em 0; }
  strong { color:#fff; }
  em { color:rgba(255,255,255,0.85); font-style:italic; }
  del { color:rgba(255,255,255,0.35); text-decoration:line-through; }
`

export default function ToolMarkdown() {
  const [text,    setText]   = useState(SAMPLE)
  const [view,    setView]   = useState('split') // split | editor | preview
  const [copied,  setCopied] = useState('')
  const textareaRef = useRef(null)

  const html = useMemo(() => mdToHtml(text), [text])

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length
  const lineCount = text.split('\n').length
  const charCount = text.length
  const readMin   = Math.max(1, Math.round(wordCount / 200))

  const copy = (v, k) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(k); setTimeout(() => setCopied(''), 1500)
  }

  const download = (content, name, mime) => {
    const b = new Blob([content], { type: mime })
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click()
  }

  const insertAt = (snippet, offset = 0) => {
    const el = textareaRef.current; if (!el) return
    const s = el.selectionStart, e = el.selectionEnd
    const sel = text.slice(s, e)
    const replacement = snippet.replace('$SEL', sel || 'texto')
    const next = text.slice(0, s) + replacement + text.slice(e)
    setText(next)
    setTimeout(() => { el.selectionStart = el.selectionEnd = s + replacement.length - offset; el.focus() }, 0)
  }

  const TOOLBAR = [
    { icon:'B', title:'Bold',        snippet:'**$SEL**',      style:{ fontWeight:'bold' } },
    { icon:'I', title:'Italic',      snippet:'_$SEL_',        style:{ fontStyle:'italic' } },
    { icon:'~~', title:'Strikethrough', snippet:'~~$SEL~~',   style:{ textDecoration:'line-through' } },
    { icon:'`',  title:'Inline code', snippet:'`$SEL`',       style:{ fontFamily:'monospace' } },
    { icon:'H1', title:'Heading 1',  snippet:'# $SEL',        style:{} },
    { icon:'H2', title:'Heading 2',  snippet:'## $SEL',       style:{} },
    { icon:'H3', title:'Heading 3',  snippet:'### $SEL',      style:{} },
    { icon:'—',  title:'HR',          snippet:'\n---\n',       style:{} },
    { icon:'🔗', title:'Link',        snippet:'[$SEL](url)',   style:{} },
    { icon:'📋', title:'Code block',  snippet:'```\n$SEL\n```',style:{} },
    { icon:'❝',  title:'Blockquote', snippet:'> $SEL',        style:{} },
    { icon:'•',  title:'List',        snippet:'- $SEL',        style:{} },
  ]

  return (
    <ToolShell icon="📝" name="Markdown Editor" color={COLOR} badge="Editor live · Preview HTML · Exportar MD/HTML">
      <style>{PREVIEW_STYLES}</style>
      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', maxWidth:1300, margin:'0 auto', padding:'24px 24px 0' }}>

        {/* Top bar */}
        <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap' }}>
          {/* Toolbar buttons */}
          {TOOLBAR.map(t => (
            <button key={t.title} onClick={() => insertAt(t.snippet)} title={t.title}
              style={{ ...t.style, padding:'5px 9px', borderRadius:6, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', fontSize:11, minWidth:28, textAlign:'center' }}>
              {t.icon}
            </button>
          ))}

          <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ color:'rgba(255,255,255,0.2)', fontSize:10, fontFamily:'monospace' }}>{wordCount} palabras · {lineCount} líneas · ~{readMin} min</span>
            {/* View toggle */}
            {[['split','Split'],['editor','Editor'],['preview','Preview']].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ padding:'5px 10px', borderRadius:6, cursor:'pointer', background: view===v ? 'rgba(16,185,129,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${view===v ? 'rgba(16,185,129,0.4)':'rgba(255,255,255,0.08)'}`, color: view===v ? COLOR:'rgba(255,255,255,0.35)', fontSize:10 }}>
                {l}
              </button>
            ))}
            <button onClick={() => copy(text, 'md')}
              style={{ padding:'5px 10px', borderRadius:6, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color: copied==='md' ? COLOR:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', gap:4, fontSize:10 }}>
              {copied==='md' ? <CheckCircle size={10}/> : <Copy size={10}/>} MD
            </button>
            <button onClick={() => download(text, 'document.md', 'text/markdown')}
              style={{ padding:'5px 10px', borderRadius:6, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', gap:4, fontSize:10 }}>
              <Download size={10}/> .md
            </button>
            <button onClick={() => download(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{background:#111;color:#ccc;font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem}${PREVIEW_STYLES.replace(/\./g,'.').replace(/\n/g,'')}</style></head><body>${html}</body></html>`, 'document.html', 'text/html')}
              style={{ padding:'5px 10px', borderRadius:6, cursor:'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.35)', display:'flex', alignItems:'center', gap:4, fontSize:10 }}>
              <Download size={10}/> .html
            </button>
          </div>
        </div>

        {/* Editor area */}
        <div style={{ display:'grid', gridTemplateColumns: view==='split' ? '1fr 1fr' : view==='editor' ? '1fr 0' : '0 1fr', gap:12, flex:1, overflow:'hidden', minHeight:0 }}>
          {/* Editor panel */}
          {view !== 'preview' && (
            <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>
                <Code size={10} style={{ display:'inline', marginRight:5 }}/>Markdown
              </div>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Tab') { e.preventDefault(); insertAt('  ') }
                }}
                spellCheck={false}
                style={{ flex:1, background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.8)', padding:'16px', borderRadius:12, fontSize:13, fontFamily:'monospace', resize:'none', outline:'none', lineHeight:1.7, overflowY:'auto' }}
              />
            </div>
          )}

          {/* Preview panel */}
          {view !== 'editor' && (
            <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ color:'rgba(255,255,255,0.25)', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:5 }}>
                <Eye size={10} style={{ display:'inline', marginRight:5 }}/>Preview
              </div>
              <div
                style={{ flex:1, background:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.07)', padding:'16px 20px', borderRadius:12, overflowY:'auto', lineHeight:1.7 }}
                dangerouslySetInnerHTML={{ __html: html || '<p style="color:rgba(255,255,255,0.2)">Escribe algo en el editor...</p>' }}
              />
            </div>
          )}
        </div>

        <div style={{ padding:'8px 0', color:'rgba(255,255,255,0.15)', fontSize:10, textAlign:'center' }}>
          {charCount} caracteres · Tab inserta 2 espacios · Atajos de barra de herramientas preservan selección
        </div>
      </div>
    </ToolShell>
  )
}
