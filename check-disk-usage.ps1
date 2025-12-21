# Debate Server Disk Usage Analysis Script
# 루트 파티션의 공간 사용 현황을 분석하는 스크립트
# Usage: .\check-disk-usage.ps1

$SSH_KEY = Join-Path $PSScriptRoot "private_info\AWS\debate2025.pem"
$SERVER = "ubuntu@13.209.254.24"

Write-Host "=== Debate Server Disk Usage Analysis ===" -ForegroundColor Green

# 1. Overall disk usage
Write-Host "`n[1/5] Overall Disk Usage (df -h)..." -ForegroundColor Yellow
$diskInfo = ssh -i $SSH_KEY $SERVER "df -h"
Write-Host $diskInfo -ForegroundColor Cyan

# 2. Root partition detailed breakdown
Write-Host "`n[2/5] Root Partition (/) Space Breakdown..." -ForegroundColor Yellow
$rootBreakdown = ssh -i $SSH_KEY $SERVER 'echo "=== Top 10 Largest Directories in Root ==="; sudo du -h --max-depth=1 / 2>/dev/null | sort -rh | head -11'
Write-Host $rootBreakdown -ForegroundColor Cyan

# 3. Common space-consuming locations
Write-Host "`n[3/5] Checking Common Space-Consuming Locations..." -ForegroundColor Yellow
$commonLocations = ssh -i $SSH_KEY $SERVER 'echo "=== /var/log Log files ==="; sudo du -sh /var/log 2>/dev/null; sudo du -sh /var/log/* 2>/dev/null | sort -rh | head -10; echo ""; echo "=== /var/cache Package cache ==="; sudo du -sh /var/cache 2>/dev/null; sudo du -sh /var/cache/* 2>/dev/null | sort -rh | head -10; echo ""; echo "=== /var/lib Application data ==="; sudo du -sh /var/lib 2>/dev/null; sudo du -sh /var/lib/* 2>/dev/null | sort -rh | head -10; echo ""; echo "=== /usr System programs ==="; sudo du -sh /usr 2>/dev/null; echo ""; echo "=== /tmp Temporary files ==="; sudo du -sh /tmp 2>/dev/null; echo ""; echo "=== /opt Optional software ==="; sudo du -sh /opt 2>/dev/null'
Write-Host $commonLocations -ForegroundColor Cyan

# 4. MySQL database size (if exists)
Write-Host "`n[4/5] Checking MySQL Database Size..." -ForegroundColor Yellow
$mysqlSize = ssh -i $SSH_KEY $SERVER 'if [ -d /var/lib/mysql ]; then echo "=== MySQL Data Directory ==="; sudo du -sh /var/lib/mysql 2>/dev/null; echo ""; echo "=== MySQL Databases ==="; sudo du -sh /var/lib/mysql/* 2>/dev/null | sort -rh | head -10; else echo "MySQL data directory not found at /var/lib/mysql"; fi'
Write-Host $mysqlSize -ForegroundColor Cyan

# 5. Old log files
Write-Host "`n[5/5] Checking Old Log Files..." -ForegroundColor Yellow
$oldLogs = ssh -i $SSH_KEY $SERVER 'echo "=== Log files older than 7 days ==="; sudo find /var/log -type f -name "*.log" -mtime +7 -exec du -sh {} \; 2>/dev/null | sort -rh | head -20; echo ""; echo "=== Journal logs systemd ==="; sudo journalctl --disk-usage 2>/dev/null || echo "Cannot check journal logs"'
Write-Host $oldLogs -ForegroundColor Cyan

# Summary and recommendations
Write-Host "`n=== Summary & Recommendations ===" -ForegroundColor Green
Write-Host "Common space-saving actions:" -ForegroundColor Yellow
Write-Host "  1. Clean old logs: sudo find /var/log -type f -name '*.log' -mtime +7 -delete" -ForegroundColor White
Write-Host "  2. Clean package cache: sudo apt clean" -ForegroundColor White
Write-Host "  3. Clean journal logs: sudo journalctl --vacuum-time=7d" -ForegroundColor White
Write-Host "  4. Remove old kernels: sudo apt autoremove" -ForegroundColor White
Write-Host "  5. Check Docker (if installed): docker system prune -a" -ForegroundColor White

Write-Host "`n=== Analysis Complete ===" -ForegroundColor Green

