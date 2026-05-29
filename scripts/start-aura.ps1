# ═══════════════════════════════════════════════════════════════════
#  B-DEVOPS — Startup Script
#  Arranca Docker stack + Cloudflare Tunnel con una sola ejecución
# ═══════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Continue"
$cf = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
$configPath = "$env:USERPROFILE\.cloudflared\config.yml"
$projectPath = "D:\aura-ops"

Write-Host ""
Write-Host "  ██████╗ ██╗   ██╗██████╗  █████╗      ██████╗ ██████╗ ███████╗" -ForegroundColor Red
Write-Host "  ██╔══██╗██║   ██║██╔══██╗██╔══██╗    ██╔═══██╗██╔══██╗██╔════╝" -ForegroundColor Red
Write-Host "  ██████╔╝██║   ██║██████╔╝███████║    ██║   ██║██████╔╝███████╗" -ForegroundColor Red
Write-Host "  ██╔══██╗██║   ██║██╔══██╗██╔══██║    ██║   ██║██╔═══╝ ╚════██║" -ForegroundColor Red
Write-Host "  ██║  ██║╚██████╔╝██║  ██║██║  ██║    ╚██████╔╝██║     ███████║" -ForegroundColor Red
Write-Host "  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝     ╚═════╝ ╚═╝     ╚══════╝" -ForegroundColor Red
Write-Host ""
Write-Host "  B-DEVOPS Startup" -ForegroundColor Cyan
Write-Host "  ─────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# ── 1. Check Docker ──────────────────────────────────────────────
Write-Host "  [1/3] Docker Stack..." -ForegroundColor Yellow -NoNewline
try {
    $status = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Set-Location $projectPath
        docker compose up -d 2>&1 | Out-Null
        $running = docker ps --format "{{.Names}}" 2>&1
        $count = ($running | Measure-Object -Line).Lines
        Write-Host " ✅ $count contenedores activos" -ForegroundColor Green
    } else {
        Write-Host " ⚠️  Docker no disponible — arráncalo manualmente" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ Error: $_" -ForegroundColor Red
}

# ── 2. Cloudflare Tunnel ─────────────────────────────────────────
Write-Host "  [2/3] Cloudflare Tunnel..." -ForegroundColor Yellow -NoNewline
$cfProc = Get-Process cloudflared -ErrorAction SilentlyContinue
if ($cfProc) {
    Write-Host " ✅ Ya en ejecución (PID $($cfProc.Id))" -ForegroundColor Green
} elseif (Test-Path $cf) {
    Start-Process -FilePath $cf `
        -ArgumentList "tunnel","--config","$configPath","--no-autoupdate","run" `
        -RedirectStandardError "$env:TEMP\cf_stderr.txt" `
        -WindowStyle Hidden
    Start-Sleep -Seconds 4
    $cfProc = Get-Process cloudflared -ErrorAction SilentlyContinue
    if ($cfProc) {
        Write-Host " ✅ Iniciado (PID $($cfProc.Id))" -ForegroundColor Green
    } else {
        Write-Host " ❌ Falló el inicio del tunnel" -ForegroundColor Red
    }
} else {
    Write-Host " ⚠️  cloudflared no encontrado en $cf" -ForegroundColor Yellow
}

# ── 3. Verify services ───────────────────────────────────────────
Write-Host "  [3/3] Verificando servicios..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

$services = @(
    @{ Name="Frontend";   Url="http://localhost:3000" },
    @{ Name="Backend";    Url="http://localhost:8000/api/health" },
    @{ Name="n8n";        Url="http://localhost:5678/healthz" },
    @{ Name="ClickHouse"; Url="http://localhost:8123/ping" }
)

foreach ($svc in $services) {
    Write-Host "      $($svc.Name.PadRight(12))" -ForegroundColor Gray -NoNewline
    try {
        $r = Invoke-WebRequest $svc.Url -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
        Write-Host " ✅ Online" -ForegroundColor Green
    } catch {
        Write-Host " ❌ No disponible" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "  ─────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  🚀 B-DEVOPS listo en:" -ForegroundColor Cyan
Write-Host "     Local:   http://localhost:3000" -ForegroundColor White
Write-Host "     Público: https://bdev.qzz.io" -ForegroundColor White
Write-Host ""
Write-Host "  Presiona cualquier tecla para abrir B-DEVOPS..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "chrome.exe" "http://localhost:3000"
