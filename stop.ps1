# PyLearn Pro Stop Script (PowerShell)
Write-Host "?? Stopping PyLearn Pro..." -ForegroundColor Yellow
$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*app.py*' }
if ($procs) {
    $procs | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "Closed process ID: " -ForegroundColor Green
    }
} else {
    Write-Host "PyLearn Pro is not currently running." -ForegroundColor DarkGray
}
