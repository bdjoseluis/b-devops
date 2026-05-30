import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export const osint = {
  analyze: (target, modules = ['all']) =>
    api.post('/osint/analyze', { target, modules }).then(r => r.data),
  quick: (target) =>
    api.post('/osint/quick', { target }).then(r => r.data),
  detect: (target) =>
    api.get(`/osint/detect/${target}`).then(r => r.data),
}

export const scan = {
  nmap: (target, profile = 'quick', custom_flags = '', use_kali = false) =>
    api.post('/scan/nmap', { target, profile, custom_flags, use_kali }).then(r => r.data),
  kali: (tool, target, custom_cmd = '') =>
    api.post('/scan/kali', { tool, target, custom_cmd }).then(r => r.data),
  kaliRaw: (command) =>
    api.post('/scan/kali/raw', { command }).then(r => r.data),
  kaliTools: () =>
    api.get('/scan/kali/tools').then(r => r.data),
  profiles: () =>
    api.get('/scan/profiles').then(r => r.data),
  shodan: (target, type = 'ip', limit = 10) =>
    api.post('/scan/shodan', { target, type, limit }).then(r => r.data),
}

export const ai = {
  chat: (session_id, message, context = {}) =>
    api.post('/ai/chat', { session_id, message, context }).then(r => r.data),
  analyze: (target, data, analysis_type = 'osint') =>
    api.post('/ai/analyze', { target, data, analysis_type }).then(r => r.data),
  clearSession: (session_id) =>
    api.delete(`/ai/session/${session_id}`).then(r => r.data),
}

export const reports = {
  generate: (target, data, include_ai = true) =>
    api.post('/reports/generate', { target, data, include_ai }).then(r => r.data),
  list: () =>
    api.get('/reports/list').then(r => r.data),
  downloadUrl: (filename) => `/api/reports/download/${filename}`,
}

export const settings = {
  get: () => api.get('/settings').then(r => r.data),
  getRaw: () => api.get('/settings/raw').then(r => r.data),
  update: (body) => api.post('/settings', body).then(r => r.data),
  updateApis: (body) => api.post('/settings/apis', body).then(r => r.data),
  updateAuditor: (body) => api.post('/settings/auditor', body).then(r => r.data),
  updateKali: (body) => api.post('/settings/kali', body).then(r => r.data),
  testKali: () => api.get('/settings/kali/test').then(r => r.data),
  updateSmtp: (body) => api.post('/settings/smtp', body).then(r => r.data),
  testSmtp: () => api.get('/settings/smtp/test').then(r => r.data),
  dashboardStats: () => api.get('/settings/dashboard/stats').then(r => r.data),
}

export const devops = {
  stackStatus:     () => api.get('/devops/stack-status').then(r => r.data),
  summary:         () => api.get('/devops/summary').then(r => r.data),
  servicesHealth:  () => api.get('/devops/services/health').then(r => r.data),
  analyticsStats:  () => api.get('/devops/analytics/stats').then(r => r.data),
  analyticsRecent: (limit = 20) => api.get(`/devops/analytics/recent?limit=${limit}`).then(r => r.data),
  analyticsDaily:  (days = 30)  => api.get(`/devops/analytics/daily?days=${days}`).then(r => r.data),
}

export const health = {
  check: () => api.get('/health').then(r => r.data),
}

export const auth = {
  verifyAdmin: (pin) => api.post('/auth/verify-admin', { pin }).then(r => r.data),
  changeAdminPin: (current, new_pin) => api.post('/auth/change-admin-pin', { current, new_pin }).then(r => r.data),
  changePassword: (new_password) => api.post('/auth/change-password', { new_password }).then(r => r.data),
  register: (username, email, password, reason = '') =>
    api.post('/auth/register', { username, email, password, reason }).then(r => r.data),
  listUsers: () => api.get('/auth/users').then(r => r.data),
  approveUser: (user_id) => api.post(`/auth/approve/${user_id}`).then(r => r.data),
  rejectUser: (user_id) => api.post(`/auth/reject/${user_id}`).then(r => r.data),
  deleteUser: (user_id) => api.delete(`/auth/users/${user_id}`).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
}

export const tools = {
  // Censys
  censysIp: (ip) => api.post('/tools/censys/ip', { ip }).then(r => r.data),
  censysDomain: (domain) => api.post('/tools/censys/domain', { domain }).then(r => r.data),
  censysSearch: (query, limit = 10) => api.post('/tools/censys/search', { query, limit }).then(r => r.data),
  // DeHashed
  dehashed: (query, type = 'email', size = 10) => api.post('/tools/dehashed/search', { query, type, size }).then(r => r.data),
  // WhatsMyName
  whatsmyname: (username, categories = null, limit = 150) =>
    api.post('/tools/whatsmyname', { username, categories, limit }, { timeout: 180000 }).then(r => r.data),
  wmncategories: () => api.get('/tools/whatsmyname/categories').then(r => r.data),
  // Wayback
  waybackCheck: (url) => api.post('/tools/wayback/check', { url }).then(r => r.data),
  waybackSnapshots: (url, limit = 20, from_year, to_year) =>
    api.post('/tools/wayback/snapshots', { url, limit, from_year, to_year }).then(r => r.data),
  waybackTimeline: (url) => api.post('/tools/wayback/timeline', { url }).then(r => r.data),
  // C99
  c99Subdomains: (domain) => api.post('/tools/c99/subdomains', { domain }).then(r => r.data),
  c99ReverseIp: (ip) => api.post('/tools/c99/reverseip', { ip }).then(r => r.data),
  c99Phone: (phone) => api.post('/tools/c99/phone', { phone }).then(r => r.data),
  c99PortScan: (host, ports) => api.post('/tools/c99/portscan', { host, ports }).then(r => r.data),
  // LeakRadar
  leakradarEmail: (email) => api.post('/tools/leakradar/email', { email }).then(r => r.data),
  leakradarDomain: (domain) => api.post('/tools/leakradar/domain', { domain }).then(r => r.data),
  // URLScan.io
  urlscanScan: (url, visibility = 'unlisted') =>
    api.post('/tools/urlscan/scan', { url, visibility }, { timeout: 60000 }).then(r => r.data),
  urlscanSubmit: (url, visibility = 'unlisted') =>
    api.post('/tools/urlscan/submit', { url, visibility }).then(r => r.data),
  urlscanResult: (uuid) => api.get(`/tools/urlscan/result/${uuid}`).then(r => r.data),
  urlscanSearchDomain: (domain, size = 10) =>
    api.post('/tools/urlscan/search/domain', { domain, size }).then(r => r.data),
  urlscanSearchIp: (ip, size = 10) =>
    api.post('/tools/urlscan/search/ip', { ip, size }).then(r => r.data),
  // BGP / ASN
  bgpIp: (ip) => api.post('/tools/bgp/ip', { ip }).then(r => r.data),
  bgpAsn: (asn) => api.post('/tools/bgp/asn', { asn }).then(r => r.data),
  bgpPrefixes: (asn) => api.post('/tools/bgp/prefixes', { asn }).then(r => r.data),
  bgpPeers: (asn) => api.post('/tools/bgp/peers', { asn }).then(r => r.data),
  // SecurityTrails
  stDomain: (domain) => api.post('/tools/securitytrails/domain', { domain }).then(r => r.data),
  stSubdomains: (domain) => api.post('/tools/securitytrails/subdomains', { domain }).then(r => r.data),
  stHistory: (domain, type = 'a') => api.post('/tools/securitytrails/history', { domain, type }).then(r => r.data),
  stAssociated: (domain) => api.post('/tools/securitytrails/associated', { domain }).then(r => r.data),
  stIp: (ip) => api.post('/tools/securitytrails/ip', { ip }).then(r => r.data),
}

export const tempmail = {
  create: (session_id = 'default', alias = null) =>
    api.post('/tempmail/create', { session_id, alias }).then(r => r.data),
  createCustom: (login, domain, session_id = 'default') =>
    api.post('/tempmail/create-custom', { login, domain, session_id }).then(r => r.data),
  inbox: (session_id = 'default') =>
    api.get(`/tempmail/inbox/${session_id}`).then(r => r.data),
  readMessage: (session_id, message_id) =>
    api.get(`/tempmail/message/${session_id}/${message_id}`).then(r => r.data),
  waitForEmail: (session_id = 'default', timeout = 60) =>
    api.post('/tempmail/wait', { session_id, timeout }, { timeout: 90000 }).then(r => r.data),
  sessions: () => api.get('/tempmail/sessions').then(r => r.data),
  deleteSession: (session_id) => api.delete(`/tempmail/session/${session_id}`).then(r => r.data),
  domains: () => api.get('/tempmail/domains').then(r => r.data),
}

export const audit = {
  full: (target, auto_report = true) =>
    api.post('/audit/full', { target, auto_report }, { timeout: 180000 }).then(r => r.data),
  detect: (target) =>
    api.post('/audit/detect', { target }).then(r => r.data),
  webhook: (target, callback_url = null) =>
    api.post('/audit/webhook', { target, auto_report: true, callback_url }, { timeout: 180000 }).then(r => r.data),
}

export const monitor = {
  check: (url) => api.post('/monitor/check', { url }).then(r => r.data),
  batch: (urls) => api.post('/monitor/batch', { urls }, { timeout: 30000 }).then(r => r.data),
}

export const clients = {
  list:   ()           => api.get('/clients').then(r => r.data),
  create: (body)       => api.post('/clients', body).then(r => r.data),
  update: (id, body)   => api.put(`/clients/${id}`, body).then(r => r.data),
  remove: (id)         => api.delete(`/clients/${id}`).then(r => r.data),
  stats:  ()           => api.get('/clients/stats').then(r => r.data),
}

export const prospector = {
  search: (location, category = 'empresa', radius_km = 10, limit = 30) =>
    api.post('/prospector/search', { location, category, radius_km, limit }, { timeout: 120000 }).then(r => r.data),
  analyze: (website) =>
    api.post('/prospector/analyze', { website }).then(r => r.data),
  province: (province, category = 'empresa', radius_km = 5, limit_per_city = 15, max_cities = 8) =>
    api.post('/prospector/province', { province, category, radius_km, limit_per_city, max_cities }, { timeout: 180000 }).then(r => r.data),
  provinces: () =>
    api.get('/prospector/provinces').then(r => r.data),
}

export const outreach = {
  search:        (body)        => api.post('/outreach/search', body, { timeout: 180000 }).then(r => r.data),
  list:          (params = {}) => api.get('/outreach', { params }).then(r => r.data),
  stats:         ()            => api.get('/outreach/stats').then(r => r.data),
  get:           (id)          => api.get(`/outreach/${id}`).then(r => r.data),
  addManual:     (body)        => api.post('/outreach/manual', body).then(r => r.data),
  generateEmail: (id)          => api.post(`/outreach/${id}/generate-email`, {}, { timeout: 60000 }).then(r => r.data),
  send:          (id, to)      => api.post(`/outreach/${id}/send`, { to_email: to }).then(r => r.data),
  updateStatus:  (id, status, notes) => api.put(`/outreach/${id}/status`, { status, notes }).then(r => r.data),
  update:        (id, body)    => api.put(`/outreach/${id}`, body).then(r => r.data),
  remove:        (id)          => api.delete(`/outreach/${id}`).then(r => r.data),
}

export default api
