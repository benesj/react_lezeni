@echo off
REM Spusti server i tunel po startu Windows. Vola se z .vbs zastupce ve slozce
REM Po spusteni (Startup), aby nebylo videt okno.
REM
REM Projekt lezi na disku D: (externi T7), ktery po startu nemusi byt hned
REM pripraveny - proto se na nej nejdriv chvili ceka.

set PROJEKT=D:\data\Vyvoj\react_lezeni
set LOG=%APPDATA%\lezecky-zebricek\autostart.log

if not exist "%APPDATA%\lezecky-zebricek" mkdir "%APPDATA%\lezecky-zebricek"

echo. >> "%LOG%"
echo ==== start %DATE% %TIME% ==== >> "%LOG%"

REM cekani na disk: 30 pokusu po 10 s = max 5 minut
set /a POKUS=0
:cekej
if exist "%PROJEKT%\package.json" goto mame
set /a POKUS+=1
if %POKUS% GEQ 30 (
  echo Disk D: se nedockal, koncim. >> "%LOG%"
  exit /b 1
)
timeout /t 10 /nobreak >nul
goto cekej

:mame
echo Projekt nalezen po %POKUS% pokusech. >> "%LOG%"
cd /d "%PROJEKT%"
call npm run doma >> "%LOG%" 2>&1
echo ==== konec %DATE% %TIME% ==== >> "%LOG%"
