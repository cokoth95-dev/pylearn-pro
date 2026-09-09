@echo off
title PyLearn Pro Closer
echo Stopping PyLearn Pro...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*app.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Write-Host ('Closed PyLearn Pro PID ' + $_.ProcessId) }"
echo Done!
