# Debate Server Disk Cleanup Script (PowerShell)
# 서버의 디스크 공간을 정리하는 스크립트
# Usage: .\cleanup-server-disk.ps1

$SSH_KEY = Join-Path $PSScriptRoot "private_info\AWS\debate2025.pem"
$SERVER = "ubuntu@13.209.254.24"

Write-Host "=== Debate Server Disk Cleanup ===" -ForegroundColor Green

# 1. Check current disk usage
Write-Host "`n[1/4] Checking current disk usage..." -ForegroundColor Yellow
$diskInfo = ssh -i $SSH_KEY $SERVER "df -h /home/ubuntu"
Write-Host $diskInfo -ForegroundColor Cyan

# 2. Check folder sizes
Write-Host "`n[2/4] Checking folder sizes..." -ForegroundColor Yellow
$folderSizes = ssh -i $SSH_KEY $SERVER @"
echo "=== Debate folders ==="
du -sh /home/ubuntu/opt/debate/* 2>/dev/null | sort -h || echo "No subdirectories"
echo ""
echo "=== Log files ==="
find /home/ubuntu/opt/debate/logs -type f -name "*.log" -exec du -sh {} \; 2>/dev/null | sort -h | tail -10 || echo "No log files"
echo ""
echo "=== Old log files (7+ days) ==="
find /home/ubuntu/opt/debate/logs -type f -name "*.log" -mtime +7 -exec du -sh {} \; 2>/dev/null | sort -h || echo "No old log files"
"@
Write-Host $folderSizes -ForegroundColor Cyan

# 3. Ask for confirmation
Write-Host "`n[3/4] Cleanup options:" -ForegroundColor Yellow
Write-Host "  1. Delete old log files (7+ days old)" -ForegroundColor White
Write-Host "  2. Delete old log files (30+ days old)" -ForegroundColor White
Write-Host "  3. Clear temporary files" -ForegroundColor White
Write-Host "  4. Show large files (top 10)" -ForegroundColor White
Write-Host "  5. All of the above (except large files)" -ForegroundColor White

$choice = Read-Host "`nSelect option (1-5, or 'q' to quit)"

if ($choice -eq 'q') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# 4. Perform cleanup
Write-Host "`n[4/4] Performing cleanup..." -ForegroundColor Yellow

switch ($choice) {
    '1' {
        Write-Host "Deleting log files older than 7 days..."
        $result = ssh -i $SSH_KEY $SERVER "find /home/ubuntu/opt/debate/logs -type f -name '*.log' -mtime +7 -delete && echo 'Deleted old log files'"
        Write-Host $result -ForegroundColor Green
    }
    '2' {
        Write-Host "Deleting log files older than 30 days..."
        $result = ssh -i $SSH_KEY $SERVER "find /home/ubuntu/opt/debate/logs -type f -name '*.log' -mtime +30 -delete && echo 'Deleted old log files'"
        Write-Host $result -ForegroundColor Green
    }
    '3' {
        Write-Host "Clearing temporary files..."
        $result = ssh -i $SSH_KEY $SERVER "sudo find /tmp -type f -mtime +7 -delete 2>/dev/null; sudo find /var/tmp -type f -mtime +7 -delete 2>/dev/null; echo 'Cleared temp files'"
        Write-Host $result -ForegroundColor Green
    }
    '4' {
        Write-Host "Finding large files..."
        $result = ssh -i $SSH_KEY $SERVER "find /home/ubuntu -type f -size +10M -exec du -sh {} \; 2>/dev/null | sort -h | tail -10"
        Write-Host $result -ForegroundColor Cyan
    }
    '5' {
        Write-Host "Performing all cleanup operations..."
        
        Write-Host "  - Deleting log files older than 7 days..."
        $result1 = ssh -i $SSH_KEY $SERVER "find /home/ubuntu/opt/debate/logs -type f -name '*.log' -mtime +7 -delete && echo 'Deleted old log files'"
        Write-Host $result1 -ForegroundColor Green
        
        Write-Host "  - Clearing temporary files..."
        $result2 = ssh -i $SSH_KEY $SERVER "sudo find /tmp -type f -mtime +7 -delete 2>/dev/null; sudo find /var/tmp -type f -mtime +7 -delete 2>/dev/null; echo 'Cleared temp files'"
        Write-Host $result2 -ForegroundColor Green
        
        Write-Host "  - Removing old tar files..."
        $result3 = ssh -i $SSH_KEY $SERVER "rm -f /home/ubuntu/*.tar.gz 2>/dev/null && echo 'Removed old tar files'"
        Write-Host $result3 -ForegroundColor Green
    }
    default {
        Write-Host "Invalid option. Cancelled." -ForegroundColor Red
        exit 1
    }
}

# Show final disk usage
Write-Host "`n=== Final Disk Usage ===" -ForegroundColor Green
$finalDiskInfo = ssh -i $SSH_KEY $SERVER "df -h /home/ubuntu"
Write-Host $finalDiskInfo -ForegroundColor Cyan

Write-Host "`n=== Cleanup Complete ===" -ForegroundColor Green


