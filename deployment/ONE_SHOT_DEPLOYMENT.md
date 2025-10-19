# HealthCare API - One-Shot Production Stack

## 🚀 Quick Start

This one-shot installer creates a complete production stack with:
- **Traefik** (HTTPS reverse proxy with Let's Encrypt)
- **HealthCare API** (your Node.js application)
- **Custom Monitor Dashboard** (real-time system monitoring at `mon.yourdomain.com`)
- **Netdata** (comprehensive system metrics - private access only)

## 📋 Prerequisites

1. **Ubuntu Server 22.04 LTS** with static IP (192.168.1.50)
2. **Domain or DDNS** (e.g., `healthcare.yourdomain.com`)
3. **Router port forwarding**: Only 80/443 → 192.168.1.50
4. **MongoDB Atlas** account (or modify to use local MongoDB)

## 🛠️ Installation

### 1. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Verify Docker installation
docker --version
docker compose version
```

### 2. Run the Installer

```bash
# Download and run the installer
curl -O https://raw.githubusercontent.com/yourusername/healthcare-api/main/deployment/install_healthcare_stack.sh
chmod +x install_healthcare_stack.sh

# Run with your domain and email
./install_healthcare_stack.sh yourdomain.com you@example.com
```

**Or create the installer locally:**

```bash
# Copy the installer script to your server
# Edit the script with your domain/email
./install_healthcare_stack.sh healthcare.mydomain.com admin@mydomain.com
```

### 3. Configure Environment

```bash
# Edit the API environment file
nano ~/healthcare-stack/api/.env

# Key changes needed:
# - MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/healthcare
# - JWT_SECRET=your_secure_jwt_secret_32_chars_minimum
# - SENDGRID_API_KEY=your_sendgrid_key
# - STRIPE_SECRET_KEY=your_stripe_key
# - TWILIO_ACCOUNT_SID=your_twilio_sid
```

### 4. Set Up DNS

Configure DNS A records pointing to your public IP:
```
api.yourdomain.com    → YOUR_PUBLIC_IP
mon.yourdomain.com    → YOUR_PUBLIC_IP
traefik.yourdomain.com → YOUR_PUBLIC_IP (optional)
```

### 5. Configure Router

**Port forward ONLY these ports to 192.168.1.50:**
- `TCP 80` → Let's Encrypt HTTP challenge + HTTP→HTTPS redirect
- `TCP 443` → All HTTPS traffic (Traefik terminates SSL)

**Keep these ports PRIVATE** (access via VPN/tunnel):
- `19999` → Netdata dashboard
- `8080` → Traefik dashboard (if enabled)

### 6. Start the Stack

```bash
cd ~/healthcare-stack
./start.sh
```

## 🌐 Service URLs

After deployment:

| Service | URL | Purpose |
|---------|-----|---------|
| **HealthCare API** | `https://api.yourdomain.com` | Main API endpoints |
| **API Health Check** | `https://api.yourdomain.com/health` | Service health status |
| **API Documentation** | `https://api.yourdomain.com/api-docs` | Swagger/OpenAPI docs |
| **Monitor Dashboard** | `https://mon.yourdomain.com` | Custom monitoring UI |
| **Traefik Dashboard** | `https://traefik.yourdomain.com` | Reverse proxy admin |
| **Netdata** | `http://192.168.1.50:19999` | System metrics (private) |

## 🔧 Management Commands

```bash
cd ~/healthcare-stack

# Start all services
./start.sh

# Stop all services
./stop.sh

# View logs
./logs.sh                    # Show all available services
./logs.sh api               # HealthCare API logs
./logs.sh traefik           # Traefik logs
./logs.sh monitor           # Monitor dashboard logs

# Check status
./status.sh                 # Health check all services
docker ps                   # Container status

# Scale API (multiple instances)
cd api && docker compose up -d --scale healthcare-api=4
```

## 📊 Monitoring Features

### Custom Monitor Dashboard (`mon.yourdomain.com`)
- **API Health**: Real-time HealthCare API status and response times
- **System Metrics**: CPU, memory, load average, uptime
- **Container Status**: All Docker containers with states and ports
- **Auto-refresh**: Updates every 5 seconds

### Netdata (`http://192.168.1.50:19999`)
- **System Performance**: CPU per core, memory usage, disk I/O
- **Network Monitoring**: Interface statistics, TCP connections
- **Container Metrics**: Docker container resource usage
- **Alerting**: Built-in anomaly detection

## 🔒 Security Configuration

### Automatic HTTPS
- **Let's Encrypt**: Automatic SSL certificate generation and renewal
- **HSTS**: HTTP Strict Transport Security headers
- **Security Headers**: XSS protection, frame denial, content type sniffing protection

### Rate Limiting
- **API Protection**: 100 requests/minute with 200 burst capacity
- **Traefik Level**: Additional rate limiting at reverse proxy

### Network Security
- **Internal Network**: Containers communicate via private Docker network
- **Minimal Exposure**: Only ports 80/443 exposed publicly
- **Private Services**: Netdata and other admin tools accessible only via LAN

## 🔄 Backup & Maintenance

### Database Backup (if using local MongoDB)
```bash
# Manual backup
docker exec mongodb mongodump --out /backup

# Automated backup (add to crontab)
# 0 2 * * * cd ~/healthcare-stack && docker compose exec -T mongodb mongodump --out /backup/$(date +\%Y\%m\%d)
```

### Updates
```bash
# Update containers
cd ~/healthcare-stack
docker compose pull
./stop.sh && ./start.sh

# Update system
sudo apt update && sudo apt upgrade -y
```

### Log Rotation
```bash
# Configure log rotation for Docker
sudo nano /etc/docker/daemon.json

{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

sudo systemctl restart docker
```

## 🚨 Troubleshooting

### SSL Certificate Issues
```bash
# Check certificate status
curl -I https://api.yourdomain.com

# View Traefik logs
./logs.sh traefik

# Verify DNS resolution
nslookup api.yourdomain.com

# Test HTTP challenge (port 80 must be forwarded)
curl -I http://yourdomain.com/.well-known/acme-challenge/test
```

### API Connection Issues
```bash
# Check API health
curl https://api.yourdomain.com/health

# Internal health check
docker exec healthcare-api curl http://localhost:3001/health

# Check MongoDB connection (if using Atlas)
# Verify connection string in ~/healthcare-stack/api/.env
```

### Container Issues
```bash
# Container status
docker ps -a

# Restart specific service
docker restart healthcare-api

# Rebuild containers
cd ~/healthcare-stack/api
docker compose build --no-cache
docker compose up -d
```

### Monitor Dashboard Issues
```bash
# Check monitor backend
curl https://mon.yourdomain.com/api/health

# Internal backend check
docker exec healthcare-monitor-backend curl http://localhost:8088/api/health

# Check Docker socket permissions
ls -la /var/run/docker.sock
```

## 🎯 Performance Optimization

### API Scaling
```bash
# Scale to 4 API instances
cd ~/healthcare-stack/api
docker compose up -d --scale healthcare-api=4

# View load balancing
curl -H "Host: api.yourdomain.com" http://localhost/health
```

### Resource Limits
Add to your `docker-compose.yml`:
```yaml
services:
  healthcare-api:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Caching
- **Redis**: Add Redis container for session storage and caching
- **CDN**: Use Cloudflare for static asset caching
- **Database**: Enable MongoDB Atlas performance insights

## 📈 Scaling Considerations

### Single Server Scaling
- **Vertical**: Increase CPU/RAM on existing server
- **Container Scaling**: Run multiple API instances (`docker compose up -d --scale healthcare-api=8`)
- **Load Balancing**: Traefik automatically load balances multiple containers

### Multi-Server Scaling (Future)
- **Docker Swarm**: Orchestrate across multiple servers
- **External Database**: MongoDB Atlas handles database scaling
- **Shared Storage**: NFS or cloud storage for uploads/logs

## 📋 Production Checklist

### Before Going Live
- [ ] Domain DNS configured (A records)
- [ ] Router port forwarding (80/443 only)
- [ ] MongoDB Atlas URI configured
- [ ] Strong JWT/session secrets generated
- [ ] API keys configured (Stripe, Twilio, SendGrid)
- [ ] SSL certificates working (check https://api.yourdomain.com)
- [ ] Health checks passing
- [ ] Monitor dashboard accessible
- [ ] Log rotation configured
- [ ] Backup strategy implemented

### Security Review
- [ ] Default passwords changed
- [ ] API rate limiting enabled
- [ ] Security headers configured
- [ ] Private services not exposed publicly
- [ ] VPN/tunnel configured for private access
- [ ] Log monitoring enabled
- [ ] Update schedule planned

This setup provides a robust, scalable foundation for your HealthCare API with comprehensive monitoring and security best practices! 🏥✨