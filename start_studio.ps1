Write-Host "Starting EUNJO VoiceMorph Agent Studio..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='c:\Dev\Eunjo-VoiceMorph-Agent\backend'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location 'c:\Dev\Eunjo-VoiceMorph-Agent\frontend'; npm run dev"
Write-Host "Backend API: http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "Frontend Studio: http://localhost:5173" -ForegroundColor Green
