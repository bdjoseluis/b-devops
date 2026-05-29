import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { scan } from '../api/client'
import { Play, Loader2, AlertCircle, Shield, Hash, Search } from 'lucide-react'

const COLOR = '#ec4899'

const HASH_TYPES = [
  { id:'0',    label:'MD5' },
  { id:'100',  label:'SHA1' },
  { id:'1400', label:'SHA256' },
  { id:'1700', label:'SHA512' },
  { id:'1800', label:'SHA512crypt ($6$)' },
  { id:'3200', label:'bcrypt ($2*$)' },
  { id:'5600', label:'NetNTLMv2' },
  { id:'5500', label:'NetNTLMv1' },
  { id:'1000', label:'NTLM' },
  { id:'1000', label:'LM' },
  { id:'2500', label:'WPA/WPA2' },
  { id:'13100',label:'Kerberoast TGS' },
]

const ATTACKS = [
  { id:'0', label:'Dictionary',     desc:'Ataque de diccionario' },
  { id:'1', label:'Combination',    desc:'Combinar dos wordlists' },
  { id:'3', label:'Brute-Force',    desc:'Máscara de fuerza bruta' },
  { id:'6', label:'Hybrid Wordlist+Mask', desc:'Wordlist + máscara' },
]

export default function ToolHashcat() {
  const [hash,     setHash]     = useState('')
  const [hashfile, setHashfile] = useState('')
  const [type,     setType]     = useState('0')
  const [attack,   setAttack]   = useState('0')
  const [wordlist, setWordlist] = useState('/usr/share/wordlists/rockyou.txt')
  const [mask,     setMask]     = useState('?a?a?a?a?a?a?a?a')
  const [rules,    setRules]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const [error,    setError]    = useState('')

  const buildCmd = () => {
    let target = hash ? hash.trim() : (hashfile ? hashfile.trim() : '')
    let cmd = `hashcat -m ${type} -a ${attack}`
    if (hash)     cmd += ` -hash "${hash.trim()}"`
    if (hashfile) cmd += ` "${hashfile.trim()}"`
    if (attack === '0' || attack === '6') cmd += ` "${wordlist}"`
    if (attack === '3' || attack === '6') cmd += ` "${mask}"`
    if (rules)    cmd += ` -r ${rules}`
    cmd += ' --show 2>/dev/null || hashcat -m ' + type + ' -a ' + attack
    if (hash)     cmd += ` --hash "${hash.trim()}"`
    if (hashfile) cmd += ` "${hashfile.trim()}"`
    if (attack === '0') cmd += ` "${wordlist}"`
    if (attack === '3') cmd += ` "${mask}"`
    if (rules)    cmd += ` -r ${rules}`
    cmd += ' --potfile-disable --force'
    return cmd
  }

  const run = async (e) => {
    e.preventDefault()
    if ((!hash && !hashfile) || loading) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await scan.kaliRaw(buildCmd())
      setResult(res)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error: Requiere Kali SSH configurado con GPU/CPU')
    } finally { setLoading(false) }
  }

  const Input = ({ label, value, onChange, ...p }) => (
    <div>
      <label style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6, display:'block' }}>{label}</label>
      <input value={value} onChange={onChange} {...p}
        style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', padding:'10px 14px', borderRadius:9, fontSize:13, outline:'none', boxSizing:'border-box', ...p.style }}/>
    </div>
  )

  return (
    <ToolShell icon="💎" name="Hashcat" color={COLOR} badge="Cracking de hashes por GPU · WPA · NTLM · MD5">
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:20, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#f87171', flexShrink:0, marginTop:1 }}/>
          Uso exclusivo en sistemas propios o con autorización escrita.
        </div>

        <form onSubmit={run}>
          {/* Hash type */}
          <div style={{ marginBottom:16 }}>
            <label style={{ color:'rgba(255,255,255,0.4)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, display:'block' }}>Tipo de Hash</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {HASH_TYPES.map(h=>(
                <button key={h.id+h.label} type="button" onClick={()=>setType(h.id)} style={{
                  padding:'5px 10px', borderRadius:6, fontSize:11, cursor:'pointer',
                  background: type===h.id ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.05)',
                  border: type===h.id ? '1px solid rgba(236,72,153,0.45)' : '1px solid rgba(255,255,255,0.08)',
                  color: type===h.id ? COLOR : 'rgba(255,255,255,0.45)',
                }}>{h.label}</button>
              ))}
            </div>
          </div>

          {/* Attack mode */}
          <div style={{ display:'flex', gap:6, marginBottom:16 }}>
            {ATTACKS.map(a=>(
              <button key={a.id} type="button" onClick={()=>setAttack(a.id)} title={a.desc} style={{
                padding:'6px 12px', borderRadius:7, fontSize:11, cursor:'pointer',
                background: attack===a.id ? 'rgba(236,72,153,0.15)' : 'rgba(255,255,255,0.05)',
                border: attack===a.id ? '1px solid rgba(236,72,153,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: attack===a.id ? COLOR : 'rgba(255,255,255,0.45)',
              }}>{a.label}</button>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
            <Input label="Hash a crackear" value={hash} onChange={e=>setHash(e.target.value)} placeholder="5f4dcc3b5aa765d61d8327deb882cf99"/>
            <Input label="O archivo de hashes (ruta)" value={hashfile} onChange={e=>setHashfile(e.target.value)} placeholder="/tmp/hashes.txt"/>
            {(attack==='0'||attack==='6') && <Input label="Wordlist" value={wordlist} onChange={e=>setWordlist(e.target.value)} style={{ fontFamily:'monospace' }}/>}
            {(attack==='3'||attack==='6') && <Input label="Máscara" value={mask} onChange={e=>setMask(e.target.value)} placeholder="?a?a?a?a?a?a (min 6)" style={{ fontFamily:'monospace' }}/>}
            <Input label="Rules (opcional)" value={rules} onChange={e=>setRules(e.target.value)} placeholder="/usr/share/hashcat/rules/best64.rule" style={{ fontFamily:'monospace' }}/>
          </div>

          <div style={{ background:'rgba(0,0,0,0.4)', border:'1px solid rgba(236,72,153,0.2)', borderRadius:9, padding:'10px 14px', fontFamily:'monospace', color:'rgba(236,72,153,0.85)', fontSize:11, marginBottom:16, wordBreak:'break-all' }}>
            <span style={{ color:'rgba(255,255,255,0.3)', marginRight:8 }}>$</span>{buildCmd()}
          </div>

          <button type="submit" disabled={(!hash&&!hashfile)||loading} style={{
            padding:'11px 24px', borderRadius:10, cursor:'pointer', display:'flex', alignItems:'center', gap:8,
            background:'rgba(236,72,153,0.18)', border:'1px solid rgba(236,72,153,0.45)',
            color:COLOR, fontWeight:700, fontSize:13,
          }}>
            {loading ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Hash size={14}/>}
            {loading ? 'Crackeando...' : 'Ejecutar Hashcat'}
          </button>
        </form>

        {error && <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, marginTop:20, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5', fontSize:13 }}><AlertCircle size={14}/>{error}</div>}
        {result && (
          <pre style={{ marginTop:20, background:'rgba(0,0,0,0.6)', border:'1px solid rgba(236,72,153,0.15)', borderRadius:10, padding:16, color:'#fbcfe8', fontSize:11, lineHeight:1.8, maxHeight:500, overflowY:'auto', whiteSpace:'pre-wrap', fontFamily:'monospace' }}>
            {result.output || result.raw_output || JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </ToolShell>
  )
}
