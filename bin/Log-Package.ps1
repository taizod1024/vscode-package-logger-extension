param(
    [Parameter(Mandatory = $true)] [string] $logPath,
    [Parameter(Mandatory = $true)] [string] $tmpPath
)

function timestamp() {
    Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

try {

    # set error action
    $ErrorActionPreference = "SilentlyContinue"

    # output basic information
    $app_name = $myInvocation.MyCommand.name
    Write-Host "[$(timestamp)] $($app_name)"
    Write-Host "[$(timestamp)] - logPath: $($logPath)"
    Write-Host "[$(timestamp)] - tmpPath: $($tmpPath)"

    # clear temporary path
    Write-Host "[$(timestamp)] - remove tmpPath"
    if (Test-Path $tmpPath) { Remove-Item $tmpPath -Recurse -Force }
    Write-Host "[$(timestamp)] - create tmpPath"
    New-Item $tmpPath -itemtype Directory | Out-Null

    # change current directory
    Push-Location $tmpPath

    # update packages
    Invoke-Expression {

        # windows update
        Write-Host "[$(timestamp)] - update os"
        Get-Command abc-updatea | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]  => abc-update not found"
        }
        else {
            abc-update /a:install /s:wsus /r:n
        }

        # update chocolatey
        Write-Host "[$(timestamp)] - update chocolatey"
        Get-Command chocoa | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]  => choco not found"
        }
        else {
            choco upgrade all
        }

        # update nodejs
        Write-Host "[$(timestamp)] - update nodejs"
        Get-Command npma | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]  => npm not found"
        }
        else {
            npm update -g
        }

        # update python3
        Write-Host "[$(timestamp)] - update python3"
        Get-Command pythona | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]  => python not found"
        }
        else {
            python3 -m pip install --upgrade pip
        }

        # update vscode
        Write-Host "[$(timestamp)] - update vscode"
        Get-Command codea | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]  => vscode not found"
        }
        else {
            code --list-extensions | ForEach-Object {
                code --install-extension $_ --force
            }
        }
    }

    # log packages
    Invoke-Expression {
        
    }

    # back to directory
    Pop-Location

    # success
    Write-Host "[$(timestamp)] - move tmpPath to logPath"
    if (Test-Path $logPath) { Remove-Item $logPath -Recurse -Force }
    Move-Item $tmpPath $logPath -Force

    # done
    Write-Host "[$(timestamp)] - done"
    timeout 5
}
catch {
    Write-Host $_ -ForegroundColor red 
    pause
}
finally {
}


