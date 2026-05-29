import { useState, useCallback } from 'react'
import ToolShell from '../components/ToolShell'
import { Hash, Copy, CheckCircle, RefreshCw, Upload } from 'lucide-react'

const COLOR = '#ec4899'

// WebCrypto hash algorithms
const ALGOS = [
  { id:'SHA-1',   name:'SHA-1',   bits:160, warn:true,  note:'Obsoleto — solo compatibilidad' },
  { id:'SHA-256', name:'SHA-256', bits:256, warn:false,  note:'Estándar de seguridad' },
  { id:'SHA-384', name:'SHA-384', bits:384, warn:false,  note:'Alta seguridad' },
  { id:'SHA-512', name:'SHA-512', bits:512, warn:false,  note:'Máxima seguridad' },
]

// MD5 implementation (pure JS — not in WebCrypto)
function md5(inputStr) {
  function safeAdd(x, y) { const lsw=(x&0xFFFF)+(y&0xFFFF); const msw=(x>>16)+(y>>16)+(lsw>>16); return (msw<<16)|(lsw&0xFFFF) }
  function bitRotateLeft(num,cnt) { return (num<<cnt)|(num>>>(32-cnt)) }
  function md5cmn(q,a,b,x,s,t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b) }
  function md5ff(a,b,c,d,x,s,t) { return md5cmn((b&c)|((~b)&d),a,b,x,s,t) }
  function md5gg(a,b,c,d,x,s,t) { return md5cmn((b&d)|(c&(~d)),a,b,x,s,t) }
  function md5hh(a,b,c,d,x,s,t) { return md5cmn(b^c^d,a,b,x,s,t) }
  function md5ii(a,b,c,d,x,s,t) { return md5cmn(c^(b|(~d)),a,b,x,s,t) }

  let str = unescape(encodeURIComponent(inputStr))
  let binaryArray = []
  for (let i=0;i<str.length*8;i+=8) binaryArray[i>>5]|=(str.charCodeAt(i/8)&0xFF)<<(i%32)
  binaryArray[str.length*8>>5]|=0x80<<(str.length*8%32)
  binaryArray[((str.length*8+64>>>9)<<4)+14]=str.length*8
  let a=1732584193,b=-271733879,c=-1732584194,d=271733878
  for (let i=0;i<binaryArray.length;i+=16) {
    let [aa,bb,cc,dd]=[a,b,c,d]
    const x=binaryArray.slice(i,i+16)
    a=md5ff(a,b,c,d,x[0],7,-680876936);d=md5ff(d,a,b,c,x[1],12,-389564586);c=md5ff(c,d,a,b,x[2],17,606105819);b=md5ff(b,c,d,a,x[3],22,-1044525330)
    a=md5ff(a,b,c,d,x[4],7,-176418897);d=md5ff(d,a,b,c,x[5],12,1200080426);c=md5ff(c,d,a,b,x[6],17,-1473231341);b=md5ff(b,c,d,a,x[7],22,-45705983)
    a=md5ff(a,b,c,d,x[8],7,1770035416);d=md5ff(d,a,b,c,x[9],12,-1958414417);c=md5ff(c,d,a,b,x[10],17,-42063);b=md5ff(b,c,d,a,x[11],22,-1990404162)
    a=md5ff(a,b,c,d,x[12],7,1804603682);d=md5ff(d,a,b,c,x[13],12,-40341101);c=md5ff(c,d,a,b,x[14],17,-1502002290);b=md5ff(b,c,d,a,x[15],22,1236535329)
    a=md5gg(a,b,c,d,x[1],5,-165796510);d=md5gg(d,a,b,c,x[6],9,-1069501632);c=md5gg(c,d,a,b,x[11],14,643717713);b=md5gg(b,c,d,a,x[0],20,-373897302)
    a=md5gg(a,b,c,d,x[5],5,-701558691);d=md5gg(d,a,b,c,x[10],9,38016083);c=md5gg(c,d,a,b,x[15],14,-660478335);b=md5gg(b,c,d,a,x[4],20,-405537848)
    a=md5gg(a,b,c,d,x[9],5,568446438);d=md5gg(d,a,b,c,x[14],9,-1019803690);c=md5gg(c,d,a,b,x[3],14,-187363961);b=md5gg(b,c,d,a,x[8],20,1163531501)
    a=md5gg(a,b,c,d,x[13],5,-1444681467);d=md5gg(d,a,b,c,x[2],9,-51403784);c=md5gg(c,d,a,b,x[7],14,1735328473);b=md5gg(b,c,d,a,x[12],20,-1926607734)
    a=md5hh(a,b,c,d,x[5],4,-378558);d=md5hh(d,a,b,c,x[8],11,-2022574463);c=md5hh(c,d,a,b,x[11],16,1839030562);b=md5hh(b,c,d,a,x[14],23,-35309556)
    a=md5hh(a,b,c,d,x[1],4,-1530992060);d=md5hh(d,a,b,c,x[4],11,1272893353);c=md5hh(c,d,a,b,x[7],16,-155497632);b=md5hh(b,c,d,a,x[10],23,-1094730640)
    a=md5hh(a,b,c,d,x[13],4,681279174);d=md5hh(d,a,b,c,x[0],11,-358537222);c=md5hh(c,d,a,b,x[3],16,-722521979);b=md5hh(b,c,d,a,x[6],23,76029189)
    a=md5hh(a,b,c,d,x[9],4,-640364487);d=md5hh(d,a,b,c,x[12],11,-421815835);c=md5hh(c,d,a,b,x[15],16,530742520);b=md5hh(b,c,d,a,x[2],23,-995338651)
    a=md5ii(a,b,c,d,x[0],6,-198630844);d=md5ii(d,a,b,c,x[7],10,1126891415);c=md5ii(c,d,a,b,x[14],15,-1416354905);b=md5ii(b,c,d,a,x[5],21,-57434055)
    a=md5ii(a,b,c,d,x[12],6,1700485571);d=md5ii(d,a,b,c,x[3],10,-1894986606);c=md5ii(c,d,a,b,x[10],15,-1051523);b=md5ii(b,c,d,a,x[1],21,-2054922799)
    a=md5ii(a,b,c,d,x[8],6,1873313359);d=md5ii(d,a,b,c,x[15],10,-30611744);c=md5ii(c,d,a,b,x[6],15,-1560198380);b=md5ii(b,c,d,a,x[13],21,1309151649)
    a=md5ii(a,b,c,d,x[4],6,-145523070);d=md5ii(d,a,b,c,x[11],10,-1120210379);c=md5ii(c,d,a,b,x[2],15,718787259);b=md5ii(b,c,d,a,x[9],21,-343485551)
    a=safeAdd(a,aa);b=safeAdd(b,bb);c=safeAdd(c,cc);d=safeAdd(d,dd)
  }
  return [a,b,c,d].map(n => ('00000000'+((n<0)?(n+4294967296):n).toString(16)).slice(-8)).join('')
}

async function computeHash(text, algo) {
  if (algo === 'MD5') return md5(text)
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
}

async function computeFileHash(file, algo) {
  const buf = await file.arrayBuffer()
  if (algo === 'MD5') {
    const text = new TextDecoder().decode(buf)
    return md5(text)
  }
  const hash = await crypto.subtle.digest(algo, buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('')
}

export default function ToolHashGen() {
  const [input,   setInput]   = useState('')
  const [hashes,  setHashes]  = useState({})
  const [loading, setLoading] = useState(false)
  const [copied,  setCopied]  = useState('')
  const [mode,    setMode]    = useState('text') // text | file
  const [file,    setFile]    = useState(null)
  const [verify,  setVerify]  = useState('')
  const fileRef = useRef ? null : null

  const compute = useCallback(async (text, f) => {
    if (mode === 'text' && !text.trim()) { setHashes({}); return }
    if (mode === 'file' && !f) return
    setLoading(true)
    const results = {}
    const allAlgos = ['MD5', ...ALGOS.map(a => a.id)]
    for (const algo of allAlgos) {
      try {
        results[algo] = mode === 'file' ? await computeFileHash(f, algo) : await computeHash(text, algo)
      } catch { results[algo] = 'Error' }
    }
    setHashes(results)
    setLoading(false)
  }, [mode])

  const handleTextChange = (v) => {
    setInput(v)
    compute(v, file)
  }

  const handleFile = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    compute('', f)
  }

  const copy = (v) => {
    navigator.clipboard.writeText(v).catch(() => {})
    setCopied(v); setTimeout(() => setCopied(''), 1500)
  }

  const allAlgos = [{ id:'MD5', warn:true, bits:128, note:'Obsoleto pero ampliamente usado' }, ...ALGOS]

  return (
    <ToolShell icon="🧮" name="Hash Generator" color={COLOR} badge="MD5 · SHA-1 · SHA-256 · SHA-512 · Verificación">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Mode */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {[['text','📝 Texto'],['file','📄 Archivo']].map(([v,l]) => (
            <button key={v} onClick={() => { setMode(v); setHashes({}); setInput(''); setFile(null) }}
              style={{ padding:'8px 16px', borderRadius:9, cursor:'pointer', background: mode === v ? 'rgba(236,72,153,0.15)':'rgba(255,255,255,0.04)', border:`1px solid ${mode === v ? 'rgba(236,72,153,0.4)':'rgba(255,255,255,0.1)'}`, color: mode === v ? COLOR:'rgba(255,255,255,0.4)', fontWeight: mode === v ? 700:400, fontSize:12 }}>
              {l}
            </button>
          ))}
        </div>

        {mode === 'text' ? (
          <textarea
            value={input}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="Escribe o pega el texto para hashear..."
            style={{ width:'100%', boxSizing:'border-box', minHeight:100, background:'rgba(236,72,153,0.05)', border:'1px solid rgba(236,72,153,0.25)', color:'#fff', padding:'14px', borderRadius:12, fontSize:13, fontFamily:'monospace', resize:'none', outline:'none', lineHeight:1.6, marginBottom:20 }}
          />
        ) : (
          <div style={{ marginBottom:20 }}>
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px', borderRadius:12, border:'2px dashed rgba(236,72,153,0.3)', background:'rgba(236,72,153,0.04)', cursor:'pointer', gap:8 }}>
              <Upload size={24} style={{ color:'rgba(236,72,153,0.6)' }}/>
              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>{file ? file.name : 'Arrastra un archivo o haz clic para seleccionar'}</span>
              {file && <span style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>{(file.size / 1024).toFixed(1)} KB</span>}
              <input type="file" style={{ display:'none' }} onChange={handleFile}/>
            </label>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign:'center', padding:'20px', color:'rgba(255,255,255,0.4)', fontSize:12 }}>
            <RefreshCw size={16} style={{ animation:'spin 1s linear infinite', display:'inline-block', marginRight:6 }}/>
            Calculando hashes...
          </div>
        )}

        {/* Results */}
        {Object.keys(hashes).length > 0 && !loading && (
          <>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              {allAlgos.map(algo => {
                const hash = hashes[algo.id]
                if (!hash) return null
                const verifyMatch = verify && hash.toLowerCase() === verify.trim().toLowerCase()
                const verifyFail  = verify && !verifyMatch
                return (
                  <div key={algo.id} style={{ padding:'12px 16px', borderRadius:12, background: verifyMatch ? 'rgba(16,185,129,0.08)' : verifyFail ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)', border:`1px solid ${verifyMatch ? 'rgba(16,185,129,0.3)' : verifyFail ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:700, minWidth:70 }}>{algo.id}</span>
                      <span style={{ fontSize:9, padding:'1px 6px', borderRadius:3, background: algo.warn ? 'rgba(245,158,11,0.15)':'rgba(16,185,129,0.1)', color: algo.warn ? '#fbbf24':'#10b981' }}>
                        {algo.bits}b
                      </span>
                      {algo.warn && <span style={{ fontSize:9, color:'rgba(245,158,11,0.6)' }}>⚠ {algo.note}</span>}
                      <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                        {verifyMatch && <span style={{ color:'#10b981', fontSize:11 }}>✓ Coincide</span>}
                        {verifyFail  && <span style={{ color:'#ef4444', fontSize:11 }}>✗ No coincide</span>}
                        <button onClick={() => copy(hash)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', padding:0, display:'flex' }}>
                          {copied === hash ? <CheckCircle size={13} style={{ color:'#10b981' }}/> : <Copy size={13}/>}
                        </button>
                      </div>
                    </div>
                    <div style={{ fontFamily:'monospace', color:'rgba(255,255,255,0.7)', fontSize:12, wordBreak:'break-all' }}>{hash}</div>
                  </div>
                )
              })}
            </div>

            {/* Verify hash */}
            <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11, marginBottom:8 }}>🔍 Verificar hash — pega un hash conocido para comparar</div>
              <input
                value={verify}
                onChange={e => setVerify(e.target.value)}
                placeholder="5f4dcc3b5aa765d61d8327deb882cf99"
                style={{ width:'100%', boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'9px 12px', borderRadius:8, fontSize:12, fontFamily:'monospace', outline:'none' }}
              />
            </div>
          </>
        )}

        {!Object.keys(hashes).length && !loading && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.2)', fontSize:13 }}>
            {mode === 'text' ? 'Escribe un texto para ver los hashes al instante' : 'Selecciona un archivo para calcular sus hashes'}
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
