# Oracle VM Ubuntu Server Connection Troubleshooting

## 🔍 Current Issue: Server Not Reachable at 192.168.1.50

Based on the ping and port tests, your Ubuntu VM is not accessible at 192.168.1.50. Here's how to fix this:

## 🎯 Step-by-Step Solution

### Step 1: Check if VM is Running
1. Open **Oracle VM VirtualBox Manager**
2. Look for your Ubuntu Server VM
3. Ensure the status shows **"Running"**
4. If not running, click **"Start"**

### Step 2: Connect via VirtualBox Console
1. In VirtualBox Manager, **double-click** your Ubuntu VM
2. This opens the direct console window
3. Log in with your Ubuntu username/password
4. You should see the Ubuntu command prompt

### Step 3: Check VM's Current IP Address
Once logged in via console, run these commands:

```bash
# Check current IP address
ip addr show

# Look for your main network interface (usually enp0s3 or eth0)
# Example output:
# 2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP>
#    inet 10.0.2.15/24 brd 10.0.2.255 scope global dynamic enp0s3

# Check network configuration
ip route show

# Check if SSH is running
sudo systemctl status ssh

# If SSH is not running, start it
sudo systemctl start ssh
sudo systemctl enable ssh
```

### Step 4: Configure VirtualBox Network Settings

The VM is likely using **NAT** networking, which makes it inaccessible from your host machine. You have two options:

#### Option A: Use Bridged Adapter (Recommended)

1. **Shut down the VM** (important!)
2. In VirtualBox Manager, select your VM
3. Click **"Settings"** → **"Network"** → **"Adapter 1"**
4. Change **"Attached to"** from **"NAT"** to **"Bridged Adapter"**
5. Select your host network adapter from the **"Name"** dropdown
6. Set **"Promiscuous Mode"** to **"Allow All"**
7. Click **"OK"**
8. **Start the VM**

After restart, check the new IP:
```bash
ip addr show
# The VM should now have an IP in your local network range (192.168.1.x)
```

#### Option B: Use NAT with Port Forwarding

If you prefer to keep NAT:

1. VM Settings → **"Network"** → **"Adapter 1"**
2. Ensure **"Attached to"** is **"NAT"**
3. Click **"Advanced"** → **"Port Forwarding"**
4. Click the **"+"** button to add a new rule:
   - **Name**: SSH
   - **Protocol**: TCP
   - **Host IP**: 127.0.0.1
   - **Host Port**: 2222
   - **Guest IP**: (leave blank)
   - **Guest Port**: 22
5. Click **"OK"**

Then connect using:
```powershell
ssh -p 2222 username@localhost
```

### Step 5: Test SSH Connection

Once you've configured the network, test the connection:

#### For Bridged Network:
```powershell
# Check the new IP (should be in your network range)
ping 192.168.1.xxx  # Replace with actual IP from Step 3

# Test SSH
ssh username@192.168.1.xxx
```

#### For NAT with Port Forwarding:
```powershell
# Test SSH via port forwarding
ssh -p 2222 username@localhost
```

### Step 6: Configure Ubuntu Firewall

If connection still fails, configure the Ubuntu firewall:

```bash
# Check firewall status
sudo ufw status

# Allow SSH
sudo ufw allow ssh

# Enable firewall if not enabled
sudo ufw enable

# Check if SSH is listening
sudo netstat -tlnp | grep :22
```

## 🚀 Quick Setup for HealthCare API Deployment

Once you have SSH access, you can quickly deploy the HealthCare API:

### 1. Copy Deployment Files
```powershell
# Copy the deployment files to your server
scp -r deployment/ username@192.168.1.xxx:~/

# Or if using port forwarding:
scp -P 2222 -r deployment/ username@localhost:~/
```

### 2. Install and Run the Stack
```bash
# SSH into your server
ssh username@192.168.1.xxx

# Make scripts executable
chmod +x ~/deployment/*.sh

# Install Docker (if not already installed)
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Run the installer
cd ~/deployment
./install_healthcare_stack.sh healthcare.yourdomain.com your-email@domain.com

# Start the stack
cd ~/healthcare-stack
./start.sh
```

## 🔧 Alternative Connection Methods

### Method 1: Windows Subsystem for Linux (WSL)
```powershell
# If you have WSL installed
wsl

# From WSL terminal
ssh username@192.168.1.xxx
```

### Method 2: PuTTY
1. Download PuTTY from https://www.putty.org/
2. Install and open PuTTY
3. Enter **Host Name**: Your VM's IP address
4. **Port**: 22 (or 2222 if using port forwarding)
5. **Connection Type**: SSH
6. Click **"Open"**

### Method 3: VS Code Remote SSH
1. Install **"Remote - SSH"** extension in VS Code
2. Press **Ctrl+Shift+P**
3. Type **"Remote-SSH: Connect to Host"**
4. Enter: `username@192.168.1.xxx`
5. Enter password when prompted

## 📋 Common Network Configurations

### Your Network Appears to Use: 192.168.40.x
Based on the test results, your Windows machine has IP `192.168.40.146`. Your VM should get an IP in the same range when using Bridged mode.

Expected VM IP range: **192.168.40.xxx**

### After Bridged Network Setup:
```bash
# Check for IP in correct range
ip addr show | grep "192.168.40"

# Example: inet 192.168.40.150/24
```

Then connect with:
```powershell
ssh username@192.168.40.150  # Use actual IP from VM
```

## 🎯 Next Steps

1. **Fix VM network configuration** (Bridged Adapter recommended)
2. **Get the correct IP address** from the VM console
3. **Test SSH connection** from Windows
4. **Deploy HealthCare API stack** using the one-shot installer

Let me know which network option you choose, and I'll help you complete the setup!