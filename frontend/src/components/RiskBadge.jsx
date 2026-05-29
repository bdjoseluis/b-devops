export default function RiskBadge({ level }) {
  const map = {
    'CRÍTICO': 'badge-red',
    'CRITICO': 'badge-red',
    'ALTO': 'badge-orange',
    'MEDIO': 'badge-yellow',
    'BAJO': 'badge-green',
    'INFO': 'badge-blue',
  }
  const cls = map[level?.toUpperCase()] || 'badge-gray'
  return <span className={cls}>{level}</span>
}
