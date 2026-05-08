@echo off
net session >nul 2>&1
if %errorLevel% == 0 (
	Powershell.exe -ExecutionPolicy Bypass -Command "& '%~dp0DTS_executor.ps1'"
) else (
	PowerShell.exe -ExecutionPolicy Bypass -Command "& {Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File ""%~dp0DTS_executor.ps1""' -Verb RunAs}"
)
@echo on
exit 0