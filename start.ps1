# start.ps1 — Script untuk menjalankan frontend dan backend sekaligus
# Cara pakai: buka terminal di folder root project, lalu ketik:
#   .\start.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Ride-Hailing Distributed Sim - Start  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Jalankan Backend Flask di window terminal baru
# Aktifkan virtual environment (.venv) sebelum menjalankan server
Write-Host "[1/2] Menjalankan Backend Flask..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location '$PSScriptRoot\backend'
  Write-Host 'Mengaktifkan virtual environment...' -ForegroundColor Gray
  .\.venv\Scripts\Activate.ps1
  Write-Host 'Backend Flask aktif di http://localhost:5000' -ForegroundColor Green
  python run.py
"@

# Beri jeda supaya backend sempat start sebelum frontend berjalan
Start-Sleep -Seconds 2

# Jalankan Frontend Vite di window terminal baru
Write-Host "[2/2] Menjalankan Frontend Vite..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  Set-Location '$PSScriptRoot\frontend'
  Write-Host 'Frontend Vite aktif di http://localhost:5173' -ForegroundColor Green
  npm run dev
"@

Write-Host ""
Write-Host "Semua server sudah berjalan!" -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:5000" -ForegroundColor White
Write-Host "  Frontend -> http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Tutup masing-masing terminal untuk menghentikan server." -ForegroundColor Gray
