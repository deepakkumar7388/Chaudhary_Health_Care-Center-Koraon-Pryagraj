If (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))
{
  # Relaunch as an elevated process:
  Start-Process powershell.exe "-File",('"{0}"' -f $MyInvocation.MyCommand.Path) -Verb RunAs
  exit
}

$online_drivers = Get-WindowsDriver -Online | Where-Object {$_.ProviderName -eq "DTS"}

Stop-Service -InputObject Audiosrv -Force
if (Get-Service -DisplayName DtsApo4Service -ErrorAction SilentlyContinue) {
    Stop-Service DtsApo4Service
}

foreach ($driver in $online_drivers) {
    #echo $driver
    if ($driver.OriginalFileName -match "dtsapo4x64.inf$" -Or $driver.OriginalFileName -match "dtsapo3.inf$") {
        $apo4x_core = $driver
        Write-Host "Apo4x Core Version    $($apo4x_core.Version) $(($apo4x_core.Date).ToString("yyyy/MM/dd"))" -NoNewline        
    } elseif ($driver.OriginalFileName -match "dtsapo4xservice.inf$") {
        $apo4x_service = $driver
        sc.exe delete "DtsApo4Service" | Out-Null
        if (Test-Path C:\Windows\System32\DTS) {
            Remove-Item -Path C:\Windows\System32\DTS -Recurse -Force -Confirm:$false -ErrorAction SilentlyContinue
        }
        Write-Host "Apo4x Service Version $($apo4x_service.Version) $(($apo4x_service.Date).ToString("yyyy/MM/dd"))" -NoNewline
    } elseif ($driver.OriginalFileName -match "hsa.inf$") {        
        $apo4x_hsa = $driver            
        Write-Host "HSA Version           $($apo4x_hsa.Version) $(($apo4x_hsa.Date).ToString("yyyy/MM/dd"))" -NoNewline        
    } elseif ($driver.OriginalFileName -match "extensionpkg.inf$" -Or $driver.OriginalFileName -match "extkg.inf$" -Or $driver.OriginalFileName -match "extpkg.inf$") {
        $apo4x_extpkg = $driver
        Write-Host "Extension Pkg Version $($apo4x_extpkg.Version) $(($apo4x_extpkg.Date).ToString("yyyy/MM/dd"))" -NoNewline
    } else {
        continue
    }
    pnputil /delete-driver $($driver.Driver) /uninstall | out-null
    Write-Host "   ...removed"
}

if ($apo4x_core -eq $null -and $apo4x_service -eq $null -and $apo4x_hsa -eq $null -and $apo4x_extpkg -eq $null) {
    Write-Host "No DTS driver is found!"
}

Start-Service Audiosrv

foreach ($appx in Get-Appxpackage -all DTSInc*) {
    $dts_product = $appx.Name.split("\.")[1]    
    try {
        try {            
            $progressPreference = 'SilentlyContinue'
            Remove-AppxPackage $appx -AllUsers
            Write-Host $dts_product $appx.Version -NoNewline
            Write-Host "   ...uninstalled for all users"        
        } catch {            
            Remove-AppxPackage $appx
            Write-Host $dts_product $appx.Version -NoNewline
            Write-Host "   ...uninstalled"  
        }
    } catch {
        Write-Host $dts_product ":"
        Write-Host $appx "   ...cannot be uninstalled"
        $Error[0] # Dump details about the last error
        #Remove-AppxProvisionedPackage -Online -PackageName pkg_name
    }
}


# Delete DTS register
$ErrorActionPreference = 'SilentlyContinue'
try {
    Write-Host "Remove DTS register under software\dts\"
    Remove-Item -Path HKLM:\SOFTWARE\DTS -Recurse
} catch {
    Write-Host "DTS reg key under software\dts\ doesn't exist."
}

if ($psISE -eq $null) {
    # keep console opened
    Write-Host "Press any key to continue..."
    [void][System.Console]::ReadKey($true)
} else {
    Pause
}
