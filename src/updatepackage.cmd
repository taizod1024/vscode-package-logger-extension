    @echo off
    setlocal enabledelayedexpansion

    set CMDNAME=%~nx0
    echo %CMDNAME%:
    echo.

:UPDATE_CHOCOLATEY

    echo - chocolatey
    where choco 1>NUL 2>NUL
    if %ERRORLEVEL% EQU 0 (
        choco upgrade all
    ) else (
        echo =^> not found
    )
    echo.

:UPDATE_NODEJS

    echo - nodejs
    where npm 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        call npm update -g
    ) else (
        echo =^> not found
    )
    echo.

:UPDATE_PYTHON

    echo - python
    where python 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        python -m pip install --upgrade pip
    ) else (
        echo =^> not found
    )
    echo.

:UPDATE_VSCODE

    echo - vscode
    where code 1>NUL 2>NUL
    if %ERRORLEVEL% EQU  0 (
        for /F "usebackq tokens=1" %%I in (`code --list-extensions`) do call code --install-extension %%I --force
    ) else (
        echo =^> not found
    )
    echo.

:UPDATE_WINGET

    echo - winget
    echo   =^> not implemented
    echo.

:UPDATE_SCOOP

    echo - scoop
    echo   =^> not implemented
    echo.

:EXIT

    echo - done
    timeout 5
    exit /b 0
