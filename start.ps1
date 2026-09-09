# PyLearn Pro Start Script (PowerShell)
Write-Host "?? Launching PyLearn Pro..." -ForegroundColor Cyan
Start-Process -FilePath "py" -ArgumentList "-3.12", "app.py"
Write-Host "? PyLearn Pro is running!" -ForegroundColor Green
