# 🚀 Quick Fix: Oracle VM Ubuntu Server Connection

## 📋 Current Situation
- **Windows IP**: 192.168.40.146 (Wi-Fi network)
- **VM IP**: 192.168.1.50 (NOT REACHABLE - incorrect network)
- **Expected VM IP**: 192.168.40.xxx (same network as Windows)

## ⚡ 5-Minute Fix

### Step 1: Open VirtualBox Manager
1. Open **Oracle VM VirtualBox** on your desktop
2. You should see your Ubuntu Server VM in the list

### Step 2: Shutdown VM (If Running)
1. If the VM shows **"Running"**, right-click → **"Close"** → **"ACPI Shutdown"**
2. Wait for it to show **"Powered Off"**

### Step 3: Change Network Settings
1. Select your Ubuntu VM
2. Click **"Settings"** (gear icon)
3. Click **"Network"** in the left panel
4. Under **"Adapter 1"** tab:
   - Change **"Attached to:"** from **"NAT"** to **"Bridged Adapter"**
   - In **"Name:"** dropdown, select your Wi-Fi adapter
   - Set **"Promiscuous Mode:"** to **"Allow All"**
   - Check **"Cable Connected"**
5. Click **"OK"**

### Step 4: Start VM and Get New IP
1. Click **"Start"** (green arrow)
2. When Ubuntu boots, log in via the console window
3. Run this command to get the new IP:
```bash
ip addr show | grep "192.168.40"
```
4. Note the IP address (should be like 192.168.40.150)

### Step 5: Test Connection from Windows
Open PowerShell and run:
```powershell
# Replace XXX with the IP from Step 4
ping 192.168.40.XXX

# Test SSH port
Test-NetConnection -ComputerName 192.168.40.XXX -Port 22
```

## 🎯 If SSH Service Not Running
If the connection test fails, log into VM console and run:
```bash
# Start SSH service
sudo systemctl start ssh
sudo systemctl enable ssh

# Allow SSH through firewall
sudo ufw allow ssh

# Check SSH is listening
sudo netstat -tlnp | grep :22
```

## 🚀 Ready for Deployment!
Once SSH works, we can deploy the HealthCare API stack:

1. **Copy files**: Use SCP to transfer deployment files
2. **Run installer**: Execute `install_healthcare_stack.sh`
3. **Configure domain**: Set up DNS and SSL certificates

---

## 📞 Need Help?
If you get stuck at any step, let me know:
- What you see in VirtualBox Manager
- Any error messages
- The IP address you get from the VM

Let's get your production server up and running! 🚀