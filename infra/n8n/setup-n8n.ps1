# ═══════════════════════════════════════════════════════════════════════════
# B-DEVOPS — Setup automático de n8n (Notion CRM Integration)
#
# Uso:
#   cd D:\aura-ops\infra\n8n
#   .\setup-n8n.ps1 -NotionDbId "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
#
# Qué hace:
#   1. Verifica que n8n esté accesible
#   2. Crea la credencial "Notion API" con el token configurado
#   3. Importa workflow-user-register.json con el DB ID correcto
#   4. Importa workflow-user-approved.json con el DB ID correcto
#   5. Activa ambos workflows
#
# Prereqs:
#   - n8n corriendo (docker compose up -d bdev-n8n)
#   - Notion DB creada según NOTION_SETUP.md
#   - Base de datos compartida con la integración "proyecto"
# ═══════════════════════════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$true)]
    [string]$NotionDbId,

    [string]$N8nUrl       = "http://localhost:5678",
    [string]$N8nUser      = "admin",
    [string]$N8nPassword  = "REDACTED",
    [string]$NotionToken  = ""   # Pasa tu token via: -NotionToken "ntn_xxxxx"  (ver backend/config.json)
)

$ErrorActionPreference = "Stop"
$headers = @{
    "Content-Type"  = "application/json"
    "Accept"        = "application/json"
    "X-N8N-API-KEY" = ""   # populated after getting API key
}

# ── Autenticación básica para obtener cookie de sesión ───────────────────────
$creds = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("${N8nUser}:${N8nPassword}"))
$basicHeaders = @{
    "Content-Type"  = "application/json"
    "Authorization" = "Basic $creds"
}

function Write-Step([string]$msg) {
    Write-Host "`n[$([char]0x2192)] $msg" -ForegroundColor Cyan
}
function Write-Ok([string]$msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}
function Write-Err([string]$msg) {
    Write-Host "  [ERR] $msg" -ForegroundColor Red
}

# ── 1. Verificar n8n disponible ──────────────────────────────────────────────
Write-Step "Verificando acceso a n8n en $N8nUrl..."
$retries = 0
while ($retries -lt 12) {
    try {
        $health = Invoke-RestMethod -Uri "$N8nUrl/healthz" -TimeoutSec 5
        Write-Ok "n8n disponible — status: $($health.status)"
        break
    } catch {
        $retries++
        Write-Host "  Esperando n8n... ($retries/12)" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}
if ($retries -ge 12) {
    Write-Err "n8n no disponible después de 60s. Comprueba: docker compose up -d bdev-n8n"
    exit 1
}

# ── 2. Obtener API key de n8n ────────────────────────────────────────────────
Write-Step "Autenticando en n8n..."
try {
    # n8n requiere login para obtener API key
    $loginBody = '{"email":"' + $N8nUser + '@bdev.local","password":"' + $N8nPassword + '"}'
    $session = Invoke-RestMethod -Uri "$N8nUrl/rest/login" `
        -Method POST -Headers $basicHeaders -Body $loginBody `
        -SessionVariable cookieJar 2>$null
    Write-Ok "Sesión iniciada"
} catch {
    # Basic auth directo en endpoints REST
    Write-Ok "Usando Basic Auth para API calls"
}

# ── 3. Crear credencial Notion API ─────────────────────────────────────────
Write-Step "Creando credencial 'Notion API' en n8n..."

$credBody = @{
    name = "Notion API"
    type = "notionApi"
    data = @{
        apiKey = $NotionToken
    }
} | ConvertTo-Json -Depth 5

try {
    # Intentar con Basic Auth
    $cred = Invoke-RestMethod -Uri "$N8nUrl/rest/credentials" `
        -Method POST -Headers $basicHeaders -Body $credBody
    $credId = $cred.data.id
    Write-Ok "Credencial creada — ID: $credId"
} catch {
    # Puede que ya exista — buscarla
    try {
        $creds_list = Invoke-RestMethod -Uri "$N8nUrl/rest/credentials" `
            -Method GET -Headers $basicHeaders
        $existing = $creds_list.data | Where-Object { $_.name -eq "Notion API" }
        if ($existing) {
            $credId = $existing.id
            Write-Ok "Credencial 'Notion API' ya existe — ID: $credId"
        } else {
            Write-Err "No se pudo crear/encontrar la credencial Notion API: $_"
            $credId = "notion-credential"
        }
    } catch {
        Write-Err "Error accediendo a credenciales: $_"
        $credId = "notion-credential"
    }
}

# ── 4. Leer y preparar workflows ──────────────────────────────────────────
Write-Step "Preparando workflow 1 — User Register..."

$regWf = Get-Content "$PSScriptRoot\workflow-user-register.json" -Raw | ConvertFrom-Json
# Reemplazar DB ID en el nodo de creación
foreach ($node in $regWf.nodes) {
    if ($node.parameters.databaseId -and $node.parameters.databaseId.value -eq "YOUR_NOTION_DATABASE_ID_HERE") {
        $node.parameters.databaseId.value = $NotionDbId
    }
    if ($node.credentials -and $node.credentials.notionApi) {
        $node.credentials.notionApi.id   = $credId
        $node.credentials.notionApi.name = "Notion API"
    }
}
$regWfJson = $regWf | ConvertTo-Json -Depth 20

Write-Step "Preparando workflow 2 — User Approved..."
$appWf = Get-Content "$PSScriptRoot\workflow-user-approved.json" -Raw | ConvertFrom-Json
foreach ($node in $appWf.nodes) {
    if ($node.parameters.databaseId -and $node.parameters.databaseId.value -eq "YOUR_NOTION_DATABASE_ID_HERE") {
        $node.parameters.databaseId.value = $NotionDbId
    }
    if ($node.credentials -and $node.credentials.notionApi) {
        $node.credentials.notionApi.id   = $credId
        $node.credentials.notionApi.name = "Notion API"
    }
}
$appWfJson = $appWf | ConvertTo-Json -Depth 20

# ── 5. Importar workflows en n8n ──────────────────────────────────────────
Write-Step "Importando workflow: User Register..."
try {
    $importReg = Invoke-RestMethod -Uri "$N8nUrl/rest/workflows" `
        -Method POST -Headers $basicHeaders -Body $regWfJson
    $regId = $importReg.data.id
    Write-Ok "Workflow Register importado — ID: $regId"
} catch {
    Write-Err "Error importando workflow register: $_"
    $regId = $null
}

Write-Step "Importando workflow: User Approved..."
try {
    $importApp = Invoke-RestMethod -Uri "$N8nUrl/rest/workflows" `
        -Method POST -Headers $basicHeaders -Body $appWfJson
    $appId = $importApp.data.id
    Write-Ok "Workflow Approved importado — ID: $appId"
} catch {
    Write-Err "Error importando workflow approved: $_"
    $appId = $null
}

# ── 6. Activar ambos workflows ────────────────────────────────────────────
if ($regId) {
    Write-Step "Activando workflow Register (ID: $regId)..."
    try {
        Invoke-RestMethod -Uri "$N8nUrl/rest/workflows/$regId/activate" `
            -Method POST -Headers $basicHeaders | Out-Null
        Write-Ok "Workflow Register ACTIVO"
    } catch {
        Write-Err "Error activando workflow register: $_"
    }
}

if ($appId) {
    Write-Step "Activando workflow Approved (ID: $appId)..."
    try {
        Invoke-RestMethod -Uri "$N8nUrl/rest/workflows/$appId/activate" `
            -Method POST -Headers $basicHeaders | Out-Null
        Write-Ok "Workflow Approved ACTIVO"
    } catch {
        Write-Err "Error activando workflow approved: $_"
    }
}

# ── 7. Verificar webhooks ─────────────────────────────────────────────────
Write-Step "Verificando webhooks..."
$webhooks = @(
    "$N8nUrl/webhook/user-register",
    "$N8nUrl/webhook/user-approved"
)
foreach ($wh in $webhooks) {
    try {
        # HEAD request para verificar que el webhook existe
        $r = Invoke-WebRequest -Uri $wh -Method HEAD -TimeoutSec 5 2>$null
        Write-Ok "Webhook activo: $wh (HTTP $($r.StatusCode))"
    } catch {
        $sc = $_.Exception.Response.StatusCode.value__
        if ($sc -eq 405) {
            Write-Ok "Webhook registrado: $wh (requiere POST)"
        } else {
            Write-Host "  [WARN] Webhook $wh — status: $sc" -ForegroundColor Yellow
        }
    }
}

# ── Resumen ────────────────────────────────────────────────────────────────
Write-Host "`n" + ("=" * 65) -ForegroundColor Magenta
Write-Host "  B-DEVOPS — Setup n8n COMPLETADO" -ForegroundColor White
Write-Host ("=" * 65) -ForegroundColor Magenta
Write-Host ""
Write-Host "  Notion DB ID : $NotionDbId" -ForegroundColor Cyan
Write-Host "  Credencial   : Notion API ($credId)" -ForegroundColor Cyan
Write-Host "  Webhook 1    : $N8nUrl/webhook/user-register" -ForegroundColor Green
Write-Host "  Webhook 2    : $N8nUrl/webhook/user-approved" -ForegroundColor Green
Write-Host ""
Write-Host "  Prueba el flujo:" -ForegroundColor Yellow
Write-Host "  1. Ve a https://app.bdev.qzz.io"
Write-Host "  2. Tab 'Registrarse' → rellena el formulario"
Write-Host "  3. Comprueba Notion → debe aparecer con estado 'Pendiente'"
Write-Host "  4. Aprueba en Config -> Usuarios"
Write-Host "  5. Comprueba Notion → debe cambiar a 'Aprobado'"
Write-Host ""
Write-Host "  n8n UI (con VPN): http://10.100.0.1:5678 o https://crm.bdev.qzz.io" -ForegroundColor Gray
Write-Host ""
