param(
    [switch]$Install
)

$BackendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path -Path $BackendDir -ChildPath "frontend"
$Python = Join-Path -Path $BackendDir -ChildPath ".venv\Scripts\python.exe"

if ($Install) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Push-Location $FrontendDir
    npm install
    Pop-Location
    Write-Host "Installation complete." -ForegroundColor Green
    return
}

$BackendJobName = "idalista-backend"
$FrontendJobName = "idalista-frontend"

try {
    Write-Host "Starting backend..." -ForegroundColor Cyan
    $backendJob = Start-Job -Name $BackendJobName -ScriptBlock {
        param($Dir, $Python)
        Set-Location $Dir
        & $Python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
    } -ArgumentList $BackendDir, $Python

    Write-Host "Starting frontend..." -ForegroundColor Cyan
    $frontendJob = Start-Job -Name $FrontendJobName -ScriptBlock {
        param($Dir)
        Set-Location $Dir
        npm run dev
    } -ArgumentList $FrontendDir

    Write-Host "`nBoth servers are running:" -ForegroundColor Green
    Write-Host "  Backend:  http://localhost:8000" -ForegroundColor Yellow
    Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Yellow
    Write-Host "`nPress Ctrl+C to stop both.`n" -ForegroundColor Gray

    while ($true) {
        Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
    }
}
finally {
    Write-Host "`nStopping servers..." -ForegroundColor Cyan
    Get-Job -Name $BackendJobName, $FrontendJobName -ErrorAction SilentlyContinue | Stop-Job
    Get-Job -Name $BackendJobName, $FrontendJobName -ErrorAction SilentlyContinue | Remove-Job
    Write-Host "Done." -ForegroundColor Green
}
