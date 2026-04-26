# MongoDB Atlas Backup Script using mongodump
# Usage: .\backup.ps1 <connection_string> <output_directory>

param (
    [Parameter(Mandatory=$true)]
    [string]$ConnectionString,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = ".\backups"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFolder = Join-Path $OutputDir "backup_$Timestamp"

if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir
}

Write-Host "Starting backup to $BackupFolder..." -ForegroundColor Cyan

# Ensure mongodump is in PATH or specify full path
# Example: mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/dbname" --out="./backups/..."
& mongodump --uri="$ConnectionString" --out="$BackupFolder"

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed successfully!" -ForegroundColor Green
} else {
    Write-Host "Backup failed with exit code $LASTEXITCODE" -ForegroundColor Red
}
