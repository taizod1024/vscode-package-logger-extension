param(
    [Parameter(Mandatory = $true)] [string] $logPath,
    [Parameter(Mandatory = $true)] [string] $tmpPath
)

function timestamp() {
    Get-Date -Format "yyyy/MM/dd hh:mm:ss"
}

try {

    $app_name = $myInvocation.MyCommand.name
    Write-Host "[$(timestamp)] $($app_name)"
    Write-Host "[$(timestamp)] - logPath: $($logPath)"
    Write-Host "[$(timestamp)] - tmpPath: $($tmpPath)"

    Write-Host "[$(timestamp)] - remove tmpPath"
    if (Test-Path $tmpPath) { Remove-Item $tmpPath -Recurse -Force }
    Write-Host "[$(timestamp)] - create tmpPath"
    New-Item $tmpPath -itemtype Directory | Out-Null

    Push-Location $tmpPath
    "abc" > .\abc.txt
    Pop-Location

    Write-Host "[$(timestamp)] - move tmpPath to logPath"
    if (Test-Path $logPath) { Remove-Item $logPath -Recurse -Force }
    Move-Item $tmpPath $logPath -Force

    Write-Host "[$(timestamp)] - done"

}
catch {
}
finally {
    pause
}


