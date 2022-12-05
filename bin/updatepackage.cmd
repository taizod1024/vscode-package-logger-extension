    @echo off
    setlocal enabledelayedexpansion

    set TMP=%1

    set CMDNAME=%~nx0
    echo %CMDNAME%:
    echo - TMP: %TMP%
    echo.

:UPDATE_WINDOWS

    echo - windowsupdate
    where abc-update 1>NUL 2>NUL
    if %ERRORLEVEL% EQU 0 (
        abc-update /a:install /s:wsus /r:n
    ) else (
        echo   =^> abc-update not found, install 
    )
    echo.

:UPDATE_CHOCOLATEY

    echo - chocolatey
    where choco 1>NUL 2>NUL
    if %ERRORLEVEL% EQU 0 (
        choco upgrade all
    ) else (
        echo   =^> chocolatey not found
    )
    echo.

:UPDATE_NODEJS

    echo - nodejs
    where npm 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        call npm update -g
    ) else (
        echo   =^> npm not found
    )
    echo.

:UPDATE_PYTHON

    echo - python3
    where python 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        python3 -m pip install --upgrade pip
    ) else (
        echo   =^> python3 not found
    )
    echo.

:UPDATE_VSCODE

    echo - vscode
    where code 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        for /F "usebackq tokens=1" %%I in (`code --list-extensions`) do call code --install-extension %%I --force
    ) else (
        echo   =^> vscode not found
    )
    echo.

:LOG_FEATURE

    echo - feature
    del %TMP%\package-logger_feature.txt 1>NUL 2>NUL
    for /F "tokens=1,2,3,4" %%i in ('dism /Online /Get-Features /English') do (
        if "%%i" equ "Feature" set NAME=%%l
        if "%%k" equ "Enabled" (
            echo !NAME!
            echo !NAME!>> %TMP%\package-logger_feature.txt
        )
    )
    echo.

:LOG_SERVICE

    echo - service
    del %TMP%\package-logger_service.txt 1>NUL 2>NUL
    for /F "tokens=1,2" %%i in ('powershell -command "Get-Service | Where-Object { -not ($_.ServiceType -match '^[0-9]+$') } | Select-Object -property StartType, Name | Select-Object Name, StartType | Format-Table -HideTableHeaders"') do (
        echo %%i: %%j
        echo %%i: %%j>> %TMP%\package-logger_service.txt
    )
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
