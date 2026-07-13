<#
.SYNOPSIS
Automates the compression and deployment of the uploads folder to your VPS.

.DESCRIPTION
This script will:
1. Compress the 'src\uploads' directory into 'uploads.zip'
2. Use SCP to securely transfer the zip to your VPS
3. Use SSH to unzip the files on the VPS, set permissions, and clean up.

.INSTRUCTIONS
Open this file and edit the variables in the Configuration Section below before running.
#>

# ==========================================
# CONFIGURATION SECTION - EDIT THESE VALUES!
# ==========================================
$VPS_USER = "root"                 # Your VPS username (e.g., root or ubuntu)
$VPS_IP = "31.97.226.153"    # Your VPS IP address (e.g., 192.168.1.100)
$VPS_DEST_PATH = "/var/www/backend/src" # The path to your backend's src folder on the VPS
# ==========================================


$ErrorActionPreference = "Stop"

$UploadsDir = ".\src\uploads"
$ZipFile = ".\uploads.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting VPS Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Step 1: Compress the uploads folder
if (Test-Path $ZipFile) {
    Write-Host "Removing old zip file..." -ForegroundColor Yellow
    Remove-Item $ZipFile -Force
}

Write-Host "Compressing $UploadsDir into $ZipFile... (This may take a few minutes for 8,000+ files)" -ForegroundColor Yellow
Compress-Archive -Path "$UploadsDir\*" -DestinationPath $ZipFile -CompressionLevel Optimal
Write-Host "Compression complete!" -ForegroundColor Green

# Step 2: Transfer via SCP
Write-Host "`nTransferring $ZipFile to ${VPS_USER}@${VPS_IP}:${VPS_DEST_PATH}..." -ForegroundColor Yellow
Write-Host "You may be prompted for your VPS password." -ForegroundColor Yellow
scp $ZipFile "${VPS_USER}@${VPS_IP}:${VPS_DEST_PATH}/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "SCP transfer failed. Please check your IP and credentials." -ForegroundColor Red
    exit
}
Write-Host "Transfer complete!" -ForegroundColor Green

# Step 3: Unzip and configure permissions via SSH
Write-Host "`nConnecting via SSH to configure permissions and unzip..." -ForegroundColor Yellow
$sshCommand = @"
    cd $VPS_DEST_PATH
    unzip -o uploads.zip -d uploads
    rm uploads.zip
    chown -R www-data:www-data uploads || chown -R ubuntu:ubuntu uploads || chown -R root:root uploads
    chmod -R 755 uploads
    echo 'VPS Setup Complete!'
"@

ssh "${VPS_USER}@${VPS_IP}" $sshCommand

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Deployment Completed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Don't forget to push your code changes (app.js) and update your Nginx config as shown in the guide!" -ForegroundColor Yellow
