If (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))
{
  # Relaunch as an elevated process:
  Start-Process powershell.exe "-File",('"{0}"' -f $MyInvocation.MyCommand.Path) -Verb RunAs
  exit
}

Write-Output "*** DTS APO4x Extension Package installation ***"

$RTKAudio = [bool](Get-PnpDevice | Where-Object FriendlyName -eq 'Realtek(R) Audio')
$CmediaAudio = [bool](Get-PnpDevice | Where-Object FriendlyName -eq 'C-Media(R) Audio')
$ScriptLocation = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptLocation
$InfPath = (Get-ChildItem -Recurse -Include *.inf | Select-String -Pattern "e2f84ce7-8efa-411c-aa69-97454ca4cb57" | Select Path).Path

if ($RTKAudio)
{
    $InstanceId = (Get-PnpDevice | Where-Object FriendlyName -eq 'Realtek(R) Audio').InstanceId
    $HWID = $InstanceId.split("\\")[0] + "\\" + $InstanceId.split("\\")[1]
    $REV = '&' + $HWID.split("&")[-1]
    $HWID = $HWID -replace $REV, $Null

    Write-Output "Audio HWID: " $HWID

    $Compatible = 0
    Foreach ($Item in $Infpath)
    {
        if ([bool](Get-Content $Item | Select-String -Pattern $HWID))
        {
            cmd.exe /c pnputil /add-driver $Item /install
            $Compatible = 1
        }
    }
    if (-not $Compatible) {Write-Output "This Device is not compatible"}
} 
elseif ($CmediaAudio)
{
    $IntelUsbAudio = [bool](Get-PnpDevice | Select FriendlyName | Select-String -Pattern "Smart Sound Technology for USB Audio")
    if ($IntelUsbAudio)
    {
        $InstanceId = (Get-PnpDevice | Select InstanceId | Select-String -Pattern "INTELAUDIO" | Select-String -Pattern "LINKTYPE_06").Line.split("=")[1]
        $HWID = $InstanceId.split("\\")[0] + "\\" + $InstanceId.split("\\")[1]
        $REV = '&' + $HWID.split("&")[-1]
        $HWID = $HWID -replace $REV, $Null
        
        Write-Output "Audio HWID:" $HWID

        $Compatible = 0
        Foreach ($Item in $Infpath)
        {
            if ([bool](Get-Content $Item | Select-String -Pattern $HWID))
            {
                cmd.exe /c pnputil /add-driver $Item /install
                $Compatible = 1
            }
        }
        if (-not $Compatible) {Write-Output "This Device is not compatible"}
    }
    else
    {
        $InstanceId = (Get-PnpDevice | Where-Object FriendlyName -eq 'C-Media(R) Audio').InstanceId
        $HWID = $InstanceId.split("\\")[0] + "\\" + $InstanceId.split("\\")[1]
        
        Write-Output "Audio HWID:" $HWID
        
        $Compatible = 0
        Foreach ($Item in $Infpath)
        {
            if ([bool](Get-Content $Item | Select-String -Pattern $HWID))
            {
                cmd.exe /c pnputil /add-driver $Item /install
                $Compatible = 1
            }
        }
        if (-not $Compatible) {Write-Output "This Device is not compatible"}
    }
}
else
{
    Foreach ($Item in $Infpath)
    {
        cmd.exe /c pnputil /add-driver $Item /install
    }
}


Write-Output "*** DTS APO4x Core Package installation ***"
pnputil -a "DTS_UWP_APO4x_Core_MSFT_SIGNED_1_11_6_0_21H1_21H2_22H2\dtsapo4x64.inf" /install

Write-Output "*** DTS APO4x Service installation ***"
pnputil -a "DTS_UWP_APO4x_RPCService_MSFT_SIGNED_1_11_2_0_21H1_21H2_22H2\dtsapo4xservice.inf" /install

Write-Output "*** DTS Audio Processing HSA SWC installation ***"
pnputil -a "DAP_UWP_APO4x_HSA_MSFT_SIGNED_1_10_3_0_21H1_21H2_22H2\dtsaudioprocessinghsa.inf" /install

