    @echo off
    setlocal enabledelayedexpansion

    set TMP=%1

    set CMDNAME=%~nx0
    echo %CMDNAME%:
    echo - TMP: %TMP%
    echo.

    goto :LOG_OS_FEATURE

:UPDATE_OS

    echo - windowsupdate
    where abc-update 1>NUL 2>NUL
    if %ERRORLEVEL% EQU 0 (
        abc-update /a:install /s:wsus /r:n
    ) else (
        echo   =^> abc-update not found, install 
    )
    echo.

:UPDATE_PKG_CHOCOLATEY

    echo - chocolatey
    where choco 1>NUL 2>NUL
    if %ERRORLEVEL% EQU 0 (
        choco upgrade all
    ) else (
        echo   =^> chocolatey not found
    )
    echo.

:UPDATE_PKG_NODEJS

    echo - nodejs
    where npm 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        call npm update -g
    ) else (
        echo   =^> npm not found
    )
    echo.

:UPDATE_PKG_PYTHON

    echo - python3
    where python 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        python3 -m pip install --upgrade pip
    ) else (
        echo   =^> python3 not found
    )
    echo.

:UPDATE_PKG_VSCODE

    echo - vscode
    where code 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        for /F "usebackq tokens=1" %%I in (`code --list-extensions`) do call code --install-extension %%I --force
    ) else (
        echo   =^> vscode not found
    )
    echo.

:LOG_OS_FEATURE

    echo - feature
    del %TMP%\package-logger_os_feature.txt 1>NUL 2>NUL
    for /F "tokens=1,2,3,4" %%i in ('dism /Online /Get-Features /English') do (
        if "%%i" equ "Feature" set NAME=%%l
        if "%%k" equ "Enabled" (
            echo !NAME!
            echo !NAME!>> %TMP%\package-logger_os_feature.txt
        )
    )
    echo.

:LOG_OS_SERVICE

    echo - service
    del %TMP%\package-logger_os_service.txt 1>NUL 2>NUL
    for /F "tokens=1,2" %%i in ('powershell -command "Get-Service | Where-Object { -not ($_.ServiceType -match '^[0-9]+$') } | Select-Object -property StartType, Name | Select-Object Name, StartType | Format-Table -HideTableHeaders"') do (
        echo %%i: %%j
        echo %%i: %%j>> %TMP%\package-logger_os_service.txt
    )
    echo.

:LOG_OS_SYSTEM_STARTUP

    echo - startup
    del %TMP%\package-logger_os_startup.txt 1>NUL 2>NUL
    dir /b "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"         >> %TMP%\package-logger_os_startup.txt
    dir /b "%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\StartUp" >> %TMP%\package-logger_os_startup.txt
    echo.

:LOG_OS_SYSTEM_ASSOC

    echo - assoc
    del %TMP%\package-logger_os_system_assoc.xml 1>NUL 2>NUL
    Dism /Online /Export-DefaultAppAssociations:%TMP%\package-logger_os_system_assoc.xml 1>NUL 2>NUL
    echo.

:LOG_OS_SYSTEM_STARTMENU

    echo - startmenu
    del %TMP%\package-logger_os_system_startmenu.xml 1>NUL 2>NUL
    powershell -command Export-StartLayout -UseDesktopApplicationID -Path %TMP%\package-logger_os_system_startmenu.xml 1>NUL 2>NUL
    echo.

:LOG_OFFICE_APP

    echo - office
    del %TMP%\package-logger_office_excel.txt 1>NUL 2>NUL
    del %TMP%\package-logger_office_outlook.txt 1>NUL 2>NUL
    del %TMP%\package-logger_office_powerpoint.txt 1>NUL 2>NUL
    del %TMP%\package-logger_office_word.txt 1>NUL 2>NUL
    call :SUB_OFFICE_APP Excel      *.xlam > %TMP%\package-logger_office_excel.txt
    call :SUB_OFFICE_APP Outlook           > %TMP%\package-logger_office_outlook.txt
    call :SUB_OFFICE_APP PowerPoint *.ppam > %TMP%\package-logger_office_powerpoint.txt
    call :SUB_OFFICE_APP Word              > %TMP%\package-logger_office_word.txt
    echo.

:EXIT

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

:SUB_OFFICE_APP
 
    set APP=%1
    set PAT=%2
    for /F "tokens=1,2,* delims= " %%a in ('reg query HKCU\SOFTWARE\Microsoft\Office\%APP%\Addins /s /t REG_SZ /v FriendlyName 2^>NUL ^| findstr FriendlyName') do ( echo %%c )
    for /F "tokens=1,2,* delims= " %%a in ('reg query HKLM\SOFTWARE\Microsoft\Office\%APP%\Addins /s /t REG_SZ /v FriendlyName 2^>NUL ^| findstr FriendlyName') do ( echo %%c )
    for /F "tokens=1,2,* delims= " %%a in ('reg query HKLM\SOFTWARE\WOW6432Node\Microsoft\Office\%APP%\Addins /s /t REG_SZ /v FriendlyName 2^>NUL^| findstr FriendlyName') do ( echo %%c )
    if "%PAT%" NEQ "" (
        for /F %%a in ('dir /B %APPDATA%\Microsoft\AddIns\%EXT%') do ( echo %%a )
    )
    exit /b 0