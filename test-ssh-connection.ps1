# 🔧 SSH Connection Test Script

## Test SSH connection to Ubuntu VM
Write-Host "Testing SSH connection to Ubuntu VM..." -ForegroundColor Yellow

# Test basic connectivity
Write-Host "`n1. Testing ping connectivity:" -ForegroundColor Cyan
ping 192.168.40.153 -n 2

# Test SSH port
Write-Host "`n2. Testing SSH port 22:" -ForegroundColor Cyan
Test-NetConnection -ComputerName 192.168.40.153 -Port 22

# Alternative SSH connection methods
Write-Host "`n3. SSH connection options:" -ForegroundColor Cyan
Write-Host "Once SSH is enabled, try:" -ForegroundColor Green
Write-Host "ssh username@192.168.40.153" -ForegroundColor White

# Check for SSH clients
Write-Host "`n4. Available SSH clients:" -ForegroundColor Cyan
if (Get-Command ssh -ErrorAction SilentlyContinue) {
    Write-Host "✅ OpenSSH client is available" -ForegroundColor Green
    ssh -V
} else {
    Write-Host "❌ OpenSSH client not found" -ForegroundColor Red
    Write-Host "Install OpenSSH client or use PuTTY" -ForegroundColor Yellow
}