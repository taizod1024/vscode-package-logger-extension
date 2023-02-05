    @echo off
    setlocal enabledelayedexpansion
    chcp 65001

    set TMP_APP=package-logger
    set TMP_DIR=%1
    if "%TMP_DIR%" == "" set TMP_DIR=.

    set CMDNAME=%~nx0
    echo %CMDNAME%:
    echo - TMP_APP: %TMP_APP%
    echo - TMP_DIR: %TMP_DIR%
    del %TMP_DIR%\%TMP_APP%_* 1>NUL 2>NUL

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
    call :LOG_OS_SYSTEM
    call :LOG_PKG_APP
    call :LOG_PKG_CHOCO
    call :LOG_PKG_GIT
    call :LOG_PKG_NODEJS
    call :LOG_PKG_PYTHON
    call :LOG_PKG_VSCODE
    call :CHECK_VSCODE

    exit /b 0

:UPDATE_OS

    echo - updating os
    where abc-update 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> abc-update not found, install 
        exit /b 1
    )
    abc-update /a:install /s:wsus /r:n
    exit /b 0

:UPDATE_PKG_CHOCOLATEY

    echo - updating chocolatey
    where choco 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> choco not found
        exit /b 1
    )
    choco upgrade all
    exit /b 0

:UPDATE_PKG_NODEJS

    echo - updating nodejs
    where npm 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ  0 (
        echo   =^> npm not found
        exit /b 1
    )
    call npm update -g
    exit /b 0

:UPDATE_PKG_PYTHON

    echo - updating python3
    where python 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ  0 (
        echo   =^> python3 not found
        exit /b 1
    )
    python3 -m pip install --upgrade pip
    exit /b 0

:UPDATE_PKG_VSCODE

    echo - updating vscode
    where code 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ  0 (
        echo   =^> vscode not found
        exit /b 1
    )
    for /F "usebackq tokens=1" %%I in (`code --list-extensions`) do call code --install-extension %%I --force
    exit /b 0

:LOG_OFFICE_EXCEL

    echo - logging office/excel
    call :SUB_LOG_OFFICE_APP Excel *.xlam >> %TMP_DIR%\%TMP_APP%_office_excel.txt
    exit /b 0

:LOG_OFFICE_OUTLOOK

    echo - logging office/outlook
    call :SUB_LOG_OFFICE_APP Outlook >> %TMP_DIR%\%TMP_APP%_office_outlook.txt
    exit /b 0

:LOG_OFFICE_POWERWPOINT

    echo - logging office/powerpoint
    call :SUB_LOG_OFFICE_APP PowerPoint *.ppam >> %TMP_DIR%\%TMP_APP%_office_powerpoint.txt
    exit /b 0

:LOG_OFFICE_WORD

    echo - logging office/word
    call :SUB_LOG_OFFICE_APP Word >> %TMP_DIR%\%TMP_APP%_office_word.txt
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

    echo - logging os/assoc
    Dism /Online /Export-DefaultAppAssociations:%TMP_DIR%\%TMP_APP%_os_assoc.xml 1>NUL 2>NUL
    exit /b 0

:LOG_OS_ENV

    echo - logging os/env
    set >> %TMP_DIR%\%TMP_APP%_os_env.txt
    exit /b 0

:LOG_OS_FEATURE

    echo - logging os/feature
    for /F "tokens=1,2,3,4" %%i in ('dism /Online /Get-Features /English') do (
        if "%%i" equ "Feature" set NAME=%%l
        if "%%k" equ "Enabled" (
            echo !NAME!>> %TMP_DIR%\%TMP_APP%_os_feature.txt
        )
    )
    exit /b 0

:LOG_OS_SERVICE

    echo - logging os/service
    for /F "tokens=1,2" %%i in ('powershell -command "Get-Service | Where-Object { -not ($_.ServiceType -match '^[0-9]+$') } | Select-Object -property StartType, Name | Select-Object Name, StartType | Format-Table -HideTableHeaders"') do (
        echo %%i: %%j>> %TMP_DIR%\%TMP_APP%_os_service.txt
    )
    exit /b 0

:LOG_OS_SYSTEM

    echo - logging os/system
    systeminfo >> %TMP_DIR%\%TMP_APP%_os_system_systeminfo.txt
    exit /b 0

:LOG_OS_STARTUP

    echo - logging os/startup
    dir /b "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"         >> %TMP_DIR%\%TMP_APP%_os_startup.txt
    dir /b "%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\StartUp" >> %TMP_DIR%\%TMP_APP%_os_startup.txt
    exit /b 0

:LOG_OS_STARTMENU

    echo - logging os/startmenu
    powershell -command Export-StartLayout -UseDesktopApplicationID -Path %TMP_DIR%\%TMP_APP%_os_startmenu.xml 1>NUL 2>NUL
    exit /b 0


:LOG_PKG_APP

    echo - logging package/app
    reg query HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Uninstall /s             | findstr DisplayName >> %TMP_DIR%\%TMP_APP%_pkg_app.txt
    reg query HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall /s | findstr DisplayName >> %TMP_DIR%\%TMP_APP%_pkg_app.txt
    reg query HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall /s              | findstr DisplayName >> %TMP_DIR%\%TMP_APP%_pkg_app.txt
    exit /b 0

:LOG_PKG_CHOCO

    echo - logging package/chocolatey
    where choco 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> choco not found
        exit /b 1
    )
    choco list --local-only  >> %TMP_DIR%\%TMP_APP%_pkg_choco.txt
    choco config list >> %TMP_DIR%\%TMP_APP%_pkg_choco_config_list.txt
    exit /b 0

:LOG_PKG_GIT

    echo - logging package/git
    where git 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> git not found
        exit /b 1
    )
    git config --list >> %TMP_DIR%\%TMP_APP%_pkg_git_config_list.txt
    exit /b 0

:LOG_PKG_NODEJS

    echo - logging package/nodejs
    where npm 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> npm not found
        exit /b 1
    )

    call npm list --global >> %TMP_DIR%\%TMP_APP%_pkg_nodejs.txt
    call npm config list >> %TMP_DIR%\%TMP_APP%_pkg_nodejs_config_list.txt

    where nvm 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> nvm not found
        exit /b 1
    )
    nvm list >> %TMP_DIR%\%TMP_APP%_pkg_nodejs_nvm_list.txt
    exit /b 0

:LOG_PKG_PYTHON

    echo - logging package/python
    where pip 1>NUL 2>NUL
    if %ERRORLEVEL% NEQ 0 (
        echo   =^> pip not found
        exit /b 1
    )

    pip list >> %TMP_DIR%\%TMP_APP%_pkg_python.txt
    pip config list >> %TMP_DIR%\%TMP_APP%_pkg_python_config_list.txt
    exit /b 0

:LOG_PKG_VSCODE

    echo - logging package/vscode
    where code 1>NUL 2>NUL
    call code --list-extensions --show-versions >> %TMP_DIR%\%TMP_APP%_pkg_vscode.txt
    copy %APPDATA%\\Code\\User\\settings.json %TMP_DIR%\%TMP_APP%_pkg_vscode_settings.json 1>NUL 2>NUL
    copy %APPDATA%\\Code\\User\\keybindings.json %TMP_DIR%\%TMP_APP%_pkg_vscode_keybindings.json 1>NUL 2>NUL
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
