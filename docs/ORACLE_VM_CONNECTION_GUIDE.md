# Connecting to Oracle VM Ubuntu Server 22.04

## 🔗 Connection Methods

### 1. SSH Connection (Recommended)

#### From Windows PowerShell/Command Prompt:
```powershell
# Basic SSH connection
ssh username@192.168.1.50

# SSH with specific port (if changed from default 22)
ssh -p 22 username@192.168.1.50

# SSH with private key
ssh -i path\to\private\key username@192.168.1.50
```

#### From Windows Terminal/WSL:
```bash
# Basic connection
ssh username@192.168.1.50

# With verbose output for troubleshooting
ssh -v username@192.168.1.50

# With X11 forwarding (for GUI apps)
ssh -X username@192.168.1.50
```

### 2. Oracle VM VirtualBox Console

#### VirtualBox Direct Console:
1. Open Oracle VM VirtualBox Manager
2. Select your Ubuntu Server VM
3. Click "Show" or double-click the VM
4. This opens the direct console window

#### VirtualBox Remote Display (if enabled):
```powershell
# Connect via RDP (if VRDE is enabled)
mstsc /v:192.168.1.50:3389
```

### 3. Windows SSH Clients

#### Built-in OpenSSH (Windows 10/11):
```powershell
# Check if SSH client is available
ssh -V

# Connect to your server
ssh your-username@192.168.1.50
```

#### PuTTY (Alternative SSH Client):
1. Download PuTTY from https://www.putty.org/
2. Install and open PuTTY
3. Enter Host Name: `192.168.1.50`
4. Port: `22`
5. Connection Type: `SSH`
6. Click "Open"

#### Windows Terminal (Recommended):
```powershell
# Install Windows Terminal from Microsoft Store
# Add SSH profile in settings
{
    "name": "Ubuntu Server",
    "commandline": "ssh username@192.168.1.50",
    "icon": "🐧"
}
```

### 4. VS Code Remote SSH

#### Install VS Code Extensions:
```powershell
# Install VS Code Remote - SSH extension
code --install-extension ms-vscode-remote.remote-ssh
```

#### Configure SSH in VS Code:
1. Open VS Code
2. Press `Ctrl+Shift+P`
3. Type "Remote-SSH: Connect to Host"
4. Enter: `username@192.168.1.50`
5. Enter password when prompted

#### SSH Config File (Optional):
Create/edit `~/.ssh/config`:
```
Host ubuntu-server
    HostName 192.168.1.50
    User your-username
    Port 22
    # IdentityFile ~/.ssh/id_rsa  # if using key auth
```

Then connect with: `ssh ubuntu-server`

## 🔧 Initial Setup Requirements

### 1. Ensure SSH Server is Running on Ubuntu

Connect via VirtualBox console first, then:

```bash
# Check SSH service status
sudo systemctl status ssh

# If not running, start it
sudo systemctl start ssh
sudo systemctl enable ssh

# Check if SSH is listening on port 22
sudo netstat -tlnp | grep :22

# Install SSH if not installed
sudo apt update
sudo apt install openssh-server -y
```

### 2. Configure Ubuntu Network Settings

#### Check Current IP Configuration:
```bash
# Check IP address
ip addr show

# Check network interfaces
ip link show

# Check if using DHCP or static IP
cat /etc/netplan/*.yaml
```

#### Set Static IP (if needed):
```bash
# Edit netplan configuration
sudo nano /etc/netplan/00-installer-config.yaml

# Example static IP configuration:
network:
  version: 2
  ethernets:
    enp0s3:  # Replace with your interface name
      addresses:
        - 192.168.1.50/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4

# Apply changes
sudo netplan apply
```

### 3. Configure VirtualBox Network Settings

#### NAT with Port Forwarding:
1. VM Settings → Network → Adapter 1
2. Attached to: NAT
3. Advanced → Port Forwarding
4. Add rule:
   - Name: SSH
   - Host IP: 127.0.0.1
   - Host Port: 2222
   - Guest IP: (leave blank)
   - Guest Port: 22

Connect with: `ssh -p 2222 username@localhost`

#### Bridged Adapter (Direct Network Access):
1. VM Settings → Network → Adapter 1
2. Attached to: Bridged Adapter
3. Name: Select your host network adapter
4. Promiscuous Mode: Allow All

This gives the VM a direct IP on your network.

#### Host-Only Adapter:
1. File → Host Network Manager → Create new adapter
2. VM Settings → Network → Adapter 1
3. Attached to: Host-only Adapter
4. Name: Select the created adapter

### 4. Firewall Configuration

#### Ubuntu UFW Firewall:
```bash
# Check firewall status
sudo ufw status

# Allow SSH
sudo ufw allow ssh
# or
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable

# Check listening ports
sudo ss -tlnp
```

## 🚨 Troubleshooting Connection Issues

### SSH Connection Refused

#### Check SSH Service:
```bash
# Via VirtualBox console
sudo systemctl status ssh
sudo systemctl restart ssh

# Check SSH configuration
sudo nano /etc/ssh/sshd_config

# Look for these settings:
Port 22
PermitRootLogin prohibit-password  # or yes/no
PasswordAuthentication yes
PubkeyAuthentication yes
```

#### Check Network Connectivity:
```powershell
# From Windows, test if server is reachable
ping 192.168.1.50

# Test if SSH port is open
telnet 192.168.1.50 22
# or use PowerShell
Test-NetConnection -ComputerName 192.168.1.50 -Port 22
```

### Network Issues

#### Check VirtualBox Network Settings:
```bash
# On Ubuntu, check network interface
ip addr show

# Check routing
ip route show

# Check DNS
nslookup google.com

# Test internet connectivity
ping google.com
```

### Authentication Issues

#### Password Authentication:
```bash
# Enable password authentication (if disabled)
sudo nano /etc/ssh/sshd_config

# Ensure this line exists and is set to yes:
PasswordAuthentication yes

# Restart SSH service
sudo systemctl restart ssh
```

#### Key-based Authentication:
```powershell
# Generate SSH key pair on Windows
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key to server
scp ~/.ssh/id_rsa.pub username@192.168.1.50:~/

# On server, add key to authorized_keys
cat ~/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

## 📋 Quick Connection Checklist

1. **✅ VM is running** - Check VirtualBox Manager
2. **✅ Network configured** - VM has IP address (192.168.1.50)
3. **✅ SSH server running** - `sudo systemctl status ssh`
4. **✅ Firewall allows SSH** - `sudo ufw status`
5. **✅ Network reachable** - `ping 192.168.1.50` from Windows
6. **✅ SSH port open** - `Test-NetConnection -ComputerName 192.168.1.50 -Port 22`
7. **✅ Credentials correct** - Username and password

## 🎯 Recommended Connection Method

**For HealthCare API development, I recommend:**

1. **Use VS Code with Remote-SSH extension**
2. **Configure SSH key authentication**
3. **Set up bridged network adapter for direct access**

This gives you the best development experience with full VS Code features on the remote server.

## 🔗 Quick Commands Reference

```powershell
# Test connection
ping 192.168.1.50
Test-NetConnection -ComputerName 192.168.1.50 -Port 22

# Connect via SSH
ssh username@192.168.1.50

# Connect with VS Code
code --remote ssh-remote+username@192.168.1.50 /home/username/healthcare-stack

# Copy files to server
scp -r deployment/ username@192.168.1.50:~/

# Copy files from server
scp username@192.168.1.50:~/file.txt ./
```

Let me know which connection method you'd like to use, and I can provide more specific guidance!