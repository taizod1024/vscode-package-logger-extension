param(
    [Parameter(Mandatory = $true)] [string] $logPath,
    [Parameter(Mandatory = $true)] [string] $tmpPath
)

function timestamp() {
    Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

try {

    # change codepage 
    chcp 65001

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

    # --------------------
    # update packages
    # --------------------

    # windows update
    Write-Host "[$(timestamp)] - update os"
    Get-Command abc-updatea | Out-Null
    if (-not $?) {
        Write-Host "[$(timestamp)]   => abc-update not found"
    }
    else {
        abc-update /a:install /s:wsus /r:n
    }

    # update chocolatey
    Write-Host "[$(timestamp)] - update chocolatey"
    Get-Command chocoa | Out-Null
    if (-not $?) {
        Write-Host "[$(timestamp)]   => choco not found"
    }
    else {
        choco upgrade all
    }

    # update nodejs
    Write-Host "[$(timestamp)] - update nodejs"
    Get-Command npma | Out-Null
    if (-not $?) {
        Write-Host "[$(timestamp)]   => npm not found"
    }
    else {
        npm update -g
    }

    # update python3
    Write-Host "[$(timestamp)] - update python3"
    Get-Command pythona | Out-Null
    if (-not $?) {
        Write-Host "[$(timestamp)]   => python not found"
    }
    else {
        python3 -m pip install --upgrade pip
    }

    # update vscode
    Write-Host "[$(timestamp)] - update vscode"
    Get-Command codea | Out-Null
    if (-not $?) {
        Write-Host "[$(timestamp)]   => vscode not found"
    }
    else {
        code --list-extensions | ForEach-Object {
            code --install-extension $_ --force
        }
    }

    # --------------------
    # log packages
    # --------------------

    function Invoke-ScriptAt() {
        param(
            [Parameter(Mandatory = $true)] [string] $path,
            [Parameter(Mandatory = $true)] [scriptblock] $script
        )
        Write-Host "[$(timestamp)] - $($path)"
        New-Item $path -ItemType Directory | Out-Null
        Push-Location $path
        Invoke-Command $script
        Pop-Location
        if ((Get-ChildItem $path ).Count -eq 0) {
            Remove-Item $path
        }
    }

    function normalize-filename($filename) {
        ($filename -replace "[`\/]", "-") -replace "[:`*`?`"<>`|]", ""
    }
    
    Invoke-ScriptAt "./os/env" {
        Get-ChildItem env: | ForEach-Object {
            $filename = normalize-filename $_.Name
            $text = "$($_.Name)=$($_.Value)"
            if ($_.Name -eq "Path" -or $_.Name -eq "PATHEXT") {
                # Path,PATHEXTだけは改行して出力
                $text = ($text -replace "=", "=`n") -replace ";", "`n"
            }
            $text | Out-File -NoNewline $filename
        }
    }
    Invoke-ScriptAt "./os/feature" {
        Get-WindowsOptionalFeature -Online `
        | Where-Object { $_.State -eq "Enabled" } `
        | ForEach-Object {
            $filename = normalize-filename $_.FeatureName
            $text = $_.FeatureName
            $text | Out-File -NoNewline $filename
        }
    }
    Invoke-ScriptAt "./os/service" {
        Get-Service `
        | Where-Object { -not ($_.ServiceType -match '^[0-9]+$') } `
        | Select-Object -property StartType, Name `
        | ForEach-Object {
            $filename = normalize-filename $_.Name
            $text = "$($_.Name): $($_.StartType)"
            $text | Out-File -NoNewline $filename
        }
    }
    Invoke-ScriptAt "./os/system" {
        $filename = "systeminfo"
        $text = systeminfo
        $text | Out-File -NoNewline $filename
    }
    Invoke-ScriptAt "./os" {}
    Invoke-ScriptAt "./package/app" {
        (Get-ChildItem Registry::HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Uninstall | Get-ItemProperty | Select-Object DisplayName, DisplayVersion) `
            + (Get-ChildItem Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall | Get-ItemProperty | Select-Object DisplayName, DisplayVersion) `
            + (Get-ChildItem Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall | Get-ItemProperty | Select-Object DisplayName, DisplayVersion)`
        | Where-Object { $_.DisplayName } `
        | ForEach-Object {
            $filename = normalize-filename $_.DisplayName
            $text = "$($_.DisplayName)@$($_.DisplayVersion)"
            $text | Out-File -NoNewline $filename
        }    
    }
    Get-Command choco | Out-Null
    if ($?) {
        Invoke-ScriptAt "./package/chocolatey" {
            choco config list > _choco_config_list
            choco list --local-only `
            | Where-Object { $_ -notmatch "packages installed" }`
            | ForEach-Object {
                $filename = normalize-filename ($_ -split " ")[0]
                $text = $_ -replace " ", "@"
                $text | Out-File -NoNewline $filename
            }
        }
    }
    Get-Command git | Out-Null
    if ($?) {
        Invoke-ScriptAt "./package/git" {
            git config --list > _git_config_list
        }
    }
    Get-Command npm | Out-Null
    if ($?) {
        Invoke-ScriptAt "./package/nodejs" {
            npm config list > _npm_config_list
            npm list --global `
            | Where-Object { $_ -ne "" }`
            | Where-Object { $_ -notmatch "->" }`
            | ForEach-Object {
                $array_1 = $_ -split " "
                $text = $array_1[1]
                $array_2 = $text -split "@"
                $filename = $array_2[0]
                if (-not $filename) { $filename = "@" + $array_2[1] }
                $filename = normalize-filename $filename
                $text | Out-File -NoNewline $filename
            }
            Get-Command nvm | Out-Null
            if ($?) {
                nvm list > _nvm_list
            }
        }
    }
    Invoke-ScriptAt "./package/python" {}
    Invoke-ScriptAt "./package/vscode" {}
    Invoke-ScriptAt "./package" {}
    Invoke-ScriptAt "./office/excel" {}
    Invoke-ScriptAt "./office/word" {}
    Invoke-ScriptAt "./office/powerpoint" {}
    Invoke-ScriptAt "./office/outlook" {}
    Invoke-ScriptAt "./office" {}
    
    # back to directory
    Pop-Location

    # success
    Write-Host "[$(timestamp)] - move tmpPath to logPath"
    if (Test-Path $logPath) { Remove-Item $logPath -Recurse -Force }
    Move-Item $tmpPath $logPath -Force

    # done
    Write-Host "[$(timestamp)] - done"
    timeout 5
    pause
}
catch {
    Write-Host $_ -ForegroundColor red 
    pause
}
finally {
}


