# Debate Server Root Disk Cleanup Script
# 루트 파티션의 공간을 안전하게 정리하는 스크립트
# Usage: .\cleanup-root-disk.ps1

$SSH_KEY = Join-Path $PSScriptRoot "private_info\AWS\debate2025.pem"
$SERVER = "ubuntu@13.209.254.24"

Write-Host "=== Debate Server Root Disk Cleanup ===" -ForegroundColor Green

# Show current disk usage
Write-Host "`n[1/6] Current Disk Usage..." -ForegroundColor Yellow
$beforeCleanup = ssh -i $SSH_KEY $SERVER "df -h / | tail -1"
Write-Host "Before cleanup: $beforeCleanup" -ForegroundColor Cyan

# 1. Clean package cache
Write-Host "`n[2/6] Cleaning package cache (apt clean)..." -ForegroundColor Yellow
$aptClean = ssh -i $SSH_KEY $SERVER "sudo apt clean && echo 'Package cache cleaned'"
Write-Host $aptClean -ForegroundColor Green

# 2. Remove old/unused packages
Write-Host "`n[3/6] Removing old/unused packages (apt autoremove)..." -ForegroundColor Yellow
$autoremove = ssh -i $SSH_KEY $SERVER "sudo apt autoremove -y && echo 'Old packages removed'"
Write-Host $autoremove -ForegroundColor Green

# 3. Clean old log files (7+ days)
Write-Host "`n[4/6] Cleaning old log files (7+ days old)..." -ForegroundColor Yellow
$logCleanup = ssh -i $SSH_KEY $SERVER @"
# Count files before
BEFORE_COUNT=\$(sudo find /var/log -type f -name '*.log' -mtime +7 | wc -l)
# Delete old log files
sudo find /var/log -type f -name '*.log' -mtime +7 -delete
AFTER_COUNT=\$(sudo find /var/log -type f -name '*.log' -mtime +7 | wc -l)
echo "Deleted old log files (7+ days): \$((BEFORE_COUNT - AFTER_COUNT)) files"
"@
Write-Host $logCleanup -ForegroundColor Green

# 4. Clean journal logs (keep last 7 days)
Write-Host "`n[5/6] Cleaning systemd journal logs (keep last 7 days)..." -ForegroundColor Yellow
$journalCleanup = ssh -i $SSH_KEY $SERVER "sudo journalctl --vacuum-time=7d && echo 'Journal logs cleaned'"
Write-Host $journalCleanup -ForegroundColor Green

# 5. Clean temporary files
Write-Host "`n[6/6] Cleaning temporary files..." -ForegroundColor Yellow
$tempCleanup = ssh -i $SSH_KEY $SERVER @"
# Clean /tmp files older than 7 days
TMP_BEFORE=\$(sudo find /tmp -type f -mtime +7 2>/dev/null | wc -l)
sudo find /tmp -type f -mtime +7 -delete 2>/dev/null
TMP_AFTER=\$(sudo find /tmp -type f -mtime +7 2>/dev/null | wc -l)
echo "Cleaned temporary files: \$((TMP_BEFORE - TMP_AFTER)) files"
"@
Write-Host $tempCleanup -ForegroundColor Green

# Show final disk usage
Write-Host "`n=== Final Disk Usage ===" -ForegroundColor Green
$afterCleanup = ssh -i $SSH_KEY $SERVER "df -h / | tail -1"
Write-Host "After cleanup: $afterCleanup" -ForegroundColor Cyan

# Calculate space freed
$beforeMatch = $beforeCleanup -match '(\d+\.?\d*)([GMK])'
$afterMatch = $afterCleanup -match '(\d+\.?\d*)([GMK])'

if ($beforeMatch -and $afterMatch) {
    $beforeSize = [double]$matches[1]
    $beforeUnit = $matches[2]
    $afterSize = [double]$afterMatch[1]
    $afterUnit = $afterMatch[2]
    
    # Convert to MB for comparison
    $beforeMB = switch ($beforeUnit) {
        'G' { $beforeSize * 1024 }
        'M' { $beforeSize }
        'K' { $beforeSize / 1024 }
    }
    $afterMB = switch ($afterUnit) {
        'G' { $afterSize * 1024 }
        'M' { $afterSize }
        'K' { $afterSize / 1024 }
    }
    
    $freedMB = [math]::Round($beforeMB - $afterMB, 2)
    if ($freedMB -gt 0) {
        Write-Host "`n✓ Space freed: ${freedMB}MB" -ForegroundColor Green
    }
}

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Green
Write-Host "`nNote: If disk is still full, check:" -ForegroundColor Yellow
Write-Host "  - MySQL database size: sudo du -sh /var/lib/mysql" -ForegroundColor White
Write-Host "  - Large files: sudo find / -type f -size +100M 2>/dev/null | head -20" -ForegroundColor White
Write-Host "  - Docker images (if installed): docker system df" -ForegroundColor White


