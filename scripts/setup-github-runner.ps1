# ─────────────────────────────────────────────────────────────────────────────
# B-DEVOPS — Instalar GitHub Actions Self-Hosted Runner en Windows
# Uso: .\scripts\setup-github-runner.ps1 -Token TU_TOKEN_DE_GITHUB
#
# El token lo obtienes en:
#   github.com/TU_USUARIO/bdev-ops → Settings → Actions → Runners → New self-hosted runner
# ─────────────────────────────────────────────────────────────────────────────

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,

    [string]$RepoUrl = "https://github.com/TU_USUARIO/bdev-ops",
    [string]$RunnerDir = "D:\actions-runner"
)

Write-Host "🚀 Instalando GitHub Actions Runner en $RunnerDir" -ForegroundColor Cyan

# Crear directorio
if (-not (Test-Path $RunnerDir)) {
    New-Item -ItemType Directory -Path $RunnerDir | Out-Null
    Write-Host "📁 Directorio creado: $RunnerDir"
}

Set-Location $RunnerDir

# Descargar runner (versión más reciente)
Write-Host "⬇️  Descargando GitHub Actions Runner..."
$runnerVersion = "2.319.1"
$runnerUrl = "https://github.com/actions/runner/releases/download/v$runnerVersion/actions-runner-win-x64-$runnerVersion.zip"
Invoke-WebRequest -Uri $runnerUrl -OutFile "actions-runner.zip" -UseBasicParsing
Write-Host "✅ Descargado actions-runner-win-x64-$runnerVersion.zip"

# Extraer
Write-Host "📦 Extrayendo..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory("$RunnerDir\actions-runner.zip", $RunnerDir)
Remove-Item "actions-runner.zip"

# Configurar runner
Write-Host "⚙️  Configurando runner..."
& "$RunnerDir\config.cmd" --url $RepoUrl --token $Token --name "bdev-ops-local" --labels "self-hosted,windows,x64" --work "_work" --unattended

# Instalar como servicio de Windows (arranca automáticamente)
Write-Host "🔧 Instalando como servicio de Windows..."
& "$RunnerDir\svc.cmd" install
& "$RunnerDir\svc.cmd" start

Write-Host ""
Write-Host "✅ Runner instalado y activo como servicio de Windows" -ForegroundColor Green
Write-Host "   Nombre: bdev-ops-local"
Write-Host "   Servicio: actions.runner.TU_USUARIO-bdev-ops.bdev-ops-local"
Write-Host ""
Write-Host "Para ver el estado: Get-Service 'actions.runner*'"
Write-Host "Para detenerlo:     Stop-Service 'actions.runner*'"
