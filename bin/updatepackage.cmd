    @echo off
    setlocal enabledelayedexpansion
    chcp 65001

    set PREFIX="package-logger"
    set TMP=%1
    if "%TMP%" == "" set TMP=.

    set CMDNAME=%~nx0
    echo %CMDNAME%:
    echo - TMP: %TMP%
    del %TMP%\%PREFIX%_* 1>NUL 2>NUL

REM call :UPDATE_OS
REM call :UPDATE_PKG_CHOCOLATEY
REM call :UPDATE_PKG_NODEJS
REM call :UPDATE_PKG_PYTHON
REM call :UPDATE_PKG_VSCODE
    call :LOG_OFFICE_EXCEL
    call :LOG_OFFICE_OUTLOOK
    call :LOG_OFFICE_POWERWPOINT
    call :LOG_OFFICE_WORD
    call :LOG_OS_ASSOC
    call :LOG_OS_ENV
    call :LOG_OS_FEATURE
    call :LOG_OS_SERVICE
    call :LOG_OS_STARTUP
    call :LOG_OS_STARTMENU
    call :LOG_OS_SYSTEM_SYSTEMINFO
    call :LOG_PKG_APP
    call :LOG_PKG_CHOCO
    call :CHECK_VSCODE

    exit /b 0

:UPDATE_OS

    echo - windowsupdate
    where abc-update 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> abc-update not found, install 
        exit /b 1
    )
    abc-update /a:install /s:wsus /r:n
    exit /b 0

:UPDATE_PKG_CHOCOLATEY

    echo - chocolatey
    where choco 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> chocolatey not found
        exit /b 1
    )
    choco upgrade all
    exit /b 0

:UPDATE_PKG_NODEJS

    echo - nodejs
    where npm 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ  0 (
        echo   =^> npm not found
        exit /b 1
    )
    call npm update -g
    exit /b 0

:UPDATE_PKG_PYTHON

    echo - python3
    where python 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ  0 (
        echo   =^> python3 not found
        exit /b 1
    )
    python3 -m pip install --upgrade pip
    exit /b 0

:UPDATE_PKG_VSCODE

    echo - vscode
    where code 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ  0 (
        echo   =^> vscode not found
        exit /b 1
    )
    for /F "usebackq tokens=1" %%I in (`code --list-extensions`) do call code --install-extension %%I --force
    exit /b 0

:LOG_OFFICE_EXCEL

    echo - office/excel
    del %TMP%\%PREFIX%_office_excel.txt 1>NUL 2>NUL
    call :SUB_LOG_OFFICE_APP Excel *.xlam >> %TMP%\%PREFIX%_office_excel.txt
    exit /b 0

:LOG_OFFICE_OUTLOOK

    echo - office/outlook
    del %TMP%\%PREFIX%_office_outlook.txt 1>NUL 2>NUL
    call :SUB_LOG_OFFICE_APP Outlook >> %TMP%\%PREFIX%_office_outlook.txt
    exit /b 0

:LOG_OFFICE_POWERWPOINT

    echo - office/powerpoint
    del %TMP%\%PREFIX%_office_powerpoint.txt 1>NUL 2>NUL
    call :SUB_LOG_OFFICE_APP PowerPoint *.ppam >> %TMP%\%PREFIX%_office_powerpoint.txt
    exit /b 0

:LOG_OFFICE_WORD

    echo - office/word
    del %TMP%\%PREFIX%_office_word.txt 1>NUL 2>NUL
    call :SUB_LOG_OFFICE_APP Word >> %TMP%\%PREFIX%_office_word.txt
    exit /b 0

:SUB_LOG_OFFICE_APP
 
    set APP=%1
    set PAT=%2
    for /F "tokens=1,2,* delims= " %%a in ('reg query HKCU\SOFTWARE\Microsoft\Office\%APP%\Addins /s /t REG_SZ /v FriendlyName 2^>NUL ^| findstr FriendlyName') do ( echo %%c )
    for /F "tokens=1,2,* delims= " %%a in ('reg query HKLM\SOFTWARE\Microsoft\Office\%APP%\Addins /s /t REG_SZ /v FriendlyName 2^>NUL ^| findstr FriendlyName') do ( echo %%c )
    for /F "tokens=1,2,* delims= " %%a in ('reg query HKLM\SOFTWARE\WOW6432Node\Microsoft\Office\%APP%\Addins /s /t REG_SZ /v FriendlyName 2^>NUL^| findstr FriendlyName') do ( echo %%c )
    if "%PAT%" NEQ "" (
        for /F %%a in ('dir /B %APPDATA%\Microsoft\AddIns\%EXT%') do ( echo %%a )
    )
    exit /b 0

:LOG_OS_ASSOC

    echo - os/assoc
    del %TMP%\%PREFIX%_os_assoc.xml 1>NUL 2>NUL
    Dism /Online /Export-DefaultAppAssociations:%TMP%\%PREFIX%_os_assoc.xml 1>NUL 2>NUL
    exit /b 0

:LOG_OS_ENV

    echo - os/env
    del %TMP%\%PREFIX%_os_env.txt 1>NUL 2>NUL
    set >> %TMP%\%PREFIX%_os_env.txt
    exit /b 0

:LOG_OS_FEATURE

    echo - os/feature
    del %TMP%\%PREFIX%_os_feature.txt 1>NUL 2>NUL
    for /F "tokens=1,2,3,4" %%i in ('dism /Online /Get-Features /English') do (
        if "%%i" equ "Feature" set NAME=%%l
        if "%%k" equ "Enabled" (
            echo !NAME!>> %TMP%\%PREFIX%_os_feature.txt
        )
    )
    exit /b 0

:LOG_OS_SERVICE

    echo - os/service
    del %TMP%\%PREFIX%_os_service.txt 1>NUL 2>NUL
    for /F "tokens=1,2" %%i in ('powershell -command "Get-Service | Where-Object { -not ($_.ServiceType -match '^[0-9]+$') } | Select-Object -property StartType, Name | Select-Object Name, StartType | Format-Table -HideTableHeaders"') do (
        echo %%i: %%j>> %TMP%\%PREFIX%_os_service.txt
    )
    exit /b 0

:LOG_OS_SYSTEM_SYSTEMINFO

    echo - os/system/systeminfo
    del %TMP%\%PREFIX%_os_system_systeminfo.txt 1>NUL 2>NUL
    systeminfo >> %TMP%\%PREFIX%_os_system_systeminfo.txt
    exit /b 0

:LOG_OS_STARTUP

    echo - os/startup
    del %TMP%\%PREFIX%_os_startup.txt 1>NUL 2>NUL
    dir /b "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"         >> %TMP%\%PREFIX%_os_startup.txt
    dir /b "%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\StartUp" >> %TMP%\%PREFIX%_os_startup.txt
    exit /b 0

:LOG_OS_STARTMENU

    echo - os/startmenu
    del %TMP%\%PREFIX%_os_startmenu.xml 1>NUL 2>NUL
    powershell -command Export-StartLayout -UseDesktopApplicationID -Path %TMP%\%PREFIX%_os_startmenu.xml 1>NUL 2>NUL
    exit /b 0

:LOG_PKG_APP

    echo - package/app
    del %TMP%\%PREFIX%_package_app.txt 1>NUL 2>NUL
    reg query HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Uninstall /s             | findstr HKEY_LOCAL_MACHINE >> %TMP%\%PREFIX%_package_app.txt
    reg query HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall /s | findstr HKEY_LOCAL_MACHINE >> %TMP%\%PREFIX%_package_app.txt
    reg query HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall /s              | findstr HKEY_LOCAL_MACHINE >> %TMP%\%PREFIX%_package_app.txt
    exit /b 0

:LOG_PKG_CHOCO

    echo - package/choco
    where choco list --local-only 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> chocolatey not found
        exit /b 1
    )
    exit /b 0

:CHECK_VSCODE

    tasklist /FI "IMAGENAME eq Code.exe" | findstr Code.exe 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        echo - done
        timeout 5
        exit /b 0
    ) else (
        echo - done. but vscode missing, please start vscode.
        echo.
        pause
        exit /b 1
    )
    exit /b 0
