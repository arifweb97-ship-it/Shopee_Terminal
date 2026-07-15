@echo off
echo ====================================
echo      SHOPEE TERMINAL GIT PUSH
echo ====================================
echo.

set /p msg="Masukkan pesan commit (tekan Enter untuk 'auto commit'): "
if "%msg%"=="" set msg="auto commit"

echo.
echo [1/3] Menambahkan file yang berubah...
git add -A

echo [2/3] Menyimpan perubahan (commit)...
git commit -m "%msg%"

echo [3/3] Mengirim ke GitHub (push)...
git push

echo.
echo ====================================
echo SELESAI!
echo ====================================
pause
