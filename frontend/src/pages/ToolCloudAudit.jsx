import { useState } from 'react'
import ToolShell from '../components/ToolShell'
import { Copy, Check, Shield, ChevronDown, ChevronUp } from 'lucide-react'

const COLOR = '#60a5fa'

const COMMANDS = [
  {
    cat: '☁️ AWS — Reconocimiento y enumeración',
    items: [
      { cmd:'aws configure', desc:'Configurar credenciales AWS (Access Key ID + Secret) para CLI' },
      { cmd:'aws sts get-caller-identity', desc:'Verificar qué usuario/rol somos con las credenciales actuales' },
      { cmd:'aws iam list-users', desc:'Listar usuarios IAM (requiere permisos)' },
      { cmd:'aws iam list-attached-user-policies --user-name usuario', desc:'Ver políticas IAM de un usuario' },
      { cmd:'aws s3 ls', desc:'Listar todos los buckets S3 accesibles' },
      { cmd:'aws s3 ls s3://nombre-bucket --no-sign-request', desc:'Listar contenido de bucket S3 sin credenciales (buckets públicos)' },
      { cmd:'aws ec2 describe-instances --region eu-west-1', desc:'Listar instancias EC2 en una región' },
    ]
  },
  {
    cat: '🔍 ScoutSuite — Auditoría multi-cloud',
    items: [
      { cmd:'pip3 install scoutsuite', desc:'Instalar ScoutSuite (multi-cloud: AWS, Azure, GCP, Oracle)' },
      { cmd:'scout aws --report-dir ./reporte', desc:'Auditar cuenta AWS completa — genera reporte HTML' },
      { cmd:'scout azure --cli', desc:'Auditar Azure usando credenciales az CLI' },
      { cmd:'scout gcp --user-account --project ID_PROYECTO', desc:'Auditar proyecto Google Cloud' },
    ]
  },
  {
    cat: '🔧 Prowler — Compliance AWS',
    items: [
      { cmd:'pip3 install prowler', desc:'Instalar Prowler (CIS Benchmarks, SOC2, PCI, GDPR, HIPAA)' },
      { cmd:'prowler aws', desc:'Ejecutar todos los checks de seguridad AWS' },
      { cmd:'prowler aws --compliance cis_aws_foundations_benchmark_2.0', desc:'Verificar compliance CIS AWS' },
      { cmd:'prowler aws -c s3 iam -S', desc:'Solo checks de S3 e IAM, con score de riesgo' },
    ]
  },
  {
    cat: '⚔️ Pacu — AWS Exploitation Framework',
    items: [
      { cmd:'git clone https://github.com/RhinoSecurityLabs/pacu && cd pacu && pip3 install -r requirements.txt', desc:'Instalar Pacu' },
      { cmd:'python3 pacu.py', desc:'Iniciar Pacu interactive shell' },
      { cmd:'# run iam__enum_users_roles_policies_groups', desc:'Enumerar IAM completamente' },
      { cmd:'# run s3__bucket_finder', desc:'Descubrir buckets S3 (incluyendo públicos)' },
      { cmd:'# run aws__enum_account', desc:'Enumeración completa de la cuenta AWS' },
    ]
  },
  {
    cat: '🔵 Azure — Herramientas de auditoría',
    items: [
      { cmd:'az login', desc:'Login en Azure via navegador' },
      { cmd:'az account list', desc:'Listar suscripciones disponibles' },
      { cmd:'az ad user list', desc:'Listar usuarios de Azure AD' },
      { cmd:'pip3 install roadtools && roadrecon auth -t TENANT --prt', desc:'ROADtools — recopilación de datos Azure AD' },
      { cmd:'git clone https://github.com/nccgroup/ScoutSuite', desc:'ScoutSuite alternativo directo de GitHub' },
    ]
  },
  {
    cat: '🟢 GCP — Google Cloud auditoría',
    items: [
      { cmd:'gcloud auth login', desc:'Autenticarse en GCP' },
      { cmd:'gcloud projects list', desc:'Listar proyectos accesibles' },
      { cmd:'gcloud compute instances list', desc:'Listar VMs en Compute Engine' },
      { cmd:'gcloud storage ls', desc:'Listar Cloud Storage buckets' },
      { cmd:'gcloud storage ls --buckets gs://nombre-bucket', desc:'Listar contenido de bucket GCS' },
    ]
  },
]

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text || text.startsWith('#')) return null
  const copy = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(()=>setCopied(false),1500) }) }
  return (
    <button onClick={copy} style={{ padding:'4px 8px', borderRadius:6, cursor:'pointer', border:'none', transition:'all .15s', flexShrink:0,
      background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(96,165,250,0.12)', color: copied ? '#10b981' : '#60a5fa' }}>
      {copied ? <Check size={12}/> : <Copy size={12}/>}
    </button>
  )
}

export default function ToolCloudAudit() {
  const [open, setOpen] = useState({})
  const toggle = (cat) => setOpen(o => ({ ...o, [cat]: !o[cat] }))

  return (
    <ToolShell icon="☁️" name="Cloud Audit" color={COLOR} badge="AWS · Azure · GCP · ScoutSuite · Prowler · IAM · S3">
      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 24px' }}>

        <div style={{ display:'flex', gap:8, padding:'11px 14px', borderRadius:9, marginBottom:18,
          background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)',
          color:'rgba(255,255,255,0.5)', fontSize:11 }}>
          <Shield size={13} style={{ color:'#60a5fa', flexShrink:0, marginTop:1 }}/>
          <span>Auditoría cloud: IAM misconfigurations, buckets S3 públicos y credenciales hardcodeadas son los 3 vectores más explotados. Necesitas autorización del propietario de la cuenta cloud.</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:24 }}>
          {[
            { cloud:'AWS', color:'#f97316', icon:'🟠', tools:'ScoutSuite, Prowler, Pacu, aws-cli' },
            { cloud:'Azure', color:'#0078d4', icon:'🔵', tools:'ROADtools, ScoutSuite, az-cli' },
            { cloud:'GCP', color:'#34a853', icon:'🟢', tools:'ScoutSuite, gcloud, GCP Security Command Center' },
          ].map(c => (
            <div key={c.cloud} style={{ background:'rgba(255,255,255,0.03)', border:`1px solid rgba(255,255,255,0.08)`, borderRadius:12, padding:'14px 16px' }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{c.icon}</div>
              <div style={{ color:c.color, fontWeight:700, fontSize:13, marginBottom:4 }}>{c.cloud}</div>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{c.tools}</div>
            </div>
          ))}
        </div>

        {COMMANDS.map(cat => (
          <div key={cat.cat} style={{ marginBottom:10, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, overflow:'hidden' }}>
            <button onClick={()=>toggle(cat.cat)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:600, textAlign:'left' }}>
              {cat.cat}{open[cat.cat] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {open[cat.cat] && (
              <div style={{ padding:'0 12px 12px', display:'flex', flexDirection:'column', gap:8 }}>
                {cat.items.map((item,i) => (
                  <div key={i} style={{ background:'rgba(0,0,0,0.3)', borderRadius:9, padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom: item.desc ? 6 : 0 }}>
                      <code style={{ flex:1, fontSize:11, color: item.cmd.startsWith('#') ? 'rgba(255,255,255,0.3)' : '#93c5fd', fontFamily:'monospace', lineHeight:1.5 }}>{item.cmd}</code>
                      <CopyBtn text={item.cmd}/>
                    </div>
                    {item.desc && <div style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{item.desc}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

      </div>
    </ToolShell>
  )
}
