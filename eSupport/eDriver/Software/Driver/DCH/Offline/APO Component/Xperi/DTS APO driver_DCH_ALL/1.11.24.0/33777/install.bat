@echo off
net session >nul 2>&1
if %errorLevel% == 0 (
	start /wait Powershell.exe -ExecutionPolicy Bypass -Command "& '%~dp0DTS_install_executor.ps1'"
) else (
	start /wait PowerShell.exe -ExecutionPolicy Bypass -Command "& {Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File ""%~dp0DTS_install_executor.ps1""' -Verb RunAs}"
)

@echo Done
exit 0
