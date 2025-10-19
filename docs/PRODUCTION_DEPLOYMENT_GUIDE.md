# HealthCare API Production Deployment Guide

## Overview
This guide walks through deploying the HealthCare Management API to a production Ubuntu server with Docker, Traefik reverse proxy, and automatic HTTPS via Let's Encrypt.

## 🎯 Deployment Architecture

```
Internet → Router (Port Forward 80/443) → Ubuntu Server (192.168.1.50) → Traefik → HealthCare API
```

---

## 📋 Prerequisites

- [ ] Domain name (e.g., `healthcare.yourdomain.com`) or DuckDNS account
- [ ] Router with port forwarding capabilities
- [ ] Ubuntu Server 22.04 LTS installation media

---

## 🚀 Milestone 1: Base OS & Network Setup

### 1.1 Install Ubuntu Server 22.04 LTS

1. **Download Ubuntu Server 22.04 LTS**
   ```bash
   # Download from: https://ubuntu.com/download/server
   # Verify checksum for security
   ```

2. **Installation Configuration**
   - Choose "Ubuntu Server" (minimal installation)
   - Configure user account with strong password
   - Enable OpenSSH server during installation
   - Install Docker during setup (optional, we'll do this manually)

### 1.2 Initial Server Configuration

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git ufw fail2ban htop net-tools

# Configure timezone
sudo timedatectl set-timezone America/New_York  # Adjust for your timezone

# Configure hostname
sudo hostnamectl set-hostname healthcare-server
```

### 1.3 Configure Static IP (192.168.1.50)

#### Option A: Router DHCP Reservation (Recommended)
1. Access your router's admin panel (usually `192.168.1.1`)
2. Find "DHCP Reservations" or "Static DHCP"
3. Reserve `192.168.1.50` for your server's MAC address

#### Option B: Static IP Configuration
```bash
# Edit netplan configuration
sudo nano /etc/netplan/00-installer-config.yaml

# Add static IP configuration:
network:
  version: 2
  ethernets:
    enp0s3:  # Replace with your interface name (use 'ip link' to find)
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

### 1.4 Configure Firewall

```bash
# Reset UFW to defaults
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change 22 to your custom port if changed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS only
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status verbose
```

### 1.5 Domain/DDNS Setup

#### Option A: Custom Domain
1. Point your domain's A record to your public IP
2. Set up port forwarding on your router: `80 → 192.168.1.50:80` and `443 → 192.168.1.50:443`

#### Option B: DuckDNS (Free)
```bash
# Sign up at https://www.duckdns.org/
# Choose subdomain: yourname.duckdns.org
# Install DuckDNS client
mkdir -p ~/duckdns
cd ~/duckdns

# Create update script
cat > duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=YOURNAME&token=YOURTOKEN&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

chmod +x duck.sh

# Test the script
./duck.sh

# Add to crontab for automatic updates
crontab -e
# Add line: */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

### 1.6 Router Port Forwarding
Configure your router to forward:
- External Port `80` → Internal `192.168.1.50:80`
- External Port `443` → Internal `192.168.1.50:443`

---

## 🐳 Milestone 2: Docker + Traefik + TLS Setup

### 2.1 Install Docker & Docker Compose

```bash
# Remove old Docker versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install Docker's official GPG key
sudo apt update
sudo apt install ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Log out and back in, then test
docker --version
docker compose version
```

### 2.2 Create Docker Network

```bash
# Create external network for Traefik
docker network create traefik-proxy
```

### 2.3 Create Traefik Configuration

```bash
# Create Traefik directory
mkdir -p ~/traefik
cd ~/traefik

# Create acme.json for Let's Encrypt certificates
touch acme.json
chmod 600 acme.json
```

### 2.4 Traefik Docker Compose Configuration

Create `~/traefik/docker-compose.yml`:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Traefik dashboard (remove in production)
    networks:
      - traefik-proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
      - ./acme.json:/acme.json
    environment:
      - TRAEFIK_CERTIFICATESRESOLVERS_LETSENCRYPT_ACME_EMAIL=your-email@domain.com
    labels:
      - "traefik.enable=true"
      # Dashboard configuration (optional, remove for production)
      - "traefik.http.routers.dashboard.rule=Host(`traefik.yourdomain.com`)"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.dashboard.service=api@internal"

networks:
  traefik-proxy:
    external: true
```

### 2.5 Traefik Configuration File

Create `~/traefik/traefik.yml`:

```yaml
# Traefik Configuration File
global:
  checkNewVersion: false
  sendAnonymousUsage: false

# Entry Points
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entrypoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

# Providers
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-proxy

# Certificate Resolvers
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@domain.com
      storage: /acme.json
      httpChallenge:
        entryPoint: web

# API and Dashboard
api:
  dashboard: true
  debug: false

# Logging
log:
  level: INFO

accessLog: {}

# Metrics (optional)
metrics:
  prometheus:
    addEntryPointsLabels: true
    addServicesLabels: true
```

### 2.6 Start Traefik

```bash
cd ~/traefik

# Start Traefik
docker compose up -d

# Check logs
docker compose logs -f traefik

# Verify Traefik is running
docker ps
curl -I http://localhost:8080  # Should return Traefik dashboard
```

---

## 🏥 Milestone 3: Deploy HealthCare API

### 3.1 Prepare Application Directory

```bash
# Create application directory
mkdir -p ~/healthcare-api
cd ~/healthcare-api

# Clone your repository (replace with your actual repo)
git clone https://github.com/yourusername/healthcare-api.git .

# Or upload your files via SCP/SFTP
```

### 3.2 Production Environment Configuration

Create `~/healthcare-api/.env.production`:

```bash
# Production Environment Variables
NODE_ENV=production
PORT=3001

# Database Configuration
MONGODB_URI=mongodb://admin:your_secure_password@mongodb:27017/healthcare?authSource=admin

# Security
JWT_SECRET=your_super_secure_jwt_secret_min_32_characters_long
SESSION_SECRET=your_super_secure_session_secret_min_32_characters
BCRYPT_ROUNDS=12

# Application
APP_NAME=HealthCare Management API
DOMAIN=healthcare.yourdomain.com

# Email Configuration (replace with real values)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=HealthCare Team

# Payment Processing (replace with real Stripe keys)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# SMS/Phone Verification
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password

# Rate Limiting
RATE_LIMIT_WINDOW_MINUTES=60
RATE_LIMIT_MAX_REQUESTS=1000

# Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME_HOURS=2
PASSWORD_RESET_EXPIRY_MINUTES=60
EMAIL_VERIFICATION_EXPIRY_MINUTES=1440
```

### 3.3 Production Docker Compose

Create `~/healthcare-api/docker-compose.production.yml`:

```yaml
version: '3.8'

services:
  # HealthCare API
  healthcare-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: healthcare-api
    restart: unless-stopped
    env_file:
      - .env.production
    networks:
      - traefik-proxy
      - healthcare-internal
    depends_on:
      - mongodb
      - redis
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.healthcare-api.rule=Host(`healthcare.yourdomain.com`)"
      - "traefik.http.routers.healthcare-api.entrypoints=websecure"
      - "traefik.http.routers.healthcare-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.healthcare-api.loadbalancer.server.port=3001"
      - "traefik.docker.network=traefik-proxy"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # MongoDB Database
  mongodb:
    image: mongo:7.0
    container_name: healthcare-mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: your_secure_password
      MONGO_INITDB_DATABASE: healthcare
    volumes:
      - mongodb_data:/data/db
      - ./mongodb-init:/docker-entrypoint-initdb.d
    networks:
      - healthcare-internal
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache
  redis:
    image: redis:7.2-alpine
    container_name: healthcare-redis
    restart: unless-stopped
    command: redis-server --requirepass your_secure_redis_password
    volumes:
      - redis_data:/data
    networks:
      - healthcare-internal
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "your_secure_redis_password", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backup Service (optional)
  backup:
    image: mongo:7.0
    container_name: healthcare-backup
    restart: "no"
    environment:
      MONGO_URI: mongodb://admin:your_secure_password@mongodb:27017/healthcare?authSource=admin
    volumes:
      - ./backups:/backups
      - ./scripts/backup.sh:/backup.sh
    networks:
      - healthcare-internal
    entrypoint: ["/backup.sh"]
    profiles:
      - backup

volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local

networks:
  traefik-proxy:
    external: true
  healthcare-internal:
    internal: true
```

### 3.4 Create Backup Script

Create `~/healthcare-api/scripts/backup.sh`:

```bash
#!/bin/bash
# MongoDB Backup Script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="healthcare"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="$MONGO_URI" --out="$BACKUP_DIR/mongodb_$DATE"

# Compress backup
tar -czf "$BACKUP_DIR/healthcare_backup_$DATE.tar.gz" -C "$BACKUP_DIR" "mongodb_$DATE"

# Remove uncompressed backup
rm -rf "$BACKUP_DIR/mongodb_$DATE"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "healthcare_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: healthcare_backup_$DATE.tar.gz"
```

```bash
chmod +x ~/healthcare-api/scripts/backup.sh
```

### 3.5 Deploy HealthCare API

```bash
cd ~/healthcare-api

# Pull latest changes
git pull origin main

# Build and start services
docker compose -f docker-compose.production.yml up -d

# Check logs
docker compose -f docker-compose.production.yml logs -f

# Verify services are running
docker ps
```

---

## 🔒 Security Hardening

### 4.1 SSL/TLS Configuration

Traefik automatically handles Let's Encrypt certificates. Verify HTTPS is working:

```bash
# Test HTTPS certificate
curl -I https://healthcare.yourdomain.com/health

# Check certificate details
openssl s_client -connect healthcare.yourdomain.com:443 -servername healthcare.yourdomain.com
```

### 4.2 Additional Security Measures

```bash
# Configure fail2ban for SSH protection
sudo nano /etc/fail2ban/jail.local

# Add:
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

sudo systemctl restart fail2ban

# Disable unnecessary services
sudo systemctl disable --now snapd
sudo systemctl disable --now bluetooth
sudo systemctl disable --now cups
```

### 4.3 Monitoring Setup

Create `~/healthcare-api/monitoring/docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    networks:
      - traefik-proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.prometheus.rule=Host(`metrics.yourdomain.com`)"
      - "traefik.http.routers.prometheus.entrypoints=websecure"
      - "traefik.http.routers.prometheus.tls.certresolver=letsencrypt"

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your_secure_grafana_password
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - traefik-proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.grafana.rule=Host(`dashboard.yourdomain.com`)"
      - "traefik.http.routers.grafana.entrypoints=websecure"
      - "traefik.http.routers.grafana.tls.certresolver=letsencrypt"

volumes:
  prometheus_data:
  grafana_data:

networks:
  traefik-proxy:
    external: true
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Ubuntu Server 22.04 LTS installed
- [ ] Static IP configured (192.168.1.50)
- [ ] Domain/DDNS configured
- [ ] Router port forwarding set up (80/443)
- [ ] Firewall configured (UFW)
- [ ] Docker and Docker Compose installed

### Traefik Setup
- [ ] Traefik configuration created
- [ ] acme.json file created with correct permissions
- [ ] External Docker network created
- [ ] Traefik container running
- [ ] Let's Encrypt certificates working

### HealthCare API Deployment
- [ ] Application code deployed
- [ ] Production environment variables configured
- [ ] Database passwords changed from defaults
- [ ] SSL certificates working
- [ ] Health checks passing
- [ ] API accessible via HTTPS

### Security
- [ ] All default passwords changed
- [ ] Fail2ban configured
- [ ] Unnecessary services disabled
- [ ] Firewall rules verified
- [ ] SSL/TLS configuration tested

### Monitoring (Optional)
- [ ] Prometheus and Grafana deployed
- [ ] Monitoring dashboards configured
- [ ] Backup system set up
- [ ] Log aggregation configured

---

## 🔧 Maintenance Commands

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker containers
cd ~/healthcare-api
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d

# View logs
docker compose -f docker-compose.production.yml logs -f healthcare-api

# Backup database
docker compose --profile backup -f docker-compose.production.yml run --rm backup

# Restart services
docker compose -f docker-compose.production.yml restart

# Check certificate expiration
curl -I https://healthcare.yourdomain.com/health
```

---

## 🆘 Troubleshooting

### Common Issues

1. **Let's Encrypt Certificate Issues**
   ```bash
   # Check Traefik logs
   docker logs traefik
   
   # Verify domain DNS
   nslookup healthcare.yourdomain.com
   
   # Test HTTP challenge
   curl -I http://healthcare.yourdomain.com/.well-known/acme-challenge/test
   ```

2. **Database Connection Issues**
   ```bash
   # Check MongoDB logs
   docker logs healthcare-mongodb
   
   # Test database connection
   docker exec -it healthcare-mongodb mongosh -u admin -p
   ```

3. **API Not Accessible**
   ```bash
   # Check API logs
   docker logs healthcare-api
   
   # Verify container health
   docker ps
   
   # Test internal connectivity
   docker exec -it healthcare-api curl localhost:3001/health
   ```

This deployment guide provides a complete production-ready setup for your HealthCare API with automatic HTTPS, monitoring, and security best practices!