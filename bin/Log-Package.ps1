param(
    [Parameter(Mandatory = $true)] [string] $logPath,
    [Parameter(Mandatory = $true)] [string] $tmpPath,
    [Parameter(Mandatory = $true)] [boolean] $isUpdate
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
    Write-Host "[$(timestamp)] - isUpdate: $($isUpdate)"

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

    if ($isUpdate) {

        # windows update
        Write-Host "[$(timestamp)] - update os"
        Get-Command abc-update | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]   => abc-update not found"
        }
        else {
            abc-update /a:install /s:wsus /r:n
        }

        # update chocolatey
        Write-Host "[$(timestamp)] - update chocolatey"
        Get-Command choco | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]   => choco not found"
        }
        else {
            choco upgrade all --ignore-checksums
        }

        # update nodejs
        Write-Host "[$(timestamp)] - update nodejs"
        Get-Command npm | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]   => npm not found"
        }
        else {
            npm update -g
        }

        # update vscode
        Write-Host "[$(timestamp)] - update vscode"
        Get-Command code | Out-Null
        if (-not $?) {
            Write-Host "[$(timestamp)]   => vscode not found"
        }
        else {
            code --list-extensions | ForEach-Object {
                code --install-extension $_ --force
            }
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

    function Convert-Filename($filename) {
        ($filename -replace "[`\/]", "-") -replace "[:`*`?`"<>`|]", ""
    }
    
    Invoke-ScriptAt "os/env" {
        Get-ChildItem env: | ForEach-Object {
            $filename = Convert-Filename $_.Name
            $text = "$($_.Name)=$($_.Value)"
            if ($_.Name -eq "Path" -or $_.Name -eq "PATHEXT") {
                # Path,PATHEXTだけは改行して出力
                $text = ($text -replace "=", "=`n") -replace ";", "`n"
                Write-Host "[$(timestamp)]   - $($text)"
            }
            $text | Out-File -Encoding "utf8" -NoNewline $filename
        }
    }
    Invoke-ScriptAt "os/feature" {
        Get-WindowsOptionalFeature -Online `
        | Where-Object { $_.State -eq "Enabled" } `
        | ForEach-Object {
            $filename = Convert-Filename $_.FeatureName
            $text = $_.FeatureName
            Write-Host "[$(timestamp)]   - $($text)"
            $text | Out-File -Encoding "utf8" -NoNewline $filename
        }
    }
    Invoke-ScriptAt "os/service" {
        Get-Service `
        | Where-Object { $_.ServiceType -notmatch '^[0-9]+$' } `
        | Select-Object -property StartType, Name `
        | ForEach-Object {
            $filename = Convert-Filename $_.Name
            $text = "$($_.Name): $($_.StartType)"
            Write-Host "[$(timestamp)]   - $($text)"
            $text | Out-File -Encoding "utf8" -NoNewline $filename
        }
    }
    Invoke-ScriptAt "os/system" {
        # systeminfo
        systeminfo | Out-File -Encoding "utf8" systeminfo
        # diskpart
        $scriptpath = "$($env:TMP)\package-logger_diskpart.txt"
        "list volume`nlist disk" | Out-File -Encoding "utf8" $scriptpath
        diskpart -s $scriptpath | Out-File -Encoding "utf8" diskpart
        # drive_list
        # 参考：https://social.technet.microsoft.com/Forums/windowsserver/ja-JP/71da6de7-4ada-488e-a863-723a601b1483/12487124511247312463203512999223481373271228931354123652348137?forum=winserver10TP
        Get-PSDrive `
        | Where-Object { $_.name -match "^[A-Z]$" } `
        | Format-Table -AutoSize name, `
        @{ Name = "Size(GB)"; Expression = { (($_.Used + $_.Free) / 1GB).ToString("#,0.00") } }, `
        @{ Name = "Used(GB)"; Expression = { ($_.Used / 1GB).ToString("#,0.00") } }, `
        @{ Name = "Free(GB)"; Expression = { ($_.free / 1GB).ToString("#,0.00") } }, `
        @{ Name = "Use%"; Expression = { "{0:0%}" -f ($_.Used / ($_.Used + $_.Free)) } } `
        | Out-File -Encoding "utf8" drive_list
    }    
    Invoke-ScriptAt "os" {}
    Invoke-ScriptAt "package/app" {
        Get-ChildItem `
            Registry::HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Uninstall, `
            Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall, `
            Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall `
        | Get-ItemProperty `
        | Select-Object DisplayName, DisplayVersion `
        | Where-Object { $_.DisplayName } `
        | ForEach-Object {
            $filename = Convert-Filename $_.DisplayName
            $text = "$($_.DisplayName)@$($_.DisplayVersion)"
            Write-Host "[$(timestamp)]   - $($text)"
            $text | Out-File -Encoding "utf8" -NoNewline $filename
        }    
    }
    Get-Command choco | Out-Null
    if ($?) {
        Invoke-ScriptAt "package/chocolatey" {
            choco config list | Out-File -Encoding "utf8" _choco_config_list
            choco list --local-only `
            | Where-Object { $_ -match "^[^ ]+ +v?[0-9]+(\.[0-9]+)+$" } `
            | ForEach-Object {
                $filename = Convert-Filename ($_ -split " ")[0]
                $text = $_ -replace " ", "@"
                Write-Host "[$(timestamp)]   - $($text)"
                $text | Out-File -Encoding "utf8" -NoNewline $filename
            }
        }
    }
    Get-Command git | Out-Null
    if ($?) {
        Invoke-ScriptAt "package/git" {
            git config --list | Out-File -Encoding "utf8" _git_config_list
        }
    }
    Get-Command npm | Out-Null
    if ($?) {
        Invoke-ScriptAt "package/nodejs" {
            npm config list | Out-File -Encoding "utf8" _npm_config_list
            npm list --global `
            | Where-Object { $_ -ne "" }`
            | Where-Object { $_ -notmatch "->" }`
            | ForEach-Object {
                $array_1 = $_ -split " "
                $text = $array_1[1]
                $array_2 = $text -split "@"
                $filename = $array_2[0]
                if (-not $filename) { $filename = "@" + $array_2[1] }
                $filename = Convert-Filename $filename
                Write-Host "[$(timestamp)]   - $($text)"
                $text | Out-File -Encoding "utf8" -NoNewline $filename
            }
            Get-Command nvm | Out-Null
            if ($?) {
                nvm list | Out-File -Encoding "utf8" _nvm_list
            }
        }
    }
    Invoke-ScriptAt "package/python" {
        Get-Command python | Out-Null
        if ($?) {
            pip config list | Out-File -Encoding "utf8" _pip_config_list
            pip list 2>&1 `
            | Where-Object { $_ -match "^[^ ]+ +[0-9]+(\.[0-9]+)+$" } `
            | ForEach-Object { 
                $array = $_ -split " +"
                $filename = Convert-Filename $array[0]
                $text = $_ -replace " +", "@"
                Write-Host "[$(timestamp)]   - $($text)"
                $text | Out-File -Encoding "utf8" -NoNewline $filename
            }
        }
    }
    Invoke-ScriptAt "package/vscode" {
        Copy-Item $env:APPDATA\\Code\\User\\settings.json    _settings.json
        Copy-Item $env:APPDATA\\Code\\User\\keybindings.json _keybindings.json
        code --list-extensions --show-versions `
        | ForEach-Object {
            $array = $_ -split "@"
            $filename = Convert-Filename $array[0]
            $text = $_
            Write-Host "[$(timestamp)]   - $($text)"
            $text | Out-File -Encoding "utf8" -NoNewline $filename
        }    
    }
    Invoke-ScriptAt "package" {}

    function Get-OfficeApp($appname, $pattern) {
        Get-ChildItem `
            -Path "Registry::HKEY_CURRENT_USER\SOFTWARE\Microsoft\Office\$($appname)\Addins", `
            "Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Office\$($appname)\Addins", `
            "Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Wow6432Node\Microsoft\Office\$($appname)\Addins" `
            -ErrorAction Ignore `
        | Get-ItemProperty `
        | Where-Object { $_.FriendlyName } `
        | ForEach-Object {
            $filename = Convert-Filename $_.FriendlyName
            $text = $_.FriendlyName
            Write-Host "[$(timestamp)]   - $($text)"
            $text | Out-File -Encoding "utf8" -NoNewline $filename
        }      
        if ($pattern) {
            Get-ChildItem "$($env:APPDATA)\Microsoft\AddIns\$($pattern)" `
            | ForEach-Object {
                $filename = Convert-Filename $_.Name
                $text = $_.Name
                Write-Host "[$(timestamp)]   - $($text)"
                $text | Out-File -Encoding "utf8" -NoNewline $filename
            }
        }
    }

    Invoke-ScriptAt "office/excel" { Get-OfficeApp "Excel" "*.xlam" }
    Invoke-ScriptAt "office/word" { Get-OfficeApp "Word" }
    Invoke-ScriptAt "office/powerpoint" { Get-OfficeApp "PowerPoint" "*.ppam" }
    Invoke-ScriptAt "office/outlook" { Get-OfficeApp "Outlook" }
    Invoke-ScriptAt "office" {}
    
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


